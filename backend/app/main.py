"""
FastAPI entrypoint. Run with: uvicorn app.main:app --reload --port 8000
Docs auto-served at /docs (OpenAPI) once routes are implemented.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import both our operational router and the new auth router
from app.api.routes import router as api_router
from app.api.auth import router as auth_router

app = FastAPI(
    title="Cybersecurity Event Reconciliation Engine",
    description="Temporal conflict resolution and audit trail generation "
                "for multi-source security events.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",                  # Allow any origin to prevent CORS issues
    allow_credentials=True,                   # ADDED: Required for secure auth token passing
    allow_methods=["*"],
    allow_headers=["*"],
)

# ADDED: Mount the auth router under the /auth prefix
app.include_router(auth_router, prefix="/auth", tags=["auth"])

# Mount the main engine routes
app.include_router(api_router, tags=["engine"])


@app.get("/health")
def health():
    return {"status": "ok"}