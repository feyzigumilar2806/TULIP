# ============================================================
# API BUKTI PENGGANTIAN TULIP
# ============================================================

import secrets
from datetime import datetime
from datetime import timezone
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter
from fastapi import Depends
from fastapi import File
from fastapi import HTTPException
from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload

from app.auth import get_current_user
from app.config import settings
from app.database import get_database
from app.models import Transaction
from app.models import TransactionStatus
from app.models import User
from app.models import UserRole


# ============================================================
# PENGATURAN ROUTER
# ============================================================

router = APIRouter(
    prefix="/api/proofs",
    tags=["Bukti Transaksi"]
)


# ============================================================
# MEMERIKSA FORMAT FILE
# ============================================================

def detect_file_extension(
    file_header: bytes
) -> str | None:

    if file_header.startswith(
        b"\xff\xd8\xff"
    ):
        return ".jpg"

    if file_header.startswith(
        b"\x89PNG\r\n\x1a\n"
    ):
        return ".png"

    if (
        file_header.startswith(b"RIFF")
        and len(file_header) >= 12
        and file_header[8:12] == b"WEBP"
    ):
        return ".webp"

    if file_header.startswith(
        b"%PDF-"
    ):
        return ".pdf"

    return None


# ============================================================
# MENYIMPAN BUKTI TRANSFER
# ============================================================

def save_transfer_proof(
    uploaded_file: UploadFile,
    transaction_id: str
) -> tuple[str, str]:

    maximum_size = (
        settings.max_file_size_mb
        * 1024
        * 1024
    )

    original_name = Path(
        uploaded_file.filename
        or "bukti-transfer"
    ).name[:500]

    first_chunk = uploaded_file.file.read(
        8192
    )

    if not first_chunk:
        raise HTTPException(
            status_code=400,
            detail=(
                "File bukti transfer "
                "tidak boleh kosong."
            )
        )

    extension = detect_file_extension(
        first_chunk
    )

    if extension is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Bukti transfer harus berupa "
                "JPG, PNG, WEBP, atau PDF."
            )
        )

    current_time = datetime.now(
        timezone.utc
    )

    upload_directory = (
        Path(settings.upload_directory)
        / "transfer"
        / current_time.strftime("%Y")
        / current_time.strftime("%m")
    )

    upload_directory.mkdir(
        parents=True,
        exist_ok=True
    )

    stored_filename = (
        f"{transaction_id}-"
        f"{secrets.token_hex(8)}"
        f"{extension}"
    )

    file_path = (
        upload_directory
        / stored_filename
    )

    total_size = 0

    try:
        with file_path.open("wb") as output_file:
            output_file.write(first_chunk)
            total_size += len(first_chunk)

            while True:
                chunk = uploaded_file.file.read(
                    1024 * 1024
                )

                if not chunk:
                    break

                total_size += len(chunk)

                if total_size > maximum_size:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "Ukuran file maksimal "
                            f"{settings.max_file_size_mb} MB."
                        )
                    )

                output_file.write(chunk)

    except Exception:
        if file_path.exists():
            file_path.unlink()

        raise

    finally:
        uploaded_file.file.close()

    return (
        str(file_path),
        original_name
    )


# ============================================================
# UPLOAD BUKTI TRANSFER
# ============================================================

@router.post(
    "/{transaction_id}/transfer"
)
def upload_transfer_proof(
    transaction_id: str,

    transfer_file: UploadFile = File(...),

    current_user: Annotated[
        User,
        Depends(get_current_user)
    ] = None,

    database: Annotated[
        Session,
        Depends(get_database)
    ] = None
):
    if (
        current_user.role
        != UserRole.BRANCH_HEAD
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "Hanya Kepala Cabang "
                "yang dapat mengunggah "
                "bukti transfer."
            )
        )

    transaction = database.scalar(
        select(Transaction)
        .options(
            joinedload(Transaction.branch)
        )
        .where(
            Transaction.id
            == transaction_id
        )
    )

    if transaction is None:
        raise HTTPException(
            status_code=404,
            detail="Transaksi tidak ditemukan."
        )

    if (
        transaction.branch_id
        != current_user.branch_id
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "Anda tidak memiliki akses "
                "ke transaksi cabang lain."
            )
        )

    old_file_path = (
        transaction.transfer_proof_path
    )

    new_file_path = None

    try:
        (
            new_file_path,
            original_name
        ) = save_transfer_proof(
            transfer_file,
            transaction.id
        )

        transaction.transfer_proof_path = (
            new_file_path
        )

        transaction.transfer_proof_name = (
            original_name
        )

        transaction.transfer_uploaded_at = (
            datetime.now(timezone.utc)
        )

        transaction.transfer_uploaded_by = (
            current_user.id
        )

        transaction.status = (
            TransactionStatus.PAID
        )

        database.commit()
        database.refresh(transaction)

    except Exception:
        database.rollback()

        if new_file_path:
            new_file = Path(
                new_file_path
            )

            if new_file.exists():
                new_file.unlink()

        raise

    if (
        old_file_path
        and old_file_path != new_file_path
    ):
        old_file = Path(
            old_file_path
        )

        if old_file.exists():
            old_file.unlink()

    return {
        "success": True,
        "message": (
            "Bukti transfer berhasil "
            "disimpan."
        ),
        "transaction": {
            "id": transaction.id,
            "branch": transaction.branch.name,
            "employee_name": (
                transaction.employee_name
            ),
            "total_amount": (
                transaction.total_amount
            ),
            "status": (
                transaction.status.value
            ),
            "transfer_proof_name": (
                transaction.transfer_proof_name
            ),
            "transfer_uploaded_at": (
                transaction.transfer_uploaded_at
            ),
            "transfer_uploaded_by": (
                str(
                    transaction.transfer_uploaded_by
                )
            )
        }
    }