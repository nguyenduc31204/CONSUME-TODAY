"""
JWT Service — RS256 (production) or HS256 (local dev fallback).
Handles access + refresh token lifecycle.
"""
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from jose import jwt, JWTError
from pydantic import BaseModel

from src.config import get_settings


class TokenPayload(BaseModel):
    sub: str
    type: str
    exp: datetime
    iat: datetime


class JWTService:
    """
    JWT service — RS256 if real keys configured, HS256 for local dev.
    """

    def __init__(self) -> None:
        settings = get_settings()
        priv = settings.jwt_private_key
        pub = settings.jwt_public_key

        if priv and pub and not priv.startswith("your_"):
            self._algorithm = "RS256"
            self._sign_key = priv
            self._verify_key = pub
        else:
            self._algorithm = "HS256"
            self._sign_key = settings.app_secret_key
            self._verify_key = settings.app_secret_key

        self._access_expire = settings.access_token_expire_minutes
        self._refresh_expire = settings.refresh_token_expire_days

    def create_access_token(self, user_id: UUID) -> str:
        now = datetime.utcnow()
        payload = {
            "sub": str(user_id),
            "type": "access",
            "iat": now,
            "exp": now + timedelta(minutes=self._access_expire),
        }
        return jwt.encode(payload, self._sign_key, algorithm=self._algorithm)

    def create_refresh_token(self, user_id: UUID) -> str:
        now = datetime.utcnow()
        payload = {
            "sub": str(user_id),
            "type": "refresh",
            "iat": now,
            "exp": now + timedelta(days=self._refresh_expire),
        }
        return jwt.encode(payload, self._sign_key, algorithm=self._algorithm)

    def create_token_pair(self, user_id: UUID) -> tuple[str, str]:
        return self.create_access_token(user_id), self.create_refresh_token(user_id)

    def verify_token(self, token: str) -> Optional[TokenPayload]:
        try:
            payload = jwt.decode(token, self._verify_key, algorithms=[self._algorithm])
            return TokenPayload(**payload)
        except JWTError:
            return None

    def verify_access_token(self, token: str) -> Optional[UUID]:
        p = self.verify_token(token)
        if p is None or p.type != "access":
            return None
        return UUID(p.sub)

    def verify_refresh_token(self, token: str) -> Optional[UUID]:
        p = self.verify_token(token)
        if p is None or p.type != "refresh":
            return None
        return UUID(p.sub)
