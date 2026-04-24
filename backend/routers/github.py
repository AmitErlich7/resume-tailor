"""
GitHub router

POST /github/import   — analyze a repo, return project card (NOT saved yet)
POST /github/confirm  — save the confirmed project card to the user's profile
"""

import logging
import uuid

import bleach
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, validator

from middleware.auth_middleware import get_current_user
from models.project import GitHubProjectRaw, Project
from services.ai_service import analyze_github_repo
from services.github_service import build_repo_context, fetch_repo_data
from services.mongo_service import add_project_to_profile

logger = logging.getLogger(__name__)
router = APIRouter()

_VALID_SCALES = {"personal", "team", "production"}
_VALID_ROLES = {"solo_builder", "contributor", "maintainer", "team_lead"}


class ImportRequest(BaseModel):
    repo_url: str


class ConfirmRequest(BaseModel):
    project: dict  # The project card as returned by /github/import


@router.post("/import")
async def import_github_repo(
    body: ImportRequest,
    user_id: str = Depends(get_current_user),
):
    """
    Analyze a GitHub repository and return a project card for review.
    The card is NOT persisted — the user must call /github/confirm.
    """
    repo_url = bleach.clean(body.repo_url, tags=[], strip=True).strip()

    # Fetch raw repo data (may raise 404 / 429 / 400)
    repo_data = await fetch_repo_data(repo_url)
    context = build_repo_context(repo_data)

    if not context.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Repository appears empty — no README, dependency file, or description found.",
        )

    # Ask Claude to extract project metadata
    raw_result, validation_error = await analyze_github_repo(context, repo_url)

    if validation_error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": "AI output failed validation",
                "raw_output": raw_result,
                "validation_error": validation_error,
            },
        )

    # raw_result at this point is a validated GitHubProjectRaw dict
    return {
        "project_card": raw_result,
        "repo_url": repo_url,
    }


@router.post("/confirm", status_code=status.HTTP_201_CREATED)
async def confirm_github_project(
    body: ConfirmRequest,
    user_id: str = Depends(get_current_user),
):
    """
    Save a reviewed project card into the user's profile.
    """
    card = body.project

    # Validate the final card as a full Project
    card.setdefault("id", str(uuid.uuid4()))
    card.setdefault("source", "github")
    card.setdefault("repo_url", card.get("repo_url", ""))
    card.setdefault("tech_stack", [])
    card.setdefault("key_features", [])

    # Coerce scale and your_role to valid values
    scale = card.get("scale", "personal")
    if scale not in _VALID_SCALES:
        card["scale"] = "personal"

    your_role = card.get("your_role", "solo_builder")
    if your_role not in _VALID_ROLES:
        card["your_role"] = "solo_builder"

    try:
        project = Project(**card)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid project data: {exc}",
        )

    project_dict = project.model_dump()
    profile = await add_project_to_profile(user_id, project_dict)
    return {"profile": profile, "project": project_dict}
