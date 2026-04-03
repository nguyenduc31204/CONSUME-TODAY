"""
UserRepository — Abstract interface for User persistence.
Defined in Domain layer (no framework imports).
"""

from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.entities.user import User


class UserRepository(ABC):
    """
    Abstract repository interface for User entity.
    Implementation lives in Infrastructure layer.
    """

    @abstractmethod
    async def save(self, user: User) -> User:
        """Persist a user entity."""
        ...

    @abstractmethod
    async def get_by_id(self, user_id: UUID) -> User | None:
        """Retrieve a user by UUID."""
        ...

    @abstractmethod
    async def get_by_email(self, email: str) -> User | None:
        """Retrieve a user by email address."""
        ...

    @abstractmethod
    async def get_by_google_sub(self, google_sub: str) -> User | None:
        """Retrieve a user by Google OAuth subject ID."""
        ...

    @abstractmethod
    async def get_by_apple_sub(self, apple_sub: str) -> User | None:
        """Retrieve a user by Apple Sign-In subject ID."""
        ...

    @abstractmethod
    async def update(self, user: User) -> User:
        """Update an existing user."""
        ...

    @abstractmethod
    async def delete(self, user_id: UUID) -> None:
        """Soft-delete a user."""
        ...
