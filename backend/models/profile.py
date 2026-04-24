from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from models.project import Project


class ContactInfo(BaseModel):
    name: str = ""
    email: str = ""
    phone: str = ""
    linkedin: str = ""
    github: str = ""
    location: str = ""


class Experience(BaseModel):
    id: str
    company: str
    title: str
    location: str = ""
    start_date: str
    end_date: str  # "Present" if current
    bullets: List[str] = []


class Education(BaseModel):
    id: str
    school: str
    degree: str
    field: str
    year: str


class ProfileDocument(BaseModel):
    user_id: str  # clerk_user_id
    contact: ContactInfo = ContactInfo()
    summary: str = ""
    skills: List[str] = []
    experiences: List[Experience] = []
    education: List[Education] = []
    projects: List[Project] = []
    updated_at: datetime


class ProfileCreate(BaseModel):
    contact: Optional[ContactInfo] = None
    summary: Optional[str] = None
    skills: Optional[List[str]] = None
    experiences: Optional[List[Experience]] = None
    education: Optional[List[Education]] = None
    projects: Optional[List[Project]] = None


# Section-level patch models
class ContactPatch(BaseModel):
    contact: ContactInfo


class SummaryPatch(BaseModel):
    summary: str


class SkillsPatch(BaseModel):
    skills: List[str]


class ExperiencesPatch(BaseModel):
    experiences: List[Experience]


class EducationPatch(BaseModel):
    education: List[Education]


class ProjectsPatch(BaseModel):
    projects: List[Project]


# ---------------------------------------------------------------------------
# Tailored resume models
# ---------------------------------------------------------------------------

class SourceMapEntry(BaseModel):
    output_section: str
    output_text: str
    source_field: str
    transformation: str  # "reworded" | "reordered" | "unchanged"


class GapReportItem(BaseModel):
    keyword: str
    found_in_profile: bool
    suggestion: str


class JDAnalysis(BaseModel):
    required_skills: List[str] = []
    preferred_skills: List[str] = []
    responsibilities: List[str] = []
    seniority: str = ""
    tech_stack: List[str] = []
    soft_skills: List[str] = []


class TailoredProfile(BaseModel):
    summary: str = ""
    skills: List[str] = []
    experiences: List[Any] = []
    projects: List[Any] = []


class TailoredResumeDocument(BaseModel):
    user_id: str
    job_title: str
    company: str
    jd_text: str
    jd_analysis: JDAnalysis
    tailored_profile: TailoredProfile
    source_map: List[SourceMapEntry] = []
    flagged_claims: List[str] = []
    gap_report: List[GapReportItem] = []
    match_score: int = 0
    status: str = "draft"  # "draft" | "approved" | "exported" | "archived"
    created_at: datetime
    approved_at: Optional[datetime] = None


class TailorRequest(BaseModel):
    jd_text: str
    job_title: str
    company: str


class ApproveRequest(BaseModel):
    flagged_claims_reviewed: bool = False
