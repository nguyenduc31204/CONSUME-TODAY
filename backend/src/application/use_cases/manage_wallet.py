"""
ManageWalletUseCase — Create, update, delete wallets.
"""
from uuid import UUID

from src.domain.entities.wallet import Wallet
from src.domain.repositories.wallet_repository import WalletRepository


class ManageWalletUseCase:
    """
    Use case for managing user wallets.
    """

    def __init__(self, wallet_repo: WalletRepository) -> None:
        self._repo = wallet_repo

    async def create_wallet(
        self,
        user_id: UUID,
        name: str,
        *,
        description: str | None = None,
        color: str = "#9333EA",
        icon: str = "wallet",
        is_default: bool = False,
    ) -> Wallet:
        """Create a new wallet for a user."""
        wallet = Wallet(
            user_id=user_id,
            name=name.strip(),
            description=description,
            color=color,
            icon=icon,
            is_default=is_default,
        )
        return await self._repo.save(wallet)

    async def list_wallets(self, user_id: UUID) -> list[Wallet]:
        """List all wallets for a user."""
        return await self._repo.get_by_user_id(user_id)

    async def get_wallet(self, wallet_id: UUID) -> Wallet:
        """Get a single wallet."""
        wallet = await self._repo.get_by_id(wallet_id)
        if not wallet:
            raise ValueError("Wallet not found")
        return wallet

    async def get_default_wallet(self, user_id: UUID) -> Wallet:
        """Get the user's default wallet."""
        wallet = await self._repo.get_default(user_id)
        if not wallet:
            raise ValueError("No default wallet found")
        return wallet

    async def update_wallet(
        self,
        wallet_id: UUID,
        *,
        name: str | None = None,
        color: str | None = None,
        description: str | None = None,
    ) -> Wallet:
        """Update a wallet."""
        wallet = await self._repo.get_by_id(wallet_id)
        if not wallet:
            raise ValueError("Wallet not found")

        if name is not None:
            wallet.rename(name)
        if color is not None:
            wallet.update_color(color)
        if description is not None:
            wallet.description = description
            wallet.touch()

        return await self._repo.update(wallet)

    async def set_default(self, wallet_id: UUID, user_id: UUID) -> Wallet:
        """Set a wallet as the user's default."""
        wallet = await self._repo.get_by_id(wallet_id)
        if not wallet:
            raise ValueError("Wallet not found")

        # Unset current default
        current_default = await self._repo.get_default(user_id)
        if current_default and current_default.id != wallet_id:
            current_default.unset_default()
            await self._repo.update(current_default)

        wallet.set_default()
        return await self._repo.update(wallet)

    async def soft_delete_wallet(self, wallet_id: UUID) -> None:
        """Soft-delete a wallet."""
        await self._repo.soft_delete(wallet_id)
