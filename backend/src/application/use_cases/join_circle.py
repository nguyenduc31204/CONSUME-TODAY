"""
JoinCircleUseCase — Tham gia Circle qua invite code.
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select

from src.domain.repositories.circle_repository import CircleRepository


async def join_circle(
    db: AsyncSession,
    invite_code: str,
    user_id: UUID,
) -> str | None:
    """
    Tham gia Circle qua invite code (6-char suffix của circle UUID).
    Trả về circle_id nếu thành công.
    """
    from src.infrastructure.adapters.driven.database import CircleModel

    # Invite code = last 6 of UUID uppercase
    invite_code_lower = invite_code.lower()

    # Find circle where last 6 of id matches
    stmt = select(CircleModel).where(
        CircleModel.deleted_at.is_(None)
    )
    result = await db.execute(stmt)
    circle = None
    for c in result.scalars().all():
        if str(c.id)[-6:].upper() == invite_code.upper():
            circle = c
            break

    if not circle:
        return None

    repo: CircleRepository = _get_repo(db)

    # Check if already a member
    existing = await repo.get_member(circle.id, user_id)
    if existing:
        return str(circle.id)

    # Check max members
    member_count = await repo.count_members(circle.id)
    if member_count >= circle.max_members:
        from src.infrastructure.shared.exceptions import AppException
        raise AppException(
            message=f"Nhóm đã đạt giới hạn {circle.max_members} thành viên.",
            code="CIRCLE_FULL",
        )

    # Add as member
    from src.domain.entities.circle_member import CircleMember
    member = CircleMember(
        circle_id=circle.id,
        user_id=user_id,
        role="member",
    )
    await repo.save_member(member)
    return str(circle.id)


def _get_repo(db: AsyncSession) -> CircleRepository:
    from src.infrastructure.adapters.driven.circle_repository_impl import CircleRepositoryImpl
    return CircleRepositoryImpl(db)
