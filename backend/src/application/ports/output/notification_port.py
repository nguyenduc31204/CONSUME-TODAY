"""
NotificationPort — Output port for notifications (future use).
"""

from typing import Protocol


class NotificationPort(Protocol):
    """Output port for sending notifications (email, push, etc.)."""

    async def send_email(self, to: str, subject: str, body: str) -> None: ...

    async def send_push(self, user_id: str, title: str, body: str) -> None: ...
