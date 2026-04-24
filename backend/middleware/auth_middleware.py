"""
Clerk JWT verification middleware.

Every protected route calls get_current_user() as a FastAPI dependency.
The dependency extracts the Bearer token from the Authorization header,
verifies it against Clerk's JWKS endpoint, and returns the verified clerk_user_id.

We cache the JWKS keys in memory and refresh them only on verification failure,
which avoids an outbound HTTP call on every request in the steady state.
"""

import logging
import os
from typing import Optional

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwk, jwt
from jose.utils import base64url_decode

logger = logging.getLogger(__name__)

_bearer_scheme = HTTPBearer(auto_error=True)

# In-process JWKS cache: maps kid → public key
_jwks_cache: dict = {}


async def _fetch_jwks() -> dict:
    """Download the Clerk JWKS and return a kid→key mapping."""
    issuer = os.getenv("CLERK_JWT_ISSUER", "")
    if not issuer:
        raise RuntimeError("CLERK_JWT_ISSUER is not set")

    jwks_url = issuer.rstrip("/") + "/.well-known/jwks.json"
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(jwks_url)
        response.raise_for_status()
    data = response.json()
    return {key_data["kid"]: key_data for key_data in data.get("keys", [])}


async def _get_jwks(force_refresh: bool = False) -> dict:
    global _jwks_cache
    if not _jwks_cache or force_refresh:
        _jwks_cache = await _fetch_jwks()
    return _jwks_cache


def _extract_kid(token: str) -> Optional[str]:
    """Decode the JWT header (no verification) to get the kid."""
    try:
        header = jwt.get_unverified_header(token)
        return header.get("kid")
    except Exception:
        return None


async def verify_clerk_token(token: str) -> dict:
    """
    Verify a Clerk-issued JWT and return the decoded payload.
    Raises HTTPException 401 on any failure.
    """
    kid = _extract_kid(token)
    if not kid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing kid",
        )

    jwks = await _get_jwks()
    if kid not in jwks:
        # One retry after refreshing the cache (key rotation)
        jwks = await _get_jwks(force_refresh=True)
    if kid not in jwks:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: unknown key id",
        )

    key_data = jwks[kid]
    issuer = os.getenv("CLERK_JWT_ISSUER", "").rstrip("/")

    try:
        payload = jwt.decode(
            token,
            key_data,
            algorithms=["RS256"],
            issuer=issuer,
            options={"verify_aud": False},
        )
    except JWTError as exc:
        logger.warning("JWT verification failed: %s", str(exc))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    return payload


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> str:
    """
    FastAPI dependency.  Returns the clerk_user_id (the 'sub' claim) of the
    authenticated user.  Raises 401 if the token is missing or invalid.
    """
    token = credentials.credentials
    payload = await verify_clerk_token(token)
    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject claim",
        )
    return user_id
