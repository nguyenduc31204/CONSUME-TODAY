"""
BaseEntity — Abstract base for all domain entities.
Provides UUID primary key + audit columns (created_at, updated_at, deleted_at).
NOT a dataclass — subclasses use dataclass WITHOUT inheriting from dataclass-generated __init__.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4


class BaseEntity:
    """
    Abstract base class for all domain entities.
    Subclasses MUST define their own __init__ that calls super().__init__(**base_kwargs).
    """

    id: UUID
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime]

    def __init__(
        self,
        *,
        id: Optional[UUID] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        deleted_at: Optional[datetime] = None,
    ) -> None:
        self.id = id if id is not None else uuid4()
        self.created_at = created_at if created_at is not None else datetime.utcnow()
        self.updated_at = updated_at if updated_at is not None else datetime.utcnow()
        self.deleted_at = deleted_at

    def soft_delete(self) -> None:
        self.deleted_at = datetime.utcnow()
        self.touch()

    def restore(self) -> None:
        self.deleted_at = None
        self.touch()

    def touch(self) -> None:
        self.updated_at = datetime.utcnow()

    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, BaseEntity):
            return NotImplemented
        return self.id == other.id

    def __hash__(self) -> int:
        return hash(self.id)
