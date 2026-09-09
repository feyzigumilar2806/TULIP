# ============================================================
# KEAMANAN DAN PASSWORD TULIP
# ============================================================

from datetime import datetime
from datetime import timedelta
from datetime import timezone

import jwt
from pwdlib import PasswordHash

from app.config import settings


# ============================================================
# PENGATURAN KEAMANAN
# ============================================================

ALGORITHM = "HS256"

password_hasher = PasswordHash.recommended()


# ============================================================
# MEMERIKSA PASSWORD
# ============================================================

def verify_password(
    plain_password: str,
    password_hash: str
) -> bool:
    """
    Memeriksa apakah password yang dimasukkan pengguna
    sesuai dengan password hash di database.
    """

    try:
        return password_hasher.verify(
            plain_password,
            password_hash
        )
    except Exception:
        return False


# ============================================================
# MEMBUAT HASH PASSWORD
# ============================================================

def create_password_hash(
    password: str
) -> str:
    """
    Mengubah password menjadi hash sebelum disimpan.
    """

    return password_hasher.hash(password)


# ============================================================
# MEMBUAT TOKEN LOGIN
# ============================================================

def create_access_token(
    user_id: str,
    username: str,
    role: str
) -> str:
    """
    Membuat token JWT setelah pengguna berhasil login.
    """

    current_time = datetime.now(
        timezone.utc
    )

    expiration_time = current_time + timedelta(
        minutes=settings.access_token_expire_minutes
    )

    token_data = {
        "sub": user_id,
        "username": username,
        "role": role,
        "iat": current_time,
        "exp": expiration_time,
    }

    return jwt.encode(
        token_data,
        settings.secret_key,
        algorithm=ALGORITHM
    )


# ============================================================
# MEMBACA DAN MEMERIKSA TOKEN
# ============================================================

def decode_access_token(
    token: str
) -> dict | None:
    """
    Membaca token dan memastikan token masih valid.
    """

    try:
        return jwt.decode(
            token,
            settings.secret_key,
            algorithms=[ALGORITHM]
        )

    except jwt.InvalidTokenError:
        return None