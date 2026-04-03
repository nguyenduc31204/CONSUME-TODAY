"""
Auth Routes — Google OAuth 2.0 + Apple Sign-In + JWT.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.infrastructure.adapters.driving.main import success_response

router = APIRouter()


class GoogleAuthRequest(BaseModel):
    code: str  # Authorization code from Google OAuth


class AppleAuthRequest(BaseModel):
    code: str  # Authorization code from Apple Sign-In
    id_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"


# ── Auth Endpoints (Stubs — Phase 2 full implementation) ────


@router.post("/auth/google", response_model=dict)
async def auth_google(request: GoogleAuthRequest):
    """
    Exchange Google OAuth code for JWT tokens.
    TODO: Implement in Phase 2 — Google OAuth + JWT
    """
    raise HTTPException(status_code=501, detail="Google OAuth not yet implemented")


@router.post("/auth/apple", response_model=dict)
async def auth_apple(request: AppleAuthRequest):
    """
    Authenticate with Apple Sign-In.
    TODO: Implement in Phase 2 — Apple Sign-In
    """
    raise HTTPException(status_code=501, detail="Apple Sign-In not yet implemented")


@router.post("/auth/refresh", response_model=dict)
async def refresh_token(refresh_token: str):
    """
    Refresh access token using refresh token.
    TODO: Implement in Phase 2 — JWT refresh rotation
    """
    raise HTTPException(status_code=501, detail="Token refresh not yet implemented")


@router.post("/auth/logout")
async def logout():
    """
    Logout — client discards tokens.
    Server-side token blacklist (Redis) in Phase 2.
    """
    return success_response(message="Logged out successfully")
