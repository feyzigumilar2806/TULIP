# ============================================================
# API SUPERADMIN DAN KELOLA AKUN TULIP
# ============================================================

import re

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import status

from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload

from app.auth import get_current_user
from app.database import get_database
from app.models import Branch
from app.models import User
from app.models import UserRole
from app.schemas import AdminBranchResponse
from app.schemas import AdminResetPasswordRequest
from app.schemas import AdminUserCreateRequest
from app.schemas import AdminUserResponse
from app.schemas import AdminUserUpdateRequest
from app.schemas import ChangeMyPasswordRequest
from app.schemas import MessageResponse
from app.security import create_password_hash
from app.security import verify_password


# ============================================================
# PENGATURAN ROUTER
# ============================================================

router = APIRouter(
    prefix="/api/admin",
    tags=["Superadmin"]
)


# ============================================================
# MEMERIKSA HAK AKSES SUPERADMIN
# ============================================================

def require_superadmin(
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
) -> User:

    if (
        current_user.role !=
        UserRole.SUPERADMIN
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Fitur ini hanya dapat digunakan "
                "oleh Superadmin."
            )
        )

    return current_user


# ============================================================
# MEMBUAT RESPONSE DATA AKUN
# ============================================================

def build_admin_user_response(
    user: User
) -> AdminUserResponse:

    return AdminUserResponse(
        id=user.id,
        username=user.username,
        name=user.name,
        role=user.role.value,
        branch_id=user.branch_id,
        branch_name=(
            user.branch.name
            if user.branch
            else None
        ),
        active=user.active
    )


# ============================================================
# VALIDASI USERNAME
# ============================================================

def validate_admin_username(
    username: str
) -> str:

    normalized_username = (
        username
        .strip()
        .lower()
    )

    username_valid = re.fullmatch(
        r"[a-z0-9._-]{4,40}",
        normalized_username
    )

    if username_valid is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Username harus terdiri dari 4–40 karakter "
                "dan hanya boleh menggunakan huruf kecil, "
                "angka, titik, garis bawah, atau tanda minus."
            )
        )

    return normalized_username


# ============================================================
# VALIDASI PASSWORD
# ============================================================

def validate_admin_password(
    password: str
) -> str:

    if (
        len(password) < 8 or
        len(password) > 100
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Password harus terdiri dari "
                "8–100 karakter."
            )
        )

    if not re.search(
        r"[A-Z]",
        password
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Password harus memiliki "
                "minimal satu huruf besar."
            )
        )

    if not re.search(
        r"[a-z]",
        password
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Password harus memiliki "
                "minimal satu huruf kecil."
            )
        )

    if not re.search(
        r"[0-9]",
        password
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Password harus memiliki "
                "minimal satu angka."
            )
        )

    return password


# ============================================================
# VALIDASI ROLE
# ============================================================

def validate_managed_role(
    role: str
) -> UserRole:

    normalized_role = (
        role
        .strip()
        .upper()
    )

    allowed_roles = [
        UserRole.BRANCH_HEAD.value,
        UserRole.HQ.value
    ]

    if (
        normalized_role not in
        allowed_roles
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Role hanya boleh BRANCH_HEAD atau HQ."
            )
        )

    return UserRole(
        normalized_role
    )


# ============================================================
# VALIDASI CABANG
# ============================================================

def validate_managed_branch(
    database: Session,
    role: UserRole,
    branch_id: int | None
) -> Branch | None:

    # Akun Pusat tidak terikat ke cabang tertentu.

    if (
        role ==
        UserRole.HQ
    ):
        return None

    if branch_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Cabang wajib dipilih untuk "
                "akun Kepala Cabang/HO."
            )
        )

    branch = database.scalar(
        select(Branch)
        .where(
            Branch.id ==
            branch_id
        )
    )

    if branch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cabang tidak ditemukan."
        )

    if not branch.active:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Cabang tersebut sudah tidak aktif."
        )

    return branch


# ============================================================
# MELIHAT DAFTAR CABANG
# ============================================================

@router.get(
    "/branches",
    response_model=list[AdminBranchResponse]
)
def get_admin_branches(
    current_admin: Annotated[
        User,
        Depends(require_superadmin)
    ],
    database: Annotated[
        Session,
        Depends(get_database)
    ]
):
    del current_admin

    branches = database.scalars(
        select(Branch)
        .order_by(
            Branch.name.asc()
        )
    ).all()

    return [
        AdminBranchResponse(
            id=branch.id,
            name=branch.name,
            active=branch.active
        )
        for branch in branches
    ]


# ============================================================
# MELIHAT DAFTAR AKUN
# ============================================================

@router.get(
    "/users",
    response_model=list[AdminUserResponse]
)
def get_admin_users(
    current_admin: Annotated[
        User,
        Depends(require_superadmin)
    ],
    database: Annotated[
        Session,
        Depends(get_database)
    ]
):
    del current_admin

    users = database.scalars(
        select(User)
        .options(
            joinedload(User.branch)
        )
        .order_by(
            User.username.asc()
        )
    ).unique().all()

    return [
        build_admin_user_response(
            user
        )
        for user in users
    ]


# ============================================================
# MEMBUAT AKUN BARU
# ============================================================

@router.post(
    "/users",
    response_model=AdminUserResponse,
    status_code=status.HTTP_201_CREATED
)
def create_admin_user(
    request_data: AdminUserCreateRequest,
    current_admin: Annotated[
        User,
        Depends(require_superadmin)
    ],
    database: Annotated[
        Session,
        Depends(get_database)
    ]
):
    del current_admin

    username = validate_admin_username(
        request_data.username
    )

    password = validate_admin_password(
        request_data.password
    )

    name = request_data.name.strip()

    if not name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Nama pengguna wajib diisi."
        )

    role = validate_managed_role(
        request_data.role
    )

    branch = validate_managed_branch(
        database=database,
        role=role,
        branch_id=request_data.branch_id
    )

    existing_user = database.scalar(
        select(User)
        .where(
            func.lower(User.username) ==
            username
        )
    )

    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username sudah digunakan."
        )

    new_user = User(
        username=username,
        password_hash=create_password_hash(
            password
        ),
        name=name,
        role=role,
        branch_id=(
            branch.id
            if branch
            else None
        ),
        active=True
    )

    database.add(
        new_user
    )

    try:
        database.commit()

    except IntegrityError:
        database.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username sudah digunakan."
        )

    database.refresh(
        new_user
    )

    saved_user = database.scalar(
        select(User)
        .options(
            joinedload(User.branch)
        )
        .where(
            User.id ==
            new_user.id
        )
    )

    return build_admin_user_response(
        saved_user
    )


# ============================================================
# MEMPERBARUI AKUN
# ============================================================

@router.put(
    "/users/{user_id}",
    response_model=AdminUserResponse
)
def update_admin_user(
    user_id: UUID,
    request_data: AdminUserUpdateRequest,
    current_admin: Annotated[
        User,
        Depends(require_superadmin)
    ],
    database: Annotated[
        Session,
        Depends(get_database)
    ]
):
    target_user = database.scalar(
        select(User)
        .options(
            joinedload(User.branch)
        )
        .where(
            User.id ==
            user_id
        )
    )

    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Akun tidak ditemukan."
        )

    if (
        target_user.role ==
        UserRole.SUPERADMIN
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Akun Superadmin tidak dapat diubah "
                "melalui daftar akun."
            )
        )

    if (
        target_user.id ==
        current_admin.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Superadmin tidak dapat mengubah "
                "akunnya sendiri dari menu ini."
            )
        )

    name = request_data.name.strip()

    if not name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Nama pengguna wajib diisi."
        )

    role = validate_managed_role(
        request_data.role
    )

    branch = validate_managed_branch(
        database=database,
        role=role,
        branch_id=request_data.branch_id
    )

    target_user.name = name

    target_user.role = role

    target_user.branch_id = (
        branch.id
        if branch
        else None
    )

    target_user.active = (
        request_data.active
    )

    database.commit()

    updated_user = database.scalar(
        select(User)
        .options(
            joinedload(User.branch)
        )
        .where(
            User.id ==
            user_id
        )
    )

    return build_admin_user_response(
        updated_user
    )


# ============================================================
# RESET PASSWORD AKUN
# ============================================================

@router.put(
    "/users/{user_id}/password",
    response_model=MessageResponse
)
def reset_admin_user_password(
    user_id: UUID,
    request_data: AdminResetPasswordRequest,
    current_admin: Annotated[
        User,
        Depends(require_superadmin)
    ],
    database: Annotated[
        Session,
        Depends(get_database)
    ]
):
    target_user = database.scalar(
        select(User)
        .where(
            User.id ==
            user_id
        )
    )

    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Akun tidak ditemukan."
        )

    if (
        target_user.role ==
        UserRole.SUPERADMIN
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Gunakan menu Ganti Password Saya "
                "untuk mengganti password Superadmin."
            )
        )

    if (
        target_user.id ==
        current_admin.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Gunakan menu Ganti Password Saya "
                "untuk mengganti password sendiri."
            )
        )

    password = validate_admin_password(
        request_data.new_password
    )

    target_user.password_hash = (
        create_password_hash(
            password
        )
    )

    database.commit()

    return MessageResponse(
        success=True,
        message=(
            "Password akun berhasil diubah."
        )
    )


# ============================================================
# GANTI PASSWORD SUPERADMIN SENDIRI
# ============================================================

@router.put(
    "/change-my-password",
    response_model=MessageResponse
)
def change_admin_password(
    request_data: ChangeMyPasswordRequest,
    current_admin: Annotated[
        User,
        Depends(require_superadmin)
    ],
    database: Annotated[
        Session,
        Depends(get_database)
    ]
):
    old_password_valid = verify_password(
        request_data.old_password,
        current_admin.password_hash
    )

    if not old_password_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password lama tidak sesuai."
        )

    new_password = validate_admin_password(
        request_data.new_password
    )

    if verify_password(
        new_password,
        current_admin.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Password baru tidak boleh sama "
                "dengan password lama."
            )
        )

    current_admin.password_hash = (
        create_password_hash(
            new_password
        )
    )

    database.commit()

    return MessageResponse(
        success=True,
        message=(
            "Password Superadmin berhasil diubah. "
            "Silakan login kembali."
        )
    )