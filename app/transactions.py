# ============================================================
# API TRANSAKSI PENYERAHAN UANG LOGAM
# ============================================================

import secrets

from datetime import datetime
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter
from fastapi import Depends
from fastapi import File
from fastapi import Form
from fastapi import HTTPException
from fastapi import UploadFile

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.constants import OPERATION_SUBUNITS
from app.constants import WORK_UNITS
from app.database import get_database
from app.models import Branch
from app.models import Transaction
from app.models import TransactionStatus
from app.models import User
from app.models import UserRole


# ============================================================
# PENGATURAN ROUTER
# ============================================================

router = APIRouter(
    prefix="/api/transactions",
    tags=["Transaksi"]
)


# ============================================================
# MEMERIKSA JENIS FOTO
# ============================================================

def detect_image_extension(
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

    return None


# ============================================================
# MEMBUAT NOMOR TRANSAKSI
# ============================================================

def generate_transaction_id(
    database: Session
) -> str:

    date_code = datetime.now().strftime(
        "%Y%m%d"
    )

    for _ in range(10):
        random_code = secrets.token_hex(
            3
        ).upper()

        transaction_id = (
            f"TULIP-{date_code}-{random_code}"
        )

        existing_transaction = database.scalar(
            select(Transaction.id).where(
                Transaction.id == transaction_id
            )
        )

        if existing_transaction is None:
            return transaction_id

    raise HTTPException(
        status_code=500,
        detail=(
            "Gagal membuat nomor transaksi. "
            "Silakan coba kembali."
        )
    )


# ============================================================
# MEMERIKSA LOKASI FILE
# ============================================================

def get_safe_upload_path(
    stored_path: str
) -> Path | None:

    upload_root = Path(
        settings.upload_directory
    ).resolve()

    file_path = Path(
        stored_path
    ).resolve()

    try:
        file_path.relative_to(
            upload_root
        )

    except ValueError:
        return None

    return file_path


# ============================================================
# MENGHAPUS FILE TRANSAKSI
# ============================================================

def delete_transaction_file(
    stored_path: str | None
) -> None:

    if not stored_path:
        return

    file_path = get_safe_upload_path(
        stored_path
    )

    if file_path is None:
        return

    if file_path.is_file():
        try:
            file_path.unlink()

        except OSError:
            # Data transaksi sudah berhasil dihapus.
            # Kegagalan membersihkan file tidak boleh
            # menyebabkan transaksi muncul kembali.
            pass


# ============================================================
# MENYIMPAN FOTO PENYERAHAN
# ============================================================

def save_handover_photo(
    photo: UploadFile,
    transaction_id: str
) -> tuple[str, str]:

    maximum_size = (
        settings.max_file_size_mb
        * 1024
        * 1024
    )

    original_name = Path(
        photo.filename or "bukti"
    ).name[:500]

    first_chunk = photo.file.read(
        8192
    )

    if not first_chunk:
        raise HTTPException(
            status_code=400,
            detail=(
                "Foto bukti tidak boleh kosong."
            )
        )

    extension = detect_image_extension(
        first_chunk
    )

    if extension is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Bukti harus berupa foto "
                "JPG, PNG, atau WEBP."
            )
        )

    upload_directory = (
        Path(settings.upload_directory)
        / "handover"
        / datetime.now().strftime("%Y")
        / datetime.now().strftime("%m")
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
        with file_path.open(
            "wb"
        ) as output_file:

            output_file.write(
                first_chunk
            )

            total_size += len(
                first_chunk
            )

            while True:
                chunk = photo.file.read(
                    1024 * 1024
                )

                if not chunk:
                    break

                total_size += len(
                    chunk
                )

                if (
                    total_size
                    > maximum_size
                ):
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "Ukuran foto maksimal "
                            f"{settings.max_file_size_mb} MB."
                        )
                    )

                output_file.write(
                    chunk
                )

    except Exception:
        if file_path.exists():
            file_path.unlink()

        raise

    finally:
        photo.file.close()

    return (
        str(file_path),
        original_name
    )


# ============================================================
# MENYIMPAN TRANSAKSI KARYAWAN
# ============================================================

@router.post(
    "/handover",
    status_code=201
)
def create_handover(
    branch_id: int = Form(...),

    employee_name: str = Form(...),

    employee_nik: str = Form(...),

    unit: str = Form(...),

    qty100: int = Form(
        0,
        ge=0
    ),

    qty200: int = Form(
        0,
        ge=0
    ),

    qty500: int = Form(
        0,
        ge=0
    ),

    qty1000: int = Form(
        0,
        ge=0
    ),

    operation_subunit: str | None = Form(
        None
    ),

    notes: str | None = Form(
        None
    ),

    handover_photo: UploadFile = File(...),

    database: Session = Depends(
        get_database
    )
):
    employee_name = (
        employee_name.strip()
    )

    employee_nik = (
        employee_nik.strip()
    )

    unit = unit.strip()

    operation_subunit = (
        operation_subunit.strip()
        if operation_subunit
        else None
    )

    notes = (
        notes.strip()
        if notes
        else None
    )

    if not employee_name:
        raise HTTPException(
            status_code=400,
            detail=(
                "Nama karyawan wajib diisi."
            )
        )

    if len(employee_name) > 200:
        raise HTTPException(
            status_code=400,
            detail=(
                "Nama karyawan terlalu panjang."
            )
        )

    if not employee_nik:
        raise HTTPException(
            status_code=400,
            detail="NIK wajib diisi."
        )

    if len(employee_nik) > 100:
        raise HTTPException(
            status_code=400,
            detail="NIK terlalu panjang."
        )

    branch = database.scalar(
        select(Branch).where(
            Branch.id == branch_id,
            Branch.active.is_(True)
        )
    )

    if branch is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Lokasi atau cabang "
                "tidak valid."
            )
        )

    if unit not in WORK_UNITS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unit kerja tidak valid."
            )
        )

    if unit == "Operation":
        if (
            operation_subunit
            not in OPERATION_SUBUNITS
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Sub-unit Operation "
                    "wajib dipilih."
                )
            )

    else:
        operation_subunit = None

    total_amount = (
        qty100 * 100
        + qty200 * 200
        + qty500 * 500
        + qty1000 * 1000
    )

    if total_amount <= 0:
        raise HTTPException(
            status_code=400,
            detail=(
                "Masukkan minimal satu "
                "pecahan uang logam."
            )
        )

    transaction_id = (
        generate_transaction_id(
            database
        )
    )

    photo_path = None

    try:
        (
            photo_path,
            original_name
        ) = save_handover_photo(
            handover_photo,
            transaction_id
        )

        transaction = Transaction(
            id=transaction_id,
            branch_id=branch.id,
            employee_name=employee_name,
            employee_nik=employee_nik,
            unit=unit,
            operation_subunit=(
                operation_subunit
            ),
            qty100=qty100,
            qty200=qty200,
            qty500=qty500,
            qty1000=qty1000,
            total_amount=total_amount,
            handover_proof_path=(
                photo_path
            ),
            handover_proof_name=(
                original_name
            ),
            status=(
                TransactionStatus.PENDING
            ),
            notes=notes
        )

        database.add(
            transaction
        )

        database.commit()
        database.refresh(
            transaction
        )

    except Exception:
        database.rollback()

        if photo_path:
            saved_file = Path(
                photo_path
            )

            if saved_file.exists():
                saved_file.unlink()

        raise

    return {
        "success": True,
        "message": (
            "Penyerahan uang logam "
            "berhasil disimpan."
        ),
        "transaction": {
            "id": transaction.id,

            "timestamp": (
                transaction.timestamp
            ),

            "branch": branch.name,

            "employee_name": (
                transaction.employee_name
            ),

            "employee_nik": (
                transaction.employee_nik
            ),

            "unit": (
                transaction.unit
            ),

            "operation_subunit": (
                transaction.operation_subunit
            ),

            "qty100": (
                transaction.qty100
            ),

            "qty200": (
                transaction.qty200
            ),

            "qty500": (
                transaction.qty500
            ),

            "qty1000": (
                transaction.qty1000
            ),

            "total_amount": (
                transaction.total_amount
            ),

            "status": (
                transaction.status.value
            )
        }
    }


# ============================================================
# MENGHAPUS TRANSAKSI
# HANYA PUSAT DAN SUPERADMIN
# ============================================================

@router.delete(
    "/{transaction_id}"
)
def delete_transaction(
    transaction_id: str,

    current_user: Annotated[
        User,
        Depends(get_current_user)
    ],

    database: Annotated[
        Session,
        Depends(get_database)
    ]
):
    if current_user.role not in (
        UserRole.HQ,
        UserRole.SUPERADMIN
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "Hanya Pusat dan Superadmin "
                "yang dapat menghapus transaksi."
            )
        )

    transaction = database.scalar(
        select(Transaction).where(
            Transaction.id
            == transaction_id
        )
    )

    if transaction is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Transaksi tidak ditemukan."
            )
        )

    handover_file_path = (
        transaction.handover_proof_path
    )

    transfer_file_path = (
        transaction.transfer_proof_path
    )

    try:
        database.delete(
            transaction
        )

        database.commit()

    except Exception:
        database.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Transaksi gagal dihapus. "
                "Silakan coba kembali."
            )
        )

    delete_transaction_file(
        handover_file_path
    )

    delete_transaction_file(
        transfer_file_path
    )

    return {
        "success": True,
        "message": (
            f"Transaksi {transaction_id} "
            "berhasil dihapus."
        )
    }