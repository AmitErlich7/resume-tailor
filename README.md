# Resume Tailor

Resume Tailor is an AI-powered tool that takes your professional profile and a job description, and produces a tailored resume that mirrors the JD's language and priorities — without inventing anything.

**The core guarantee: the AI only rewords and reorders. It never fabricates experience, skills, or technologies that aren't already in your profile. Every change is sourced, diff-highlighted, and requires your explicit approval before you can export.**

---

## What it does

1. **Build your profile once** — fill in your contact info, summary, skills, work experience, education, projects, and volunteering. This is your source of truth.

2. **Import projects from GitHub** — paste your GitHub profile URL and the app fetches all your public repos. Select which ones to analyze, and the AI reads each repo's README and dependencies to extract project name, purpose, tech stack, key features, and your role. Review and edit the cards before saving.

3. **Tailor to a job** — paste any job description. The AI runs three sequential steps: analyze the JD for required skills and seniority → rewrite your resume bullets to mirror JD language → fact-check every claim against your original profile and flag anything it can't source.

4. **Review the diff** — a side-by-side view shows your original profile next to the tailored version. Reworded text is highlighted. Flagged claims (anything the AI couldn't trace to your profile) are marked in red for your review.

5. **Check the gap report** — see which JD keywords are missing from your profile and get realistic suggestions for addressing them. A match score shows how well your profile aligns with the role.

6. **Approve and export** — scroll through the full diff to unlock the approve button. Once approved, download a clean ATS-compliant resume as DOCX or PDF.

All tailored resumes are saved with their status (draft → approved → exported) so you can revisit and export any version.

---

## Architecture

| Layer     | Technology |
|-----------|------------|
| Frontend  | React (Vite) |
| Backend   | Python, FastAPI |
| Database  | SQLite (local file, no setup needed) |
| AI        | Anthropic `claude-sonnet-4-6` |
| GitHub    | PyGithub |
| Export    | python-docx (DOCX), WeasyPrint / reportlab (PDF) |

No authentication, no cloud database, no external services beyond the Anthropic API. Everything runs locally.

---

## Local setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- An [Anthropic API key](https://console.anthropic.com)

### 1. Clone the repo

```bash
git clone <repo-url>
cd resume-tailor
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...
ENVIRONMENT=development
FRONTEND_URL=http://localhost:5173
```

Start the backend:

```bash
uvicorn main:app --reload --port 8000
```

The SQLite database (`resume_tailor.db`) is created automatically on first run. Your data persists between restarts.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Using the app

### Profile

Fill in each section and hit **Save** to persist it. Sections save independently so a partial profile is fine.

To import projects from GitHub:
1. Go to **Profile → Projects** and click **Import from GitHub**.
2. Enter your GitHub username or profile URL.
3. Select the repos you want analyzed (up to 10 at a time).
4. The AI analyzes each repo in parallel — you'll see per-card loading states.
5. Review and edit the extracted details, then save.

### Tailoring a resume

1. Go to **Tailor** and enter the job title, company, and paste the full job description.
2. Click **Tailor my resume →** and wait ~30 seconds for the three AI steps to complete.
3. Review the diff. The right panel shows the approve button, ATS score, and export buttons — all visible without extra scrolling.
4. Scroll through the diff to unlock approval (there's a live progress bar).
5. Click **Approve & unlock export**, then download DOCX or PDF.

### Versions

All tailored resumes are listed under **Versions** with their status and match score. You can view, re-export, or archive any version.

---

## Project structure

```
resume-tailor/
├── backend/
│   ├── main.py                  FastAPI app entry point
│   ├── requirements.txt
│   ├── .env                     ANTHROPIC_API_KEY goes here
│   ├── routers/
│   │   ├── profile.py           GET / POST / PATCH /profile
│   │   ├── github.py            /github/fetch-profile, /import, /confirm
│   │   ├── tailor.py            POST /tailor + versions, approve, delete
│   │   └── export.py            POST /export/{id}/docx|pdf
│   ├── services/
│   │   ├── db_service.py        SQLite CRUD via aiosqlite
│   │   ├── ai_service.py        Claude API calls (JD analysis, tailoring, fact-check, ATS score)
│   │   ├── github_service.py    PyGithub repo fetching + profile scan
│   │   └── export_service.py    ATS-compliant DOCX + PDF generation
│   └── models/
│       ├── profile.py           Pydantic schemas for all profile sections
│       └── project.py           GitHub project card schema
└── frontend/
    └── src/
        ├── pages/
        │   ├── Dashboard.jsx    Resume history + profile completion + quick CTA
        │   ├── Profile.jsx      All profile sections + GitHub import flow
        │   ├── Tailor.jsx       JD input → AI pipeline → diff + gap report + export
        │   └── Versions.jsx     All tailored resumes with export and archive actions
        ├── components/
        │   ├── Nav.jsx                  Sidebar + mobile bottom bar
        │   ├── ProfileForm.jsx          All profile section form components
        │   ├── GitHubProfileImport.jsx  Multi-step GitHub profile import modal
        │   ├── JDInput.jsx              Job description form
        │   ├── ResumeDiff.jsx           Side-by-side diff with change highlights
        │   ├── GapReport.jsx            Skill gap analysis panel
        │   └── ExportBar.jsx            DOCX / PDF download (full-width + compact modes)
        ├── services/
        │   └── api.js                   All API calls
        └── hooks/
            └── useProfile.js            Profile fetch + reload
```

---

## Security notes

- All user-provided text is HTML-stripped before being passed to the AI.
- GitHub tokens (if provided) live only in memory for the duration of a single import request and are never stored.
- Exports are blocked server-side until a resume reaches `approved` status.
- The AI is instructed never to add skills, technologies, or experience not present in the original profile — and the fact-checker step independently verifies this.
