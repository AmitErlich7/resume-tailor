from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    clerk_user_id: str
    email: EmailStr
    name: str
    avatar: str
    provider: str  # "google" or "linkedin"


class UserDocument(BaseModel):
    clerk_user_id: str
    email: EmailStr
    name: str
    avatar: str
    provider: List[str]
    created_at: datetime
    last_login: datetime


class UserResponse(BaseModel):
    clerk_user_id: str
    email: str
    name: str
    avatar: str
    provider: List[str]
    created_at: datetime
    last_login: datetime
