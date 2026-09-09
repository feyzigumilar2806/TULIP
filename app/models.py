import enum
import uuid
from datetime import datetime

from sqlalchemy import BigInteger
from sqlalchemy import Boolean
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import ForeignKey
from sqlalchemy import Index
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import func
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship

from app.database import Base


# ============================================================
# ENUM
# ============================================================

class UserRole(str, enum.Enum):
    BRANCH_HEAD = "BRANCH_HEAD"
    HQ = "HQ"
    SUPERADMIN = "SUPERADMIN"


class TransactionStatus(str, enum.Enum):
    PENDING = "MENUNGGU PENGGANTIAN"
    PAID = "SUDAH DIGANTI"


class LoginEvent(str, enum.Enum):
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    FAILED_LOGIN = "FAILED_LOGIN"


# ============================================================
# TABEL CABANG
# ============================================================

class Branch(Base):
    __tablename__ = "branches"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True
    )

    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )

    active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    users: Mapped[list["User"]] = relationship(
        back_populates="branch"
    )

    transactions: Mapped[list["Transaction"]] = relationship(
        back_populates="branch"
    )


# ============================================================
# TABEL PENGGUNA
# ============================================================

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )

    username: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )

    password_hash: Mapped[str] = mapped_column(
        String(500),
        nullable=False
    )

    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False
    )

    role: Mapped[UserRole] = mapped_column(
        Enum(
            UserRole,
            name="user_role_enum"
        ),
        nullable=False
    )

    branch_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "branches.id",
            ondelete="RESTRICT"
        ),
        nullable=True,
        index=True
    )

    active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )

    branch: Mapped["Branch | None"] = relationship(
        back_populates="users"
    )

    login_history: Mapped[list["LoginHistory"]] = relationship(
        back_populates="user"
    )


# ============================================================
# TABEL TRANSAKSI
# ============================================================

class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(
        String(50),
        primary_key=True
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True
    )

    branch_id: Mapped[int] = mapped_column(
        ForeignKey(
            "branches.id",
            ondelete="RESTRICT"
        ),
        nullable=False,
        index=True
    )

    employee_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        index=True
    )

    employee_nik: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True
    )

    unit: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    operation_subunit: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    qty100: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0"
    )

    qty200: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0"
    )

    qty500: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0"
    )

    qty1000: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0"
    )

    total_amount: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False
    )

    handover_proof_path: Mapped[str] = mapped_column(
        String(1000),
        nullable=False
    )

    handover_proof_name: Mapped[str] = mapped_column(
        String(500),
        nullable=False
    )

    status: Mapped[TransactionStatus] = mapped_column(
        Enum(
            TransactionStatus,
            name="transaction_status_enum"
        ),
        nullable=False,
        default=TransactionStatus.PENDING,
        server_default=TransactionStatus.PENDING.name
    )

    transfer_proof_path: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True
    )

    transfer_proof_name: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )

    transfer_uploaded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    transfer_uploaded_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )

    branch: Mapped["Branch"] = relationship(
        back_populates="transactions"
    )

    transfer_uploader: Mapped["User | None"] = relationship(
        foreign_keys=[transfer_uploaded_by]
    )

    __table_args__ = (
        Index(
            "ix_transactions_branch_timestamp",
            "branch_id",
            "timestamp"
        ),
        Index(
            "ix_transactions_branch_status",
            "branch_id",
            "status"
        ),
    )


# ============================================================
# TABEL RIWAYAT LOGIN
# ============================================================

class LoginHistory(Base):
    __tablename__ = "login_history"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True
    )

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True,
        index=True
    )

    event: Mapped[LoginEvent] = mapped_column(
        Enum(
            LoginEvent,
            name="login_event_enum"
        ),
        nullable=False
    )

    username: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    ip_address: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    user_agent: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    user: Mapped["User | None"] = relationship(
        back_populates="login_history"
    )