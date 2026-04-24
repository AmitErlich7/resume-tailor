# Resume Tailor

An AI-powered resume tailoring web app. Users sign in with Google or LinkedIn, build a professional profile, connect GitHub repos to auto-extract project details, paste a job description, and receive a tailored resume that passes ATS systems.

**The AI enhances and rewords — it never fabricates. Every change is sourced, diff-highlighted, and requires explicit human approval before export.**

---

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React (Vite), Clerk for auth |
| Backend | Python, FastAPI (async) |
| Database | MongoDB Atlas via Motor |
| AI | Anthropic `claude-opus-4-6` |
| GitHub import | PyGithub |
| Export | python-docx (DOCX), reportlab (PDF) |
| Frontend hosting | Vercel |
| Backend hosting | Render |

---

## Prerequisites

- Node.js 18+
- Python 3.11+
- A [Clerk](https://clerk.com) account (free tier works)
- A [MongoDB Atlas](https://cloud.mongodb.com) account (free M0 cluster works)
- An [Anthropic](https://console.anthropic.com) API key
- A GitHub account (optional, for repo import)

---

## Local Setup

### 1. Clone and enter the project

```bash
git clone <repo-url>
cd resume-tailor
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env` with your credentials:

```env
ANTHROPIC_API_KEY=sk-ant-...
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/resume_tailor?retryWrites=true&w=majority
CLERK_SECRET_KEY=sk_test_...
CLERK_JWT_ISSUER=https://<your-clerk-frontend-api>.clerk.accounts.dev
GITHUB_CLIENT_ID=          # optional
GITHUB_CLIENT_SECRET=      # optional
ENVIRONMENT=development
FRONTEND_URL=http://localhost:5173
```

### 3. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `frontend/.env`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_BASE_URL=http://localhost:8000
```

---

## Configuring Clerk

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com) → create a new application.
2. Under **User & Authentication → Social connections**, enable **Google** and/or **LinkedIn**.
3. Under **API Keys**, copy:
   - **Publishable key** → `VITE_CLERK_PUBLISHABLE_KEY` in `frontend/.env`
   - **Secret key** → `CLERK_SECRET_KEY` in `backend/.env`
4. Under **JWT Templates** (or the Clerk issuer URL shown in the dashboard), copy the issuer URL → `CLERK_JWT_ISSUER` in `backend/.env`. It looks like: `https://your-app.clerk.accounts.dev`
5. Under **Redirect URLs**, add:
   - `http://localhost:5173` (development)
   - Your Vercel deployment URL (production)

---

## Connecting MongoDB Atlas

1. Create a free M0 cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Create a database user with read/write access.
3. Under **Network Access**, add `0.0.0.0/0` (development) or your server IP (production).
4. Click **Connect → Drivers** and copy the connection string.
5. Replace `<password>` and set the database name to `resume_tailor`:
   ```
   mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/resume_tailor?retryWrites=true&w=majority
   ```
6. Paste into `MONGODB_URI` in `backend/.env`.

Indexes are created automatically on startup.

---

## Running Both Servers Locally

Open two terminals:

**Terminal 1 — Backend**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health check: [http://localhost:8000/health](http://localhost:8000/health)

---

## End-to-End Smoke Test

Follow these steps to verify the full flow works:

1. **Open** http://localhost:5173 — you should be redirected to `/login`.
2. **Sign in** with Google or LinkedIn via Clerk.
3. **Profile page** — fill in your name, email, at least one skill, and one work experience. Click "Save" on each section.
4. **GitHub import (optional)** — on the Profile page, click "Import from GitHub". Paste a public repo URL (e.g. `https://github.com/facebook/react`). Review the AI-extracted card and click "Save to Profile".
5. **Tailor a resume** — navigate to "Tailor Resume". Paste a real job description. Enter a job title and company. Click "Tailor My Resume →". Wait ~30 seconds for the 3 AI calls to complete.
6. **Review the diff** — the split view shows your original profile on the left and the tailored resume on the right. Reworded text is yellow. Flagged claims are red.
7. **Check the gap report** — review missing keywords. Only add them to your profile if you genuinely have that experience.
8. **Approve** — scroll through the full diff. The green "Approve" button unlocks at the bottom.
9. **Export** — after approval, click "Download DOCX" or "Download PDF". Open the file and verify it's a clean single-column document.
10. **Versions page** — navigate to `/versions` and confirm the resume appears with status "exported".

---

## Deployment

### Backend → Render

1. Create a new **Web Service** on Render, connected to your repo.
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add all environment variables from `backend/.env.example` in the Render dashboard.
5. Set `ENVIRONMENT=production` and `FRONTEND_URL=https://your-vercel-app.vercel.app`.

### Frontend → Vercel

1. Import the repo on Vercel. Set the root directory to `frontend`.
2. Framework preset: **Vite**.
3. Add environment variables:
   - `VITE_CLERK_PUBLISHABLE_KEY`
   - `VITE_API_BASE_URL=https://your-render-backend.onrender.com`
4. Deploy.
5. Add the Vercel URL to Clerk's allowed redirect URLs.

---

## Security Notes

- Every MongoDB query filters by `user_id` — cross-user data access is impossible by design.
- GitHub OAuth tokens are held only in memory for the duration of the import request and are never stored.
- No API keys or JWTs are logged anywhere.
- All user-provided text is HTML-stripped before being passed to the AI.
- Exports are blocked until the resume status is `approved` — enforced server-side.
- CORS is locked to the configured `FRONTEND_URL` in production.

---

## Project Structure

```
resume-tailor/
├── backend/
│   ├── main.py                  FastAPI app, CORS, lifespan
│   ├── requirements.txt
│   ├── .env.example
│   ├── routers/
│   │   ├── auth.py              POST /auth/sync
│   │   ├── profile.py           GET/POST/PATCH /profile
│   │   ├── github.py            POST /github/import|confirm
│   │   ├── tailor.py            POST /tailor + versions/approve/delete
│   │   └── export.py            POST /export/{id}/docx|pdf
│   ├── services/
│   │   ├── mongo_service.py     Motor async CRUD helpers
│   │   ├── ai_service.py        3 Claude API calls + safeguards
│   │   ├── github_service.py    PyGithub repo fetching + parsing
│   │   └── export_service.py    ATS-compliant DOCX + PDF generation
│   ├── models/
│   │   ├── user.py
│   │   ├── profile.py           All Pydantic schemas
│   │   └── project.py
│   └── middleware/
│       └── auth_middleware.py   Clerk JWT verification (JWKS)
└── frontend/
    ├── src/
    │   ├── App.jsx              Router
    │   ├── main.jsx             Clerk + TokenBridge
    │   ├── components/
    │   │   ├── AuthGuard.jsx    Redirect unauthenticated users
    │   │   ├── Nav.jsx          Sticky navigation bar
    │   │   ├── ProfileForm.jsx  All profile section components
    │   │   ├── GitHubImport.jsx Import modal + review flow
    │   │   ├── JDInput.jsx      Job description input form
    │   │   ├── ResumeDiff.jsx   Split diff view with highlights
    │   │   ├── GapReport.jsx    Skill gap analysis display
    │   │   └── ExportBar.jsx    DOCX / PDF download buttons
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Profile.jsx
    │   │   ├── Tailor.jsx
    │   │   └── Versions.jsx
    │   ├── services/
    │   │   └── api.js           All fetch calls + auth headers
    │   └── hooks/
    │       └── useProfile.js    Profile fetch + reload hook
    └── .env.example
```
