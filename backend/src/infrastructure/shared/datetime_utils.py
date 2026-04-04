"""
Shared datetime utilities — ensures naive UTC datetimes for PostgreSQL compatibility.

PostgreSQL uses TIMESTAMP WITHOUT TIME ZONE (naive datetimes).
All entities store timezone-aware UTC datetimes for correct JSON serialization.
This module provides helpers to convert between the two.
"""

from datetime import datetime


def utc_now() -> datetime:
    """Return current UTC time as naive datetime for DB storage."""
    from datetime import timezone
    return datetime.now(timezone.utc).replace(tzinfo=None)


def to_naive(dt: datetime | None) -> datetime | None:
    """Strip timezone info (UTC-aware → naive). Safe for DB storage."""
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.replace(tzinfo=None)
    return dt
