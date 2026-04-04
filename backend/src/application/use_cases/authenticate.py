"""
AuthenticateUseCase — Social login, email/password auth + JWT management.
"""

from uuid import UUID

from src.domain.entities.category import DEFAULT_CATEGORIES, Category
from src.domain.entities.user import User
from src.domain.entities.wallet import Wallet
from src.domain.repositories.category_repository import CategoryRepository
from src.domain.repositories.user_repository import UserRepository
from src.domain.repositories.wallet_repository import WalletRepository
from src.infrastructure.adapters.driven.google_oauth_service import GoogleOAuthService
from src.infrastructure.adapters.driven.jwt_service import JWTService
from src.infrastructure.adapters.driven.password_service import PasswordService


class AuthenticateUseCase:
    """
    End-to-end Google OAuth authentication + first-login setup.

    Flow:
      1. Exchange auth code → Google user info
      2. Find or create User (by google_sub)
      3. Generate JWT pair
      4. On first login: create default wallet + 6 categories
    """

    def __init__(
        self,
        user_repo: UserRepository,
        wallet_repo: WalletRepository,
        category_repo: CategoryRepository,
        jwt_service: JWTService,
        google_oauth: GoogleOAuthService,
    ) -> None:
        self._user_repo = user_repo
        self._wallet_repo = wallet_repo
        self._category_repo = category_repo
        self._jwt = jwt_service
        self._google = google_oauth

    async def authenticate_with_google(
        self, code: str, redirect_uri: str = "postmessage"
    ) -> tuple[User, str, str]:
        """
        Full Google OAuth authentication flow.
        Returns (user, access_token, refresh_token).

        Args:
            code: Authorization code from Google OAuth.
            redirect_uri: Must match the redirect_uri used when requesting the code.
                         Use "postmessage" for the GIS popup flow.
                         Use "{origin}/auth/callback" for the redirect flow.
        """
        # Step 1: Get Google user info
        access_token, id_token = await self._google.exchange_code_for_tokens(
            code, redirect_uri
        )
        google_user = await self._google.get_user_info(access_token, id_token)

        # Step 2: Find or create user
        user = await self._user_repo.get_by_google_sub(google_user.sub)
        is_new_user = user is None

        if user is None:
            user = await self._user_repo.save(
                User(
                    email=google_user.email,
                    name=google_user.name,
                    avatar_url=google_user.picture,
                    google_sub=google_user.sub,
                )
            )
        else:
            # Update profile if changed
            updated = False
            if user.name != google_user.name:
                user.name = google_user.name
                updated = True
            if user.avatar_url != google_user.picture:
                user.avatar_url = google_user.picture
                updated = True
            if updated:
                user = await self._user_repo.update(user)

        # Step 3: First-login defaults
        if is_new_user:
            await self._create_first_login_defaults(user.id)

        # Step 4: Generate tokens
        access_token_jwt, refresh_token_jwt = self._jwt.create_token_pair(
            user.id, name=user.name, email=user.email
        )
        return user, access_token_jwt, refresh_token_jwt

    async def refresh_access_token(self, refresh_token: str) -> tuple[str, str]:
        """
        Refresh access token using a valid refresh token.
        Returns (new_access_token, new_refresh_token) — refresh token rotation.
        """
        user_id = self._jwt.verify_refresh_token(refresh_token)
        if user_id is None:
            from src.infrastructure.shared.exceptions import UnauthorizedException

            raise UnauthorizedException(
                message="Invalid or expired refresh token.",
                code="ERR_INVALID_REFRESH_TOKEN",
            )

        user = await self._user_repo.get_by_id(user_id)
        if user is None or not user.is_active:
            from src.infrastructure.shared.exceptions import UnauthorizedException

            raise UnauthorizedException(
                message="User not found or deactivated.",
                code="ERR_USER_INACTIVE",
            )

        return self._jwt.create_token_pair(user.id, name=user.name, email=user.email)

    async def get_current_user(self, user_id: UUID) -> User:
        """Get the current authenticated user."""
        user = await self._user_repo.get_by_id(user_id)
        if user is None or not user.is_active:
            from src.infrastructure.shared.exceptions import UnauthorizedException

            raise UnauthorizedException(
                message="User not found or deactivated.",
                code="ERR_USER_INACTIVE",
            )
        return user

    # ── First-Login Defaults ─────────────────────────────

    async def _create_first_login_defaults(self, user_id: UUID) -> Wallet:
        """Create default wallet + 6 categories on first login."""
        wallet = Wallet(
            user_id=user_id,
            name="Ví cá nhân",
            description="Ví mặc định",
            color="#9333EA",
            icon="wallet",
            is_default=True,
            is_personal=True,
        )
        saved_wallet = await self._wallet_repo.save(wallet)

        # Create 6 default categories
        for cat_data in DEFAULT_CATEGORIES:
            category = Category(
                wallet_id=saved_wallet.id,
                name=cat_data["name"],
                icon=cat_data["icon"],
                color=cat_data["color"],
                emoji=cat_data["emoji"],
                is_default=True,
            )
            await self._category_repo.save(category)

        return saved_wallet

    # ── Email / Password Auth ─────────────────────────────

    async def register_with_email(
        self,
        email: str,
        password: str,
        name: str,
    ) -> tuple[User, str, str]:
        """
        Register a new user with email + password.
        Returns (user, access_token, refresh_token).
        Raises ConflictException if email already exists.
        """
        from src.infrastructure.shared.exceptions import (
            ConflictException,
            ValidationException,
        )

        if not email or "@" not in email:
            raise ValidationException(message="Invalid email address.")
        if not password or len(password) < 8:
            raise ValidationException(message="Password must be at least 8 characters.")

        # Check if email already taken
        existing = await self._user_repo.get_by_email(email.lower())
        if existing is not None:
            raise ConflictException(
                message="An account with this email already exists.",
                code="ERR_EMAIL_EXISTS",
            )

        hashed = PasswordService.hash(password)
        user = await self._user_repo.save(
            User(
                email=email.lower().strip(),
                name=name.strip(),
                hashed_password=hashed,
                is_email_verified=False,
            )
        )

        # Create first-login defaults
        await self._create_first_login_defaults(user.id)

        access_token, refresh_token = self._jwt.create_token_pair(
            user.id, name=user.name, email=user.email
        )
        return user, access_token, refresh_token

    async def login_with_email(
        self, email: str, password: str
    ) -> tuple[User, str, str]:
        """
        Authenticate user with email + password.
        Returns (user, access_token, refresh_token).
        Raises UnauthorizedException on failure.
        """
        from src.infrastructure.shared.exceptions import UnauthorizedException

        if not email or not password:
            raise UnauthorizedException(message="Email and password are required.")

        user = await self._user_repo.get_by_email(email.lower().strip())
        if user is None or not user.is_active:
            raise UnauthorizedException(
                message="Invalid email or password.", code="ERR_INVALID_CREDENTIALS"
            )

        if user.hashed_password is None:
            raise UnauthorizedException(
                message="This account uses social login. Please sign in with Google.",
                code="ERR_PASSWORD_NOT_SET",
            )

        if not PasswordService.verify(password, user.hashed_password):
            raise UnauthorizedException(
                message="Invalid email or password.", code="ERR_INVALID_CREDENTIALS"
            )

        access_token, refresh_token = self._jwt.create_token_pair(
            user.id, name=user.name, email=user.email
        )
        return user, access_token, refresh_token
