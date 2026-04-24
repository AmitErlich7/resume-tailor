"""
GitHub service — parse a repo URL and extract project metadata via PyGithub.

Security note: GitHub tokens are never persisted. They live only for the
duration of the request and are never logged.
"""

import logging
import os
import re
from typing import Optional, Tuple

from fastapi import HTTPException, status
from github import Github, GithubException, RateLimitExceededException, UnknownObjectException

logger = logging.getLogger(__name__)

# Manifest files checked in priority order
_MANIFEST_FILES = [
    "package.json",
    "requirements.txt",
    "Cargo.toml",
    "go.mod",
    "pom.xml",
]

_README_NAMES = ["README.md", "readme.md", "Readme.md", "README.MD", "README"]

_MAX_README_CHARS = 8000
_MAX_MANIFEST_CHARS = 3000


def parse_repo_url(repo_url: str) -> Tuple[str, str]:
    """
    Extract (owner, repo) from a GitHub URL.

    Supports:
      https://github.com/owner/repo
      https://github.com/owner/repo.git
      github.com/owner/repo
      owner/repo
    """
    url = repo_url.strip().rstrip("/")
    # Strip scheme
    url = re.sub(r"^https?://", "", url)
    # Strip leading github.com/
    url = re.sub(r"^github\.com/", "", url)
    # Strip .git suffix
    url = re.sub(r"\.git$", "", url)
    parts = url.split("/")
    if len(parts) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot parse GitHub repo URL: '{repo_url}'",
        )
    return parts[0], parts[1]


def _get_github_client(token: Optional[str] = None) -> Github:
    """Return an authenticated or unauthenticated GitHub client."""
    if token:
        return Github(token)
    # Fall back to env-level token for higher rate limits
    env_token = os.getenv("GITHUB_CLIENT_SECRET")
    if env_token:
        return Github(env_token)
    return Github()


async def fetch_repo_data(repo_url: str, github_token: Optional[str] = None) -> dict:
    """
    Fetch repository data needed for project card extraction.

    Returns a dict with: description, readme, manifest_name, manifest_content,
    top_level_dirs.

    Raises HTTPException 429 on rate-limit, 404 on missing repo, 400 on bad URL.
    """
    owner, repo_name = parse_repo_url(repo_url)
    gh = _get_github_client(github_token)

    try:
        repo = gh.get_repo(f"{owner}/{repo_name}")
    except RateLimitExceededException:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="GitHub API rate limit exceeded. Please try again later.",
            headers={"Retry-After": "60"},
        )
    except UnknownObjectException:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"GitHub repository '{owner}/{repo_name}' not found or is private.",
        )
    except GithubException as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"GitHub API error: {exc.data.get('message', str(exc))}",
        )

    data: dict = {
        "repo_url": repo_url,
        "description": repo.description or "",
        "readme": "",
        "manifest_name": None,
        "manifest_content": "",
        "top_level_dirs": [],
    }

    # README
    for readme_name in _README_NAMES:
        try:
            readme_file = repo.get_contents(readme_name)
            content = readme_file.decoded_content.decode("utf-8", errors="replace")
            data["readme"] = content[:_MAX_README_CHARS]
            break
        except (UnknownObjectException, GithubException):
            continue

    # Manifest / dependency file
    for manifest in _MANIFEST_FILES:
        try:
            mf = repo.get_contents(manifest)
            content = mf.decoded_content.decode("utf-8", errors="replace")
            data["manifest_name"] = manifest
            data["manifest_content"] = content[:_MAX_MANIFEST_CHARS]
            break
        except (UnknownObjectException, GithubException):
            continue

    # Top-level directory listing (folder names only)
    try:
        contents = repo.get_contents("")
        dirs = [c.name for c in contents if c.type == "dir"]
        data["top_level_dirs"] = dirs
    except GithubException:
        pass

    return data


def build_repo_context(repo_data: dict) -> str:
    """Format fetched repo data into a prompt-ready context string."""
    parts = []
    if repo_data.get("description"):
        parts.append(f"Repository description: {repo_data['description']}")
    if repo_data.get("readme"):
        parts.append(f"README (first {_MAX_README_CHARS} chars):\n{repo_data['readme']}")
    if repo_data.get("manifest_name") and repo_data.get("manifest_content"):
        parts.append(
            f"{repo_data['manifest_name']} contents:\n{repo_data['manifest_content']}"
        )
    if repo_data.get("top_level_dirs"):
        parts.append(f"Top-level directories: {', '.join(repo_data['top_level_dirs'])}")
    return "\n\n---\n\n".join(parts)
