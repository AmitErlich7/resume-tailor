"""
Export router

POST /export/{id}/docx  — generate and return an ATS-compliant DOCX
POST /export/{id}/pdf   — generate and return a PDF

Both endpoints:
1. Re-verify ownership of the TailoredResume
2. Reject if status != "approved"
3. Enrich the resume with the user's contact and education (not tailored, taken from profile)
4. Generate and stream the file
5. Update resume status to "exported"
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response

from middleware.auth_middleware import get_current_user
from services.export_service import generate_docx, generate_pdf
from services.mongo_service import (
    get_profile,
    get_tailored_resume,
    update_tailored_resume_status,
)

logger = logging.getLogger(__name__)
router = APIRouter()


async def _load_approved_resume(resume_id: str, user_id: str) -> dict:
    """
    Shared guard: fetch the resume, verify ownership, verify approved status.
    Enriches the resume dict with contact info and education from the user's profile.
    """
    resume = await get_tailored_resume(resume_id, user_id)
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")

    # Ownership is already enforced by get_tailored_resume (filters by user_id)

    if resume.get("status") not in ("approved", "exported"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Resume must be approved before exporting. "
                f"Current status: {resume.get('status')}"
            ),
        )

    # Enrich with contact + education from profile (not tailored sections)
    profile = await get_profile(user_id)
    if profile:
        resume["contact"] = profile.get("contact", {})
        resume["education"] = profile.get("education", [])

    return resume


@router.post("/{resume_id}/docx")
async def export_docx(resume_id: str, user_id: str = Depends(get_current_user)):
    resume = await _load_approved_resume(resume_id, user_id)

    try:
        file_bytes = generate_docx(resume)
    except Exception as exc:
        logger.exception("DOCX generation failed for resume %s", resume_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate DOCX file",
        )

    company = resume.get("company", "resume").replace(" ", "_").lower()
    role = resume.get("job_title", "role").replace(" ", "_").lower()
    filename = f"{role}_{company}_resume.docx"

    await update_tailored_resume_status(resume_id, user_id, "exported")

    return Response(
        content=file_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/{resume_id}/pdf")
async def export_pdf(resume_id: str, user_id: str = Depends(get_current_user)):
    resume = await _load_approved_resume(resume_id, user_id)

    try:
        file_bytes = generate_pdf(resume)
    except Exception as exc:
        logger.exception("PDF generation failed for resume %s", resume_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate PDF file",
        )

    company = resume.get("company", "resume").replace(" ", "_").lower()
    role = resume.get("job_title", "role").replace(" ", "_").lower()
    filename = f"{role}_{company}_resume.pdf"

    await update_tailored_resume_status(resume_id, user_id, "exported")

    return Response(
        content=file_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
