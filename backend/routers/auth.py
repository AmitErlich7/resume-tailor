"""
Auth router — POST /auth/sync

Called by the frontend immediately after Clerk login.
Syncs the Clerk user into MongoDB:
  - First login  → creates user document
  - Re-login     → updates last_login only
  - Same email, different provider → links providers under one document
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status

from middleware.auth_middleware import get_current_user
from models.user import UserCreate, UserResponse
from services.mongo_service import (
    add_provider_to_user,
    create_user,
    get_user_by_clerk_id,
    get_user_by_email,
    update_user_last_login,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/sync", response_model=UserResponse)
async def sync_user(
    user_data: UserCreate,
    clerk_user_id: str = Depends(get_current_user),
):
    """
    Sync the authenticated Clerk user into MongoDB.

    The clerk_user_id from the verified JWT is used as the authoritative
    identifier — we never trust the value supplied in the request body.
    """
    # Trust the JWT, not the body, for the user id
    if user_data.clerk_user_id != clerk_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token user id does not match request body",
        )

    # 1. Look up by clerk_user_id
    existing = await get_user_by_clerk_id(clerk_user_id)
    if existing:
        # Already registered — just refresh last_login
        await update_user_last_login(clerk_user_id)
        # If the user is logging in with a new provider, add it
        if user_data.provider not in existing.get("provider", []):
            await add_provider_to_user(clerk_user_id, user_data.provider)
        doc = await get_user_by_clerk_id(clerk_user_id)
        return UserResponse(**doc)

    # 2. Look up by email (same email, different provider — link accounts)
    existing_by_email = await get_user_by_email(user_data.email)
    if existing_by_email:
        # Link: add this Clerk id and provider to the existing document
        # (Edge case: user signed in with Google first, now with LinkedIn)
        await add_provider_to_user(existing_by_email["clerk_user_id"], user_data.provider)
        await update_user_last_login(existing_by_email["clerk_user_id"])
        doc = await get_user_by_clerk_id(existing_by_email["clerk_user_id"])
        return UserResponse(**doc)

    # 3. Brand-new user
    now = datetime.utcnow()
    new_user = {
        "clerk_user_id": clerk_user_id,
        "email": user_data.email,
        "name": user_data.name,
        "avatar": user_data.avatar,
        "provider": [user_data.provider],
        "created_at": now,
        "last_login": now,
    }
    doc = await create_user(new_user)
    logger.info("New user created: %s", clerk_user_id)
    return UserResponse(**doc)
