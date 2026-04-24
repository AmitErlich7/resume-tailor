import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, export, github, profile, tailor
from services.mongo_service import close_mongo, connect_mongo

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)

# Never log sensitive values — keys, tokens, PII are scrubbed at source.


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_mongo()
    yield
    await close_mongo()


app = FastAPI(
    title="Resume Tailor API",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
environment = os.getenv("ENVIRONMENT", "development")
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

if environment == "production":
    allowed_origins = [frontend_url]
else:
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        frontend_url,
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(profile.router, prefix="/profile", tags=["profile"])
app.include_router(github.router, prefix="/github", tags=["github"])
app.include_router(tailor.router, prefix="/tailor", tags=["tailor"])
app.include_router(export.router, prefix="/export", tags=["export"])


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok"}
