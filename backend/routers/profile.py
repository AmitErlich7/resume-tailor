"""
Profile router

GET    /profile                  — fetch current user's profile
POST   /profile                  — create profile (upsert)
PATCH  /profile/{section}        — update one section
"""

import logging
import uuid
from datetime import datetime
from typing import Any

import bleach
from fastapi import APIRouter, Depends, HTTPException, status

from middleware.auth_middleware import get_current_user
from models.profile import (
    ContactPatch,
    EducationPatch,
    ExperiencesPatch,
    ProfileCreate,
    ProjectsPatch,
    SkillsPatch,
    SummaryPatch,
)
from services.mongo_service import (
    get_profile,
    patch_profile_section,
    upsert_profile,
)

logger = logging.getLogger(__name__)
router = APIRouter()

_ALLOWED_SECTIONS = {"contact", "summary", "skills", "experiences", "education", "projects"}


def _sanitize_str(value: str) -> str:
    """Strip all HTML tags from a string."""
    return bleach.clean(value, tags=[], strip=True)


def _sanitize_dict(data: Any) -> Any:
    """Recursively sanitize all string values in a dict/list."""
    if isinstance(data, str):
        return _sanitize_str(data)
    if isinstance(data, list):
        return [_sanitize_dict(item) for item in data]
    if isinstance(data, dict):
        return {k: _sanitize_dict(v) for k, v in data.items()}
    return data


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("")
async def get_user_profile(user_id: str = Depends(get_current_user)):
    profile = await get_profile(user_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return profile


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_or_replace_profile(
    body: ProfileCreate,
    user_id: str = Depends(get_current_user),
):
    data = body.model_dump(exclude_none=True)

    # Assign UUIDs to new items that lack one
    for exp in data.get("experiences", []):
        if not exp.get("id"):
            exp["id"] = str(uuid.uuid4())
    for edu in data.get("education", []):
        if not edu.get("id"):
            edu["id"] = str(uuid.uuid4())
    for proj in data.get("projects", []):
        if not proj.get("id"):
            proj["id"] = str(uuid.uuid4())

    data = _sanitize_dict(data)
    data["updated_at"] = datetime.utcnow()
    profile = await upsert_profile(user_id, data)
    return profile


@router.patch("/{section}")
async def patch_section(
    section: str,
    body: dict,
    user_id: str = Depends(get_current_user),
):
    if section not in _ALLOWED_SECTIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown section '{section}'. Allowed: {sorted(_ALLOWED_SECTIONS)}",
        )

    # Validate and coerce the payload through the matching Pydantic model
    section_models = {
        "contact": ContactPatch,
        "summary": SummaryPatch,
        "skills": SkillsPatch,
        "experiences": ExperiencesPatch,
        "education": EducationPatch,
        "projects": ProjectsPatch,
    }

    model_cls = section_models[section]
    try:
        validated = model_cls(**{section: body.get(section, body)})
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    section_data = getattr(validated, section)

    # Pydantic models → plain dicts/lists before storing
    if hasattr(section_data, "model_dump"):
        section_data = section_data.model_dump()
    elif isinstance(section_data, list):
        items = []
        for item in section_data:
            if hasattr(item, "model_dump"):
                d = item.model_dump()
                # Ensure UUIDs exist
                if "id" in d and not d["id"]:
                    d["id"] = str(uuid.uuid4())
                items.append(d)
            else:
                items.append(item)
        section_data = items

    section_data = _sanitize_dict(section_data)
    profile = await patch_profile_section(user_id, section, section_data)
    return profile
