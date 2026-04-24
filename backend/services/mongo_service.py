"""
MongoDB connection and CRUD helpers.

All queries filter by user_id to prevent cross-user data leakage.
"""

import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING

logger = logging.getLogger(__name__)

_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None


# ---------------------------------------------------------------------------
# Connection lifecycle
# ---------------------------------------------------------------------------

async def connect_mongo() -> None:
    global _client, _db
    uri = os.getenv("MONGODB_URI")
    if not uri:
        raise RuntimeError("MONGODB_URI environment variable is not set")
    _client = AsyncIOMotorClient(uri)
    _db = _client["resume_tailor"]
    await _ensure_indexes()
    logger.info("Connected to MongoDB")


async def close_mongo() -> None:
    global _client
    if _client:
        _client.close()
        logger.info("MongoDB connection closed")


def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("MongoDB not connected. Call connect_mongo() first.")
    return _db


async def _ensure_indexes() -> None:
    db = get_db()
    # Users
    await db.users.create_index("clerk_user_id", unique=True)
    await db.users.create_index("email", unique=True)
    # Profiles
    await db.profiles.create_index("user_id", unique=True)
    # Tailored resumes
    await db.tailored_resumes.create_index([("user_id", ASCENDING), ("created_at", ASCENDING)])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _serialize(doc: Dict) -> Dict:
    """Convert ObjectId → str so documents are JSON-serializable."""
    if doc is None:
        return doc
    result = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            result[k] = str(v)
        elif isinstance(v, dict):
            result[k] = _serialize(v)
        elif isinstance(v, list):
            result[k] = [_serialize(i) if isinstance(i, dict) else (str(i) if isinstance(i, ObjectId) else i) for i in v]
        else:
            result[k] = v
    return result


# ---------------------------------------------------------------------------
# User CRUD
# ---------------------------------------------------------------------------

async def get_user_by_clerk_id(clerk_user_id: str) -> Optional[Dict]:
    db = get_db()
    doc = await db.users.find_one({"clerk_user_id": clerk_user_id})
    return _serialize(doc) if doc else None


async def get_user_by_email(email: str) -> Optional[Dict]:
    db = get_db()
    doc = await db.users.find_one({"email": email})
    return _serialize(doc) if doc else None


async def create_user(user_data: Dict) -> Dict:
    db = get_db()
    result = await db.users.insert_one(user_data)
    doc = await db.users.find_one({"_id": result.inserted_id})
    return _serialize(doc)


async def update_user_last_login(clerk_user_id: str) -> None:
    db = get_db()
    await db.users.update_one(
        {"clerk_user_id": clerk_user_id},
        {"$set": {"last_login": datetime.utcnow()}},
    )


async def add_provider_to_user(clerk_user_id: str, provider: str) -> None:
    """Add a new OAuth provider to an existing user without duplication."""
    db = get_db()
    await db.users.update_one(
        {"clerk_user_id": clerk_user_id},
        {"$addToSet": {"provider": provider}, "$set": {"last_login": datetime.utcnow()}},
    )


# ---------------------------------------------------------------------------
# Profile CRUD
# ---------------------------------------------------------------------------

async def get_profile(user_id: str) -> Optional[Dict]:
    db = get_db()
    doc = await db.profiles.find_one({"user_id": user_id})
    return _serialize(doc) if doc else None


async def upsert_profile(user_id: str, profile_data: Dict) -> Dict:
    """Create or fully replace a profile document."""
    db = get_db()
    profile_data["user_id"] = user_id
    profile_data["updated_at"] = datetime.utcnow()
    await db.profiles.update_one(
        {"user_id": user_id},
        {"$set": profile_data},
        upsert=True,
    )
    doc = await db.profiles.find_one({"user_id": user_id})
    return _serialize(doc)


async def patch_profile_section(user_id: str, section: str, data: Any) -> Dict:
    """Update a single top-level section of a profile (e.g. 'skills', 'contact')."""
    db = get_db()
    await db.profiles.update_one(
        {"user_id": user_id},
        {"$set": {section: data, "updated_at": datetime.utcnow()}},
        upsert=True,
    )
    doc = await db.profiles.find_one({"user_id": user_id})
    return _serialize(doc)


async def add_project_to_profile(user_id: str, project: Dict) -> Dict:
    """Append a single project to the projects array."""
    db = get_db()
    await db.profiles.update_one(
        {"user_id": user_id},
        {
            "$push": {"projects": project},
            "$set": {"updated_at": datetime.utcnow()},
        },
        upsert=True,
    )
    doc = await db.profiles.find_one({"user_id": user_id})
    return _serialize(doc)


# ---------------------------------------------------------------------------
# Tailored resume CRUD
# ---------------------------------------------------------------------------

async def create_tailored_resume(resume_data: Dict) -> Dict:
    db = get_db()
    result = await db.tailored_resumes.insert_one(resume_data)
    doc = await db.tailored_resumes.find_one({"_id": result.inserted_id})
    return _serialize(doc)


async def get_tailored_resume(resume_id: str, user_id: str) -> Optional[Dict]:
    """Fetch a resume only if it belongs to the given user."""
    db = get_db()
    try:
        oid = ObjectId(resume_id)
    except Exception:
        return None
    doc = await db.tailored_resumes.find_one({"_id": oid, "user_id": user_id})
    return _serialize(doc) if doc else None


async def list_tailored_resumes(user_id: str) -> List[Dict]:
    db = get_db()
    cursor = db.tailored_resumes.find(
        {"user_id": user_id, "status": {"$ne": "archived"}},
        sort=[("created_at", -1)],
    )
    docs = await cursor.to_list(length=200)
    return [_serialize(d) for d in docs]


async def update_tailored_resume_status(
    resume_id: str, user_id: str, status: str, extra: Optional[Dict] = None
) -> Optional[Dict]:
    db = get_db()
    try:
        oid = ObjectId(resume_id)
    except Exception:
        return None
    update_fields = {"status": status}
    if extra:
        update_fields.update(extra)
    await db.tailored_resumes.update_one(
        {"_id": oid, "user_id": user_id},
        {"$set": update_fields},
    )
    doc = await db.tailored_resumes.find_one({"_id": oid, "user_id": user_id})
    return _serialize(doc) if doc else None
