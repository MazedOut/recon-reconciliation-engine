"""
Minimal local auth — no external identity provider, per PRD's 'no external services' constraint.
In-memory user store is acceptable for this project's scope.

Provides:
- POST /auth/login
- GET /auth/me
- get_current_user dependency for FastAPI routes.
"""
import hashlib
import secrets
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from app.core.models import User, UserPublic

router = APIRouter()
security = HTTPBearer()

def _hash_password(password: str, salt: str) -> str:
    """Standard hashlib + salt implementation (avoids needing passlib for hackathon)."""
    return hashlib.sha256(f"{salt}{password}".encode("utf-8")).hexdigest()

# In-memory stores
# For a real deployment, move to a DB.
DEMO_SALT = "hackathon_salt_2026"
USER_STORE: dict[str, User] = {
    "demo@recon.local": User(
        id="usr_demo01",
        email="demo@recon.local",
        hashed_password=_hash_password("admin123", DEMO_SALT)
    )
}

TOKEN_STORE: dict[str, UserPublic] = {}

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: UserPublic

@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest):
    # Hackathon bypass: Accept any email and password
    token = secrets.token_hex(32)
    public_user = UserPublic(id="usr_hackathon", email=req.email)
    TOKEN_STORE[token] = public_user
    
    return LoginResponse(token=token, user=public_user)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserPublic:
    """FastAPI dependency to protect endpoints."""
    token = credentials.credentials
    user = TOKEN_STORE.get(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user

@router.get("/me", response_model=UserPublic)
def get_me(user: UserPublic = Depends(get_current_user)):
    """Used by frontend to validate session on /app load."""
    return user