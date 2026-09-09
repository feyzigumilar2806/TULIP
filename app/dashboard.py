# ============================================================
# API DASHBOARD TULIP
# ============================================================

from datetime import date
from datetime import datetime
from datetime import time
from datetime import timezone
from typing import Annotated
from zoneinfo import ZoneInfo

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload

from app.auth import get_current_user
from app.database import get_database
from app.models import Transaction
from app.models import TransactionStatus
from app.models import User
from app.models import UserRole


# ============================================================
# PENGATURAN ROUTER
# ============================================================

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"]
)

JAKARTA_TIMEZONE = ZoneInfo(
    "Asia/Jakarta"
)


# ============================================================
# MENGUBAH TANGGAL FILTER KE UTC
# ============================================================

def start_of_date(
    selected_date: date
) -> datetime:

    local_time = datetime.combine(
        selected_date,
        time.min,
        tzinfo=JAKARTA_TIMEZONE
    )

    return local_time.astimezone(
        timezone.utc
    )


def end_of_date(
    selected_date: date
) -> datetime:

    local_time = datetime.combine(
        selected_date,
        time.max,
        tzinfo=JAKARTA_TIMEZONE
    )

    return local_time.astimezone(
        timezone.utc
    )


# ============================================================
# MEMBUAT DATA TRANSAKSI
# ============================================================

def serialize_transaction(
    transaction: Transaction
) -> dict:

    return {
        "id": transaction.id,

        "timestamp":
            transaction.timestamp,

        "branch_id":
            transaction.branch_id,

        "branch": (
            transaction.branch.name
            if transaction.branch
            else None
        ),

        "employee_name":
            transaction.employee_name,

        "employee_nik":
            transaction.employee_nik,

        "unit":
            transaction.unit,

        "operation_subunit":
            transaction.operation_subunit,

        "qty100":
            transaction.qty100,

        "qty200":
            transaction.qty200,

        "qty500":
            transaction.qty500,

        "qty1000":
            transaction.qty1000,

        "total_amount":
            transaction.total_amount,

        "status":
            transaction.status.value,

        "has_handover_proof":
            bool(
                transaction.handover_proof_path
            ),

        "has_transfer_proof":
            bool(
                transaction.transfer_proof_path
            ),

        "notes":
            transaction.notes,
    }


# ============================================================
# MENGAMBIL DATA DASHBOARD
# ============================================================

@router.get("")
def get_dashboard(
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ],

    database: Annotated[
        Session,
        Depends(get_database)
    ],

    start_date: date | None = Query(
        default=None
    ),

    end_date: date | None = Query(
        default=None
    ),

    employee_name: str | None = Query(
        default=None,
        max_length=200
    ),

    branch_id: int | None = Query(
        default=None
    )
):
    # Memeriksa urutan tanggal.

    if (
        start_date
        and end_date
        and start_date > end_date
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Tanggal mulai tidak boleh "
                "melewati tanggal akhir."
            )
        )

    query = (
        select(Transaction)
        .options(
            joinedload(
                Transaction.branch
            )
        )
        .order_by(
            Transaction.timestamp.desc()
        )
    )

    # ========================================================
    # HAK AKSES KEPALA CABANG
    # Kepala Cabang selalu dibatasi ke cabangnya sendiri.
    # Parameter branch_id dari browser tidak digunakan.
    # ========================================================

    if (
        current_user.role
        == UserRole.BRANCH_HEAD
    ):
        if current_user.branch_id is None:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Akun tidak memiliki "
                    "akses cabang."
                )
            )

        query = query.where(
            Transaction.branch_id
            == current_user.branch_id
        )

    # ========================================================
    # HAK AKSES PUSAT DAN SUPERADMIN
    # Keduanya dapat melihat semua cabang atau memilih cabang.
    # ========================================================

    elif current_user.role in (
        UserRole.HQ,
        UserRole.SUPERADMIN
    ):
        if branch_id is not None:
            query = query.where(
                Transaction.branch_id
                == branch_id
            )

    # Menolak role lain yang tidak dikenal.

    else:
        raise HTTPException(
            status_code=403,
            detail=(
                "Akun tidak memiliki akses "
                "ke dashboard."
            )
        )

    # ========================================================
    # FILTER TANGGAL
    # ========================================================

    if start_date is not None:
        query = query.where(
            Transaction.timestamp
            >= start_of_date(
                start_date
            )
        )

    if end_date is not None:
        query = query.where(
            Transaction.timestamp
            <= end_of_date(
                end_date
            )
        )

    # ========================================================
    # FILTER NAMA KARYAWAN
    # ========================================================

    if employee_name:
        search_name = (
            employee_name.strip()
        )

        if search_name:
            query = query.where(
                Transaction.employee_name.ilike(
                    f"%{search_name}%"
                )
            )

    transactions = list(
        database.scalars(
            query
        ).unique().all()
    )

    # ========================================================
    # RINGKASAN NOMINAL
    # ========================================================

    total_amount = sum(
        transaction.total_amount
        for transaction in transactions
    )

    paid_amount = sum(
        transaction.total_amount
        for transaction in transactions
        if (
            transaction.status
            == TransactionStatus.PAID
        )
    )

    pending_amount = (
        total_amount
        - paid_amount
    )

    # ========================================================
    # RINGKASAN PECAHAN
    # ========================================================

    denomination = {
        "qty100": sum(
            transaction.qty100
            for transaction in transactions
        ),

        "qty200": sum(
            transaction.qty200
            for transaction in transactions
        ),

        "qty500": sum(
            transaction.qty500
            for transaction in transactions
        ),

        "qty1000": sum(
            transaction.qty1000
            for transaction in transactions
        ),
    }

    denomination["amount100"] = (
        denomination["qty100"]
        * 100
    )

    denomination["amount200"] = (
        denomination["qty200"]
        * 200
    )

    denomination["amount500"] = (
        denomination["qty500"]
        * 500
    )

    denomination["amount1000"] = (
        denomination["qty1000"]
        * 1000
    )

    # ========================================================
    # RESPONSE DASHBOARD
    # ========================================================

    return {
        "user": {
            "username":
                current_user.username,

            "name":
                current_user.name,

            "role":
                current_user.role.value,

            "branch_id":
                current_user.branch_id,

            "branch": (
                current_user.branch.name
                if current_user.branch
                else None
            )
        },

        "summary": {
            "transaction_count":
                len(transactions),

            "total_amount":
                total_amount,

            "paid_amount":
                paid_amount,

            "pending_amount":
                pending_amount,
        },

        "denomination":
            denomination,

        "transactions": [
            serialize_transaction(
                transaction
            )
            for transaction in transactions
        ]
    }