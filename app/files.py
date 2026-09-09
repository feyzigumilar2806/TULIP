# ============================================================
# API MELIHAT DAN MENGUNDUH BUKTI
# ============================================================

import mimetypes
from pathlib import Path
from typing import Annotated
from typing import Literal

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.database import get_database
from app.models import Transaction
from app.models import User
from app.models import UserRole


# ============================================================
# PENGATURAN ROUTER
# ============================================================

router = APIRouter(
    prefix="/api/files",
    tags=["Lihat dan Download Bukti"]
)


# ============================================================
# MEMERIKSA AKSES TRANSAKSI
# ============================================================

def get_accessible_transaction(
    transaction_id: str,
    current_user: User,
    database: Session
) -> Transaction:

    transaction = database.scalar(
        select(Transaction).where(
            Transaction.id == transaction_id
        )
    )

    if transaction is None:
        raise HTTPException(
            status_code=404,
            detail="Transaksi tidak ditemukan."
        )

    if (
        current_user.role
        == UserRole.BRANCH_HEAD
        and transaction.branch_id
        != current_user.branch_id
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "Anda tidak memiliki akses "
                "ke transaksi cabang lain."
            )
        )

    return transaction


# ============================================================
# MEMERIKSA KEAMANAN LOKASI FILE
# ============================================================

def validate_file_path(
    stored_path: str
) -> Path:

    upload_root = Path(
        settings.upload_directory
    ).resolve()

    file_path = Path(
        stored_path
    ).resolve()

    if not file_path.is_relative_to(
        upload_root
    ):
        raise HTTPException(
            status_code=403,
            detail="Lokasi file tidak valid."
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="File bukti tidak ditemukan."
        )

    return file_path


# ============================================================
# MELIHAT ATAU MENGUNDUH BUKTI
# ============================================================

@router.get(
    "/{transaction_id}/{proof_type}"
)
def get_proof_file(
    transaction_id: str,

    proof_type: Literal[
        "handover",
        "transfer"
    ],

    current_user: Annotated[
        User,
        Depends(get_current_user)
    ],

    database: Annotated[
        Session,
        Depends(get_database)
    ],

    download: bool = Query(
        default=False
    )
):
    transaction = get_accessible_transaction(
        transaction_id,
        current_user,
        database
    )

    if proof_type == "handover":
        stored_path = (
            transaction.handover_proof_path
        )

        original_name = (
            transaction.handover_proof_name
        )

    else:
        stored_path = (
            transaction.transfer_proof_path
        )

        original_name = (
            transaction.transfer_proof_name
        )

    if not stored_path or not original_name:
        raise HTTPException(
            status_code=404,
            detail=(
                "Bukti tersebut belum tersedia."
            )
        )

    file_path = validate_file_path(
        stored_path
    )

    media_type = (
        mimetypes.guess_type(
            original_name
        )[0]
        or "application/octet-stream"
    )

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=original_name,
        content_disposition_type=(
            "attachment"
            if download
            else "inline"
        )
    )