from typing import List, Optional
from pydantic import BaseModel


class Project(BaseModel):
    id: str
    name: str
    repo_url: Optional[str] = None
    tech_stack: List[str] = []
    purpose: str
    your_role: str
    scale: str  # "personal" | "team" | "production"
    key_features: List[str] = []
    source: str  # "manual" | "github"


class GitHubProjectRaw(BaseModel):
    """Shape returned by Claude after analyzing a GitHub repo."""
    name: Optional[str] = None
    purpose: Optional[str] = None
    tech_stack: Optional[List[str]] = None
    your_role: Optional[str] = None
    scale: Optional[str] = None
    key_features: Optional[List[str]] = None
