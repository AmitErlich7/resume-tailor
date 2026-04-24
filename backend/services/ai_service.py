"""
AI service — all Claude API calls.

Three sequential calls for the tailoring pipeline:
  1. JD Analyzer
  2. Resume Tailor
  3. Fact Checker + Gap Report

Plus a standalone call for GitHub repo analysis.

All calls use claude-opus-4-6. Sensitive values are never logged.
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional, Tuple

import anthropic
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

_MODEL = "claude-opus-4-6"
_DEFAULT_MAX_TOKENS = 2000


def _get_client() -> anthropic.Anthropic:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not set")
    return anthropic.Anthropic(api_key=api_key)


def _parse_json_response(raw: str, context: str = "") -> Tuple[Any, Optional[str]]:
    """
    Parse a JSON string from a Claude response.
    Returns (parsed_value, error_string).
    Handles responses that may have stray whitespace or minimal preamble.
    """
    text = raw.strip()
    # Strip accidental markdown code fences if Claude returns them
    if text.startswith("```"):
        lines = text.splitlines()
        # Remove first and last fence lines
        inner = [l for l in lines if not l.startswith("```")]
        text = "\n".join(inner).strip()

    try:
        return json.loads(text), None
    except json.JSONDecodeError as exc:
        return raw, f"JSON parse error ({context}): {exc}"


# ---------------------------------------------------------------------------
# 1. JD Analyzer
# ---------------------------------------------------------------------------

async def analyze_jd(jd_text: str) -> Dict:
    """
    Call Claude to analyze a job description.
    Returns the structured JD analysis dict.
    Raises HTTPException 422 on parse failure.
    """
    client = _get_client()
    user_prompt = (
        "Analyze this job description and return JSON with these exact fields: "
        "required_skills (array), preferred_skills (array), responsibilities (array, max 6), "
        "seniority (string: junior/mid/senior/lead), tech_stack (array), soft_skills (array).\n\n"
        f"Job description:\n{jd_text}"
    )

    message = client.messages.create(
        model=_MODEL,
        max_tokens=_DEFAULT_MAX_TOKENS,
        system=(
            "You are a recruitment expert. Analyze job descriptions and return structured JSON only, "
            "no preamble, no markdown."
        ),
        messages=[{"role": "user", "content": user_prompt}],
    )

    raw = message.content[0].text
    parsed, error = _parse_json_response(raw, "JD analysis")
    if error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "JD analysis AI output could not be parsed", "raw": raw, "error": error},
        )

    # Fill in any missing keys with safe defaults
    defaults = {
        "required_skills": [],
        "preferred_skills": [],
        "responsibilities": [],
        "seniority": "mid",
        "tech_stack": [],
        "soft_skills": [],
    }
    for key, default in defaults.items():
        if key not in parsed or parsed[key] is None:
            parsed[key] = default

    return parsed


# ---------------------------------------------------------------------------
# 2. Resume Tailor
# ---------------------------------------------------------------------------

async def tailor_resume(profile: Dict, jd_analysis: Dict) -> Dict:
    """
    Call Claude to produce a tailored resume profile.
    Returns tailored_profile dict with source_map.
    Raises HTTPException 422 on parse failure.
    """
    client = _get_client()

    profile_json = json.dumps(profile, indent=2, default=str)
    jd_json = json.dumps(jd_analysis, indent=2)

    user_prompt = (
        "Tailor this resume profile to the job requirements.\n\n"
        f"Profile:\n{profile_json}\n\n"
        f"Job requirements:\n{jd_json}\n\n"
        "Return JSON only with these fields:\n"
        "- summary: string (3 sentences max, mirrors JD priorities)\n"
        "- skills: array of strings (only from profile.skills, ordered by JD relevance)\n"
        "- experiences: array (same structure as input, bullets reworded to mirror JD language)\n"
        "- projects: array (only include projects relevant to JD, ordered by relevance score, "
        "purpose reworded to mirror JD)\n"
        "- source_map: array of objects with fields: output_section (string), output_text (string), "
        "source_field (string, e.g. 'experiences[1].bullets[2]'), "
        "transformation (string: 'reworded' | 'reordered' | 'unchanged')\n\n"
        "CRITICAL RULES:\n"
        "1. You may ONLY use information explicitly present in the profile.\n"
        "2. If the JD requires a skill or technology not in the profile, do NOT include it "
        "in the output — add it to a gap_report instead.\n"
        "3. Every bullet or sentence in the output must have a source_map entry.\n"
        "4. Do not fabricate roles, technologies, achievements, or dates."
    )

    message = client.messages.create(
        model=_MODEL,
        max_tokens=4000,
        system=(
            "You are a senior resume writer. You may ONLY use information explicitly provided in "
            "the user's profile. You may rephrase, reorder, and emphasize — but you may NEVER add "
            "technologies, roles, achievements, or responsibilities that are not present in the "
            "original profile. For every output bullet or sentence, you must include a source_ref "
            "pointing to the exact field in the profile it came from."
        ),
        messages=[{"role": "user", "content": user_prompt}],
    )

    raw = message.content[0].text
    parsed, error = _parse_json_response(raw, "resume tailoring")
    if error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Resume tailoring AI output could not be parsed", "raw": raw, "error": error},
        )

    # Ensure expected keys exist
    parsed.setdefault("summary", "")
    parsed.setdefault("skills", [])
    parsed.setdefault("experiences", [])
    parsed.setdefault("projects", [])
    parsed.setdefault("source_map", [])

    return parsed


# ---------------------------------------------------------------------------
# 3. Fact Checker + Gap Report
# ---------------------------------------------------------------------------

async def fact_check_and_gap(profile: Dict, tailored: Dict, jd_analysis: Dict) -> Dict:
    """
    Compare original profile with tailored resume and generate:
    - flagged_claims: items in tailored resume not traceable to profile
    - gap_report: JD keywords not found in profile
    - match_score: 0-100
    """
    client = _get_client()

    profile_json = json.dumps(profile, indent=2, default=str)
    tailored_json = json.dumps(tailored, indent=2, default=str)
    jd_json = json.dumps(jd_analysis, indent=2)

    user_prompt = (
        "Compare the original profile with the tailored resume. Return JSON with:\n"
        "- flagged_claims: array of strings (any claim in tailored resume not traceable "
        "to original profile)\n"
        "- gap_report: array of objects with: keyword (string), found_in_profile (boolean), "
        "suggestion (string — a realistic suggestion for how the user could gain this skill, "
        "or how to address the gap)\n"
        "- match_score: integer 0-100 (how well the profile matches the JD)\n\n"
        f"Original profile:\n{profile_json}\n\n"
        f"Tailored resume:\n{tailored_json}\n\n"
        f"JD requirements:\n{jd_json}"
    )

    message = client.messages.create(
        model=_MODEL,
        max_tokens=_DEFAULT_MAX_TOKENS,
        system=(
            "You are a strict fact-checker for resumes. Your job is to find fabrications "
            "and skill gaps."
        ),
        messages=[{"role": "user", "content": user_prompt}],
    )

    raw = message.content[0].text
    parsed, error = _parse_json_response(raw, "fact check")
    if error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Fact-check AI output could not be parsed", "raw": raw, "error": error},
        )

    parsed.setdefault("flagged_claims", [])
    parsed.setdefault("gap_report", [])
    parsed.setdefault("match_score", 0)

    # Clamp match_score
    try:
        parsed["match_score"] = max(0, min(100, int(parsed["match_score"])))
    except (TypeError, ValueError):
        parsed["match_score"] = 0

    return parsed


# ---------------------------------------------------------------------------
# GitHub repo analysis
# ---------------------------------------------------------------------------

async def analyze_github_repo(context: str, repo_url: str) -> Tuple[Any, Optional[str]]:
    """
    Ask Claude to extract project metadata from raw repo content.
    Returns (result_dict_or_raw_string, error_or_None).
    """
    client = _get_client()

    system_prompt = (
        "You are a technical resume assistant. Analyze the provided GitHub repository content "
        "and return a JSON object only, with no preamble, no markdown, no code fences. "
        "The JSON must contain exactly these fields:\n"
        "- name: string, the project name\n"
        "- purpose: string, one sentence describing what the project does and the problem it solves\n"
        "- tech_stack: array of strings, exact technology names found in dependency files and README "
        "(e.g. React, FastAPI, PostgreSQL). Do not infer technologies not explicitly mentioned.\n"
        "- your_role: string, infer from commit patterns and README. One of: "
        "solo_builder, contributor, maintainer, team_lead\n"
        "- scale: string, one of: personal, team, production\n"
        "- key_features: array of up to 4 strings, specific features or accomplishments\n"
        "Return only valid JSON. If a field cannot be determined, use null."
    )

    message = client.messages.create(
        model=_MODEL,
        max_tokens=_DEFAULT_MAX_TOKENS,
        system=system_prompt,
        messages=[{"role": "user", "content": f"Repository content:\n\n{context}"}],
    )

    raw = message.content[0].text
    parsed, error = _parse_json_response(raw, "GitHub repo analysis")
    if error:
        return raw, error

    # Validate against GitHubProjectRaw model
    from models.project import GitHubProjectRaw
    try:
        validated = GitHubProjectRaw(**parsed)
        return validated.model_dump(), None
    except Exception as exc:
        return raw, f"Validation error: {exc}"


# ---------------------------------------------------------------------------
# Safeguard: ensure every tailored bullet has a source_map entry
# ---------------------------------------------------------------------------

def enforce_source_map_coverage(tailored: Dict, source_map: List[Dict]) -> List[str]:
    """
    Check that every bullet in tailored experiences and every project purpose
    has a corresponding entry in source_map.  Return a list of uncovered texts
    that should be added to flagged_claims.
    """
    mapped_texts = {entry.get("output_text", "").strip() for entry in source_map}
    uncovered = []

    for exp in tailored.get("experiences", []):
        for bullet in exp.get("bullets", []):
            if bullet.strip() and bullet.strip() not in mapped_texts:
                uncovered.append(bullet.strip())

    for proj in tailored.get("projects", []):
        purpose = (proj.get("purpose") or "").strip()
        if purpose and purpose not in mapped_texts:
            uncovered.append(purpose)

    summary = (tailored.get("summary") or "").strip()
    if summary and summary not in mapped_texts:
        # Summary is one block — flag only if no summary entry exists at all
        has_summary_entry = any(
            e.get("output_section") == "summary" for e in source_map
        )
        if not has_summary_entry:
            uncovered.append(summary)

    return uncovered
