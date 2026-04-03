"""
Auth Routes — Google OAuth + JWT authentication endpoints.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.response.transaction_dto import UserResponse
from src.application.use_cases.authenticate import AuthenticateUseCase
from src.config import get_settings
from src.infrastructure.adapters.driven.category_repository_impl import (
    CategoryRepositoryImpl,
)
from src.infrastructure.adapters.driven.database import get_db
from src.infrastructure.adapters.driven.google_oauth_service import GoogleOAuthService
from src.infrastructure.adapters.driven.jwt_service import JWTService
from src.infrastructure.adapters.driven.user_repository_impl import UserRepositoryImpl
from src.infrastructure.adapters.driven.wallet_repository_impl import (
    WalletRepositoryImpl,
)
from src.infrastructure.shared.exceptions import UnauthorizedException

router = APIRouter()


def _build_auth_uc(db: AsyncSession) -> AuthenticateUseCase:
    return AuthenticateUseCase(
        user_repo=UserRepositoryImpl(db),
        wallet_repo=WalletRepositoryImpl(db),
        category_repo=CategoryRepositoryImpl(db),
        jwt_service=JWTService(),
        google_oauth=GoogleOAuthService(),
    )


def _get_user_id(authorization: str = Header(...)) -> UUID:
    """Dependency: extract and verify user_id from Bearer token."""
    if not authorization.startswith("Bearer "):
        raise UnauthorizedException(message="Missing Bearer token.")
    token = authorization[7:]
    jwt_service = JWTService()
    user_id = jwt_service.verify_access_token(token)
    if user_id is None:
        raise UnauthorizedException(message="Invalid or expired access token.")
    return user_id


# ── Request / Response DTOs ────────────────────────────────


class GoogleLoginRequest(BaseModel):
    code: str  # Authorization code from Google OAuth flow


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int  # seconds


class AuthResponse(BaseModel):
    user: UserResponse
    tokens: TokenResponse


def _user_response(user) -> dict:
    """Build user response dict from User entity."""
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        avatar_url=user.avatar_url,
        has_password=user.has_password(),
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
    ).model_dump()


# ── Routes ────────────────────────────────────────────────


@router.post("/auth/register", response_model=dict, summary="Register with Email")
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new account with email and password.
    Auto-creates "Ví cá nhân" wallet + 6 default categories on first registration.
    """
    uc = _build_auth_uc(db)
    user, access_token, refresh_token = await uc.register_with_email(
        email=request.email,
        password=request.password,
        name=request.name,
    )
    await db.commit()  # Commit all changes (user + wallet + categories)

    settings = get_settings()
    return {
        "success": True,
        "data": AuthResponse(
            user=UserResponse(**_user_response(user)),
            tokens=TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=settings.access_token_expire_minutes * 60,
            ),
        ).model_dump(),
        "message": "Registration successful.",
    }


@router.post("/auth/login", response_model=dict, summary="Login with Email")
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Login with email and password.
    Returns JWT tokens + user profile.
    """
    uc = _build_auth_uc(db)
    user, access_token, refresh_token = await uc.login_with_email(
        email=request.email,
        password=request.password,
    )

    settings = get_settings()
    return {
        "success": True,
        "data": AuthResponse(
            user=UserResponse(**_user_response(user)),
            tokens=TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=settings.access_token_expire_minutes * 60,
            ),
        ).model_dump(),
        "message": "Login successful.",
    }


@router.post("/auth/google", response_model=dict, summary="Google OAuth Login")
async def google_login(
    request: GoogleLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Exchange Google authorization code for JWT tokens + user profile.

    First login: auto-creates "Ví cá nhân" wallet + 6 default categories.
    """
    uc = _build_auth_uc(db)
    user, access_token, refresh_token = await uc.authenticate_with_google(request.code)

    settings = get_settings()
    return {
        "success": True,
        "data": AuthResponse(
            user=UserResponse(**_user_response(user)),
            tokens=TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=settings.access_token_expire_minutes * 60,
            ),
        ).model_dump(),
        "message": "Login successful.",
    }


@router.post("/auth/refresh", response_model=dict, summary="Refresh Access Token")
async def refresh_token(
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    """
    Refresh access token using a valid refresh token.
    Implements refresh token rotation.
    """
    refresh_token = body.get("refresh_token")
    if not refresh_token:
        raise UnauthorizedException(message="refresh_token is required.")

    uc = _build_auth_uc(db)
    new_access, new_refresh = await uc.refresh_access_token(refresh_token)

    settings = get_settings()
    return {
        "success": True,
        "data": TokenResponse(
            access_token=new_access,
            refresh_token=new_refresh,
            expires_in=settings.access_token_expire_minutes * 60,
        ).model_dump(),
        "message": "Token refreshed.",
    }


@router.get("/auth/me", response_model=dict, summary="Get Current User")
async def get_me(
    user_id: UUID = Depends(_get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get the currently authenticated user's profile."""
    uc = _build_auth_uc(db)
    user = await uc.get_current_user(user_id)
    return {
        "success": True,
        "data": _user_response(user),
        "message": "",
    }
