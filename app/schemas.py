# ============================================================
# FORMAT DATA API TULIP
# ============================================================

from uuid import UUID

from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import Field


# ============================================================
# DATA LOGIN YANG DIKIRIM PENGGUNA
# ============================================================

class LoginRequest(BaseModel):
    username: str = Field(
        min_length=3,
        max_length=100
    )

    password: str = Field(
        min_length=6,
        max_length=200
    )


# ============================================================
# DATA PENGGUNA YANG DIKIRIM KE WEBSITE
# ============================================================

class UserResponse(BaseModel):
    id: UUID
    username: str
    name: str
    role: str
    branch_id: int | None = None
    branch_name: str | None = None

    model_config = ConfigDict(
        from_attributes=True
    )


# ============================================================
# HASIL LOGIN
# ============================================================

class LoginResponse(BaseModel):
    access_token: str

    token_type: str = "bearer"

    user: UserResponse


# ============================================================
# PESAN UMUM
# ============================================================

class MessageResponse(BaseModel):
    success: bool

    message: str


# ============================================================
# DATA CABANG UNTUK KELOLA AKUN
# ============================================================

class AdminBranchResponse(BaseModel):
    id: int

    name: str

    active: bool

    model_config = ConfigDict(
        from_attributes=True
    )


# ============================================================
# DATA AKUN UNTUK DAFTAR SUPERADMIN
# ============================================================

class AdminUserResponse(BaseModel):
    id: UUID

    username: str

    name: str

    role: str

    branch_id: int | None = None

    branch_name: str | None = None

    active: bool

    model_config = ConfigDict(
        from_attributes=True
    )


# ============================================================
# FORM MEMBUAT AKUN BARU
# ============================================================

class AdminUserCreateRequest(BaseModel):
    username: str = Field(
        min_length=4,
        max_length=40
    )

    password: str = Field(
        min_length=8,
        max_length=100
    )

    name: str = Field(
        min_length=1,
        max_length=200
    )

    role: str = Field(
        min_length=2,
        max_length=50
    )

    branch_id: int | None = Field(
        default=None,
        ge=1
    )


# ============================================================
# FORM MEMPERBARUI AKUN
# ============================================================

class AdminUserUpdateRequest(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=200
    )

    role: str = Field(
        min_length=2,
        max_length=50
    )

    branch_id: int | None = Field(
        default=None,
        ge=1
    )

    active: bool


# ============================================================
# FORM RESET PASSWORD AKUN
# ============================================================

class AdminResetPasswordRequest(BaseModel):
    new_password: str = Field(
        min_length=8,
        max_length=100
    )


# ============================================================
# FORM GANTI PASSWORD SENDIRI
# ============================================================

class ChangeMyPasswordRequest(BaseModel):
    old_password: str = Field(
        min_length=1,
        max_length=200
    )

    new_password: str = Field(
        min_length=8,
        max_length=100
    )