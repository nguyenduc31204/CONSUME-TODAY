"""
Google OAuth 2.0 Service — Exchange auth code for user info.
"""
from typing import Optional
import httpx

from pydantic import BaseModel

from src.config import get_settings
from src.infrastructure.shared.exceptions import UnauthorizedException


class GoogleUserInfo(BaseModel):
    """Google user info extracted from ID token / userinfo endpoint."""
    sub: str       # Google subject (unique per Google account)
    email: str
    name: str
    picture: Optional[str] = None


class GoogleOAuthService:
    """
    Google OAuth 2.0 service.
    Exchanges authorization code for tokens, then fetches user info.
    """

    TOKEN_URL = "https://oauth2.googleapis.com/token"
    USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

    def __init__(self) -> None:
        settings = get_settings()
        self._client_id = settings.google_client_id
        self._client_secret = settings.google_client_secret

    async def exchange_code_for_tokens(self, code: str) -> tuple[str, str]:
        """
        Exchange authorization code for access_token + id_token.
        Returns (access_token, id_token).
        Raises UnauthorizedException on failure.
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.TOKEN_URL,
                    data={
                        "code": code,
                        "client_id": self._client_id,
                        "client_secret": self._client_secret,
                        "grant_type": "authorization_code",
                        "redirect_uri": "postmessage",  # SPA flow: use postmessage
                    },
                    headers={"Accept": "application/json"},
                )
            except httpx.RequestError as e:
                raise UnauthorizedException(
                    message="Failed to connect to Google OAuth server.",
                    details={"original": str(e)},
                )

        if response.status_code != 200:
            raise UnauthorizedException(
                message="Invalid authorization code from Google.",
                code="ERR_GOOGLE_TOKEN_EXCHANGE",
                details={"status": response.status_code, "body": response.text[:200]},
            )

        data = response.json()
        access_token = data.get("access_token")
        id_token = data.get("id_token")

        if not access_token or not id_token:
            raise UnauthorizedException(
                message="Google OAuth token exchange returned incomplete data.",
                code="ERR_GOOGLE_TOKEN_EXCHANGE",
            )

        return access_token, id_token

    async def get_user_info(self, access_token: str, id_token: str) -> GoogleUserInfo:
        """
        Extract user info from Google id_token (primary) and userinfo endpoint.
        """
        import jwt as pyjwt

        # Decode id_token (no verification — Google signed it)
        try:
            id_payload = pyjwt.get_unverified_claims(id_token)
        except Exception as e:
            raise UnauthorizedException(
                message="Failed to decode Google ID token.",
                code="ERR_GOOGLE_ID_TOKEN",
                details={"original": str(e)},
            )

        # Verify audience matches our client_id
        aud = id_payload.get("aud")
        if aud != self._client_id:
            raise UnauthorizedException(
                message="Google ID token audience mismatch.",
                code="ERR_GOOGLE_AUD",
            )

        return GoogleUserInfo(
            sub=id_payload["sub"],
            email=id_payload["email"],
            name=id_payload.get("name", ""),
            picture=id_payload.get("picture"),
        )
