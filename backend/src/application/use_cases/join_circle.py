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
) -> tuple[str, bool] | None:
    """
    Tham gia Circle qua invite code (6-char suffix của circle UUID).

    Returns:
      - (circle_id, True)  = đã là thành viên (approved) hoặc owner tự join
      - (circle_id, False) = yêu cầu tham gia đã được gửi, chờ duyệt
      - None               = invite code không hợp lệ
    """
    from src.infrastructure.adapters.driven.database import CircleModel

    # Invite code = last 6 of UUID uppercase
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

    # Check if already a member (approved)
    existing = await repo.get_member(circle.id, user_id)
    if existing:
        return str(circle.id), True

    # Owner joining their own circle → auto-approve
    is_owner = str(circle.owner_id) == str(user_id)
    if is_owner:
        from src.domain.entities.circle_member import CircleMember
        member = CircleMember(
            circle_id=circle.id,
            user_id=user_id,
            role="member",
            status="approved",
        )
        await repo.save_member(member)
        return str(circle.id), True

    # Check max members
    member_count = await repo.count_members(circle.id)
    if member_count >= circle.max_members:
        from src.infrastructure.shared.exceptions import AppException
        raise AppException(
            message=f"Nhóm đã đạt giới hạn {circle.max_members} thành viên.",
            code="CIRCLE_FULL",
        )

    # Create pending request
    from src.domain.entities.circle_member import CircleMember
    member = CircleMember(
        circle_id=circle.id,
        user_id=user_id,
        role="member",
        status="pending",
    )
    await repo.save_member(member)
    return str(circle.id), False


def _get_repo(db: AsyncSession) -> CircleRepository:
    from src.infrastructure.adapters.driven.circle_repository_impl import CircleRepositoryImpl
    return CircleRepositoryImpl(db)
