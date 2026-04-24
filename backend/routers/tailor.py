"""
Tailor router

POST   /tailor                — run the full 3-call AI pipeline
GET    /tailor/versions       — list all tailored resumes for current user
GET    /tailor/{id}           — get a specific tailored resume
PATCH  /tailor/{id}/approve   — approve a resume (enforced: flagged_claims reviewed)
DELETE /tailor/{id}           — soft delete (status → archived)
"""

import logging
from datetime import datetime

import bleach
from fastapi import APIRouter, Depends, HTTPException, status

from middleware.auth_middleware import get_current_user
from models.profile import ApproveRequest, TailorRequest
from services.ai_service import (
    analyze_jd,
    enforce_source_map_coverage,
    fact_check_and_gap,
    tailor_resume,
)
from services.mongo_service import (
    create_tailored_resume,
    get_profile,
    get_tailored_resume,
    list_tailored_resumes,
    update_tailored_resume_status,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("")
async def run_tailor_pipeline(
    body: TailorRequest,
    user_id: str = Depends(get_current_user),
):
    """
    Three-step AI pipeline:
      1. Analyze the JD
      2. Tailor the resume
      3. Fact-check and generate gap report

    Returns the saved TailoredResume document with status='draft'.
    """
    # Fetch and validate the user's profile
    profile = await get_profile(user_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile not found. Please complete your profile before tailoring.",
        )

    # Sanitize user inputs
    jd_text = bleach.clean(body.jd_text, tags=[], strip=True)
    job_title = bleach.clean(body.job_title, tags=[], strip=True)
    company = bleach.clean(body.company, tags=[], strip=True)

    if not jd_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job description cannot be empty.",
        )

    # Remove MongoDB internals from profile before passing to AI
    profile_clean = {
        k: v for k, v in profile.items()
        if k not in ("_id", "user_id", "updated_at")
    }

    # ------------------------------------------------------------------
    # Step 1: JD Analysis
    # ------------------------------------------------------------------
    logger.info("Step 1/3: Analyzing JD for user %s", user_id)
    jd_analysis = await analyze_jd(jd_text)

    # ------------------------------------------------------------------
    # Step 2: Tailor the resume
    # ------------------------------------------------------------------
    logger.info("Step 2/3: Tailoring resume for user %s", user_id)
    tailored = await tailor_resume(profile_clean, jd_analysis)
    source_map = tailored.pop("source_map", [])

    # ------------------------------------------------------------------
    # Safeguard: verify every output bullet has a source_map entry
    # ------------------------------------------------------------------
    uncovered = enforce_source_map_coverage(tailored, source_map)

    # ------------------------------------------------------------------
    # Step 3: Fact-check and gap report
    # ------------------------------------------------------------------
    logger.info("Step 3/3: Fact-checking for user %s", user_id)
    fact_result = await fact_check_and_gap(profile_clean, tailored, jd_analysis)

    flagged_claims: list = fact_result.get("flagged_claims", [])
    # Add any uncovered bullets detected by our safeguard
    for item in uncovered:
        if item not in flagged_claims:
            flagged_claims.append(item)

    gap_report = fact_result.get("gap_report", [])
    match_score = fact_result.get("match_score", 0)

    # ------------------------------------------------------------------
    # Persist
    # ------------------------------------------------------------------
    resume_doc = {
        "user_id": user_id,
        "job_title": job_title,
        "company": company,
        "jd_text": jd_text,
        "jd_analysis": jd_analysis,
        "tailored_profile": tailored,
        "source_map": source_map,
        "flagged_claims": flagged_claims,
        "gap_report": gap_report,
        "match_score": match_score,
        "status": "draft",
        "created_at": datetime.utcnow(),
        "approved_at": None,
    }

    saved = await create_tailored_resume(resume_doc)
    logger.info("Tailored resume saved with id=%s for user %s", saved.get("_id"), user_id)
    return saved


@router.get("/versions")
async def get_versions(user_id: str = Depends(get_current_user)):
    return await list_tailored_resumes(user_id)


@router.get("/{resume_id}")
async def get_resume(resume_id: str, user_id: str = Depends(get_current_user)):
    resume = await get_tailored_resume(resume_id, user_id)
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    return resume


@router.patch("/{resume_id}/approve")
async def approve_resume(
    resume_id: str,
    body: ApproveRequest,
    user_id: str = Depends(get_current_user),
):
    """
    Approve a tailored resume.

    Rejects approval if:
    - Resume doesn't exist or doesn't belong to this user
    - Resume is already archived/exported
    - flagged_claims_reviewed is False (caller must explicitly confirm review)
    """
    resume = await get_tailored_resume(resume_id, user_id)
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")

    if resume["status"] in ("archived",):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot approve an archived resume.",
        )

    if not body.flagged_claims_reviewed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "You must review all flagged claims before approving. "
                "Set flagged_claims_reviewed=true to confirm."
            ),
        )

    updated = await update_tailored_resume_status(
        resume_id,
        user_id,
        "approved",
        extra={"approved_at": datetime.utcnow()},
    )
    return updated


@router.delete("/{resume_id}")
async def delete_resume(resume_id: str, user_id: str = Depends(get_current_user)):
    """Soft delete — sets status to 'archived'."""
    resume = await get_tailored_resume(resume_id, user_id)
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")

    updated = await update_tailored_resume_status(resume_id, user_id, "archived")
    return updated
