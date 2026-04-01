"""
Unit tests for BaseEntity.
Tests domain logic without any framework dependencies.
"""
import pytest
from datetime import datetime
from uuid import uuid4

from src.domain.entities.base import BaseEntity


class ConcreteEntity(BaseEntity):
    """Concrete implementation of BaseEntity for testing."""

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.name: str = kwargs.get("name", "test")


class TestBaseEntity:
    """Test suite for BaseEntity."""

    def test_creates_with_uuid(self):
        """Entity should have a UUID when created."""
        entity = ConcreteEntity()
        assert entity.id is not None
        assert str(entity.id)  # Should be a valid UUID string

    def test_creates_with_timestamp(self):
        """Entity should have created_at and updated_at timestamps."""
        entity = ConcreteEntity()
        assert entity.created_at is not None
        assert entity.updated_at is not None
        assert isinstance(entity.created_at, datetime)

    def test_soft_delete_sets_deleted_at(self):
        """soft_delete() should set deleted_at to current time."""
        entity = ConcreteEntity()
        assert entity.deleted_at is None

        entity.soft_delete()

        assert entity.deleted_at is not None
        assert isinstance(entity.deleted_at, datetime)

    def test_is_deleted_returns_true_after_soft_delete(self):
        """is_deleted() should return True after soft_delete()."""
        entity = ConcreteEntity()
        assert entity.is_deleted() is False

        entity.soft_delete()

        assert entity.is_deleted() is True

    def test_restore_clears_deleted_at(self):
        """restore() should clear deleted_at."""
        entity = ConcreteEntity()
        entity.soft_delete()
        assert entity.is_deleted() is True

        entity.restore()

        assert entity.deleted_at is None
        assert entity.is_deleted() is False

    def test_touch_updates_updated_at(self):
        """touch() should update the updated_at timestamp."""
        entity = ConcreteEntity()
        original_updated_at = entity.updated_at

        entity.touch()

        assert entity.updated_at >= original_updated_at

    def test_equality_by_id(self):
        """Two entities with the same ID should be equal."""
        shared_id = uuid4()
        entity1 = ConcreteEntity(id=shared_id)
        entity2 = ConcreteEntity(id=shared_id)

        assert entity1 == entity2
        assert hash(entity1) == hash(entity2)

    def test_inequality_by_id(self):
        """Two entities with different IDs should not be equal."""
        entity1 = ConcreteEntity()
        entity2 = ConcreteEntity()

        assert entity1 != entity2

    def test_equality_with_non_entity_returns_not_implemented(self):
        """Equality with non-entity should return NotImplemented."""
        entity = ConcreteEntity()
        result = entity.__eq__("not an entity")
        assert result is NotImplemented
