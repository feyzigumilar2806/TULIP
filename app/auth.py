# ============================================================
# API LOGIN DAN KEAMANAN AKSES TULIP
# ============================================================

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Request
from fastapi import status
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.security import HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload

from app.database import get_database
from app.models import LoginEvent
from app.models import LoginHistory
from app.models import User
from app.schemas import LoginRequest
from app.schemas import LoginResponse
from app.schemas import MessageResponse
from app.schemas import UserResponse
from app.security import create_access_token
from app.security import decode_access_token
from app.security import verify_password


# ============================================================
# PENGATURAN ROUTER
# ============================================================

router = APIRouter(
    prefix="/api/auth",
    tags=["Login"]
)

bearer_scheme = HTTPBearer(
    auto_error=False
)


# ============================================================
# MENGAMBIL INFORMASI PERANGKAT
# ============================================================

def get_request_information(
    request: Request
) -> tuple[str | None, str | None]:

    ip_address = (
        request.client.host
        if request.client
        else None
    )

    user_agent = request.headers.get(
        "user-agent"
    )

    return ip_address, user_agent


# ============================================================
# MEMBUAT DATA PENGGUNA UNTUK RESPONSE
# ============================================================

def build_user_response(
    user: User
) -> UserResponse:

    return UserResponse(
        id=user.id,
        username=user.username,
        name=user.name,
        role=user.role.value,
        branch_id=user.branch_id,
        branch_name=(
            user.branch.name
            if user.branch
            else None
        )
    )


# ============================================================
# MEMERIKSA TOKEN DAN MENGAMBIL PENGGUNA AKTIF
# ============================================================

def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme)
    ],
    database: Annotated[
        Session,
        Depends(get_database)
    ]
) -> User:

    authentication_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sesi login tidak valid atau sudah berakhir.",
        headers={
            "WWW-Authenticate": "Bearer"
        }
    )

    if credentials is None:
        raise authentication_error

    if credentials.scheme.lower() != "bearer":
        raise authentication_error

    token_data = decode_access_token(
        credentials.credentials
    )

    if token_data is None:
        raise authentication_error

    user_id = token_data.get("sub")

    if not user_id:
        raise authentication_error

    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise authentication_error

    user = database.scalar(
        select(User)
        .options(
            joinedload(User.branch)
        )
        .where(
            User.id == user_uuid
        )
    )

    if user is None or not user.active:
        raise authentication_error

    return user


# ============================================================
# LOGIN
# ============================================================

@router.post(
    "/login",
    response_model=LoginResponse
)
def login(
    login_data: LoginRequest,
    request: Request,
    database: Annotated[
        Session,
        Depends(get_database)
    ]
):
    username = login_data.username.strip().lower()

    ip_address, user_agent = (
        get_request_information(request)
    )

    user = database.scalar(
        select(User)
        .options(
            joinedload(User.branch)
        )
        .where(
            User.username == username
        )
    )

    password_valid = (
        user is not None
        and verify_password(
            login_data.password,
            user.password_hash
        )
    )

    if not password_valid:
        database.add(
            LoginHistory(
                user_id=(
                    user.id
                    if user
                    else None
                ),
                event=LoginEvent.FAILED_LOGIN,
                username=username,
                ip_address=ip_address,
                user_agent=user_agent,
                notes="Username atau password salah."
            )
        )

        database.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau password salah."
        )

    if not user.active:
        database.add(
            LoginHistory(
                user_id=user.id,
                event=LoginEvent.FAILED_LOGIN,
                username=username,
                ip_address=ip_address,
                user_agent=user_agent,
                notes="Akun tidak aktif."
            )
        )

        database.commit()

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun ini sudah tidak aktif."
        )

    access_token = create_access_token(
        user_id=str(user.id),
        username=user.username,
        role=user.role.value
    )

    database.add(
        LoginHistory(
            user_id=user.id,
            event=LoginEvent.LOGIN,
            username=user.username,
            ip_address=ip_address,
            user_agent=user_agent,
            notes="Login berhasil."
        )
    )

    database.commit()

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=build_user_response(user)
    )


# ============================================================
# MELIHAT AKUN YANG SEDANG LOGIN
# ============================================================

@router.get(
    "/me",
    response_model=UserResponse
)
def get_my_account(
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return build_user_response(
        current_user
    )


# ============================================================
# LOGOUT
# ============================================================

@router.post(
    "/logout",
    response_model=MessageResponse
)
def logout(
    request: Request,
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ],
    database: Annotated[
        Session,
        Depends(get_database)
    ]
):
    ip_address, user_agent = (
        get_request_information(request)
    )

    database.add(
        LoginHistory(
            user_id=current_user.id,
            event=LoginEvent.LOGOUT,
            username=current_user.username,
            ip_address=ip_address,
            user_agent=user_agent,
            notes="Logout berhasil."
        )
    )

    database.commit()

    return MessageResponse(
        success=True,
        message="Logout berhasil."
    )