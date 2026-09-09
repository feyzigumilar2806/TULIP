# ============================================================
# DATA AWAL TULIP
# Membuat cabang dan akun pengguna pertama
# ============================================================

import secrets

from sqlalchemy import select

from app.database import SessionLocal
from app.models import Branch
from app.models import User
from app.models import UserRole
from app.security import create_password_hash


# ============================================================
# DAFTAR CABANG
# ============================================================

BRANCH_NAMES = [
    "HO",
    "Jakarta",
    "Bandung",
    "Palembang",
    "Lampung",
    "Madiun",
    "Malang",
    "Surabaya",
    "Solo",
]


# ============================================================
# DAFTAR AKUN AWAL
# Password dibuat otomatis dan tidak disimpan di kode
# ============================================================

USER_DATA = [
    {
        "username": "superadmin",
        "name": "Super Administrator TULIP",
        "role": UserRole.SUPERADMIN,
        "branch": None,
    },
    {
        "username": "pusat",
        "name": "Administrator Pusat",
        "role": UserRole.HQ,
        "branch": None,
    },
    {
        "username": "kc.ho",
        "name": "Kepala HO",
        "role": UserRole.BRANCH_HEAD,
        "branch": "HO",
    },
    {
        "username": "kc.jakarta",
        "name": "Kepala Cabang Jakarta",
        "role": UserRole.BRANCH_HEAD,
        "branch": "Jakarta",
    },
    {
        "username": "kc.bandung",
        "name": "Kepala Cabang Bandung",
        "role": UserRole.BRANCH_HEAD,
        "branch": "Bandung",
    },
    {
        "username": "kc.palembang",
        "name": "Kepala Cabang Palembang",
        "role": UserRole.BRANCH_HEAD,
        "branch": "Palembang",
    },
    {
        "username": "kc.lampung",
        "name": "Kepala Cabang Lampung",
        "role": UserRole.BRANCH_HEAD,
        "branch": "Lampung",
    },
    {
        "username": "kc.madiun",
        "name": "Kepala Cabang Madiun",
        "role": UserRole.BRANCH_HEAD,
        "branch": "Madiun",
    },
    {
        "username": "kc.malang",
        "name": "Kepala Cabang Malang",
        "role": UserRole.BRANCH_HEAD,
        "branch": "Malang",
    },
    {
        "username": "kc.surabaya",
        "name": "Kepala Cabang Surabaya",
        "role": UserRole.BRANCH_HEAD,
        "branch": "Surabaya",
    },
    {
        "username": "kc.solo",
        "name": "Kepala Cabang Solo",
        "role": UserRole.BRANCH_HEAD,
        "branch": "Solo",
    },
]


# ============================================================
# MEMBUAT PASSWORD ACAK
# ============================================================

def generate_password() -> str:
    """
    Membuat password acak yang kuat.
    Password hanya ditampilkan ketika akun baru dibuat.
    """

    return secrets.token_urlsafe(16)


# ============================================================
# MEMBUAT DATA CABANG
# ============================================================

def create_branches(database):
    branch_map = {}

    for branch_name in BRANCH_NAMES:
        branch = database.scalar(
            select(Branch).where(
                Branch.name == branch_name
            )
        )

        if branch is None:
            branch = Branch(
                name=branch_name,
                active=True
            )

            database.add(branch)
            database.flush()

            print(
                f"[CABANG DIBUAT] {branch_name}"
            )

        else:
            print(
                f"[CABANG SUDAH ADA] {branch_name}"
            )

        branch_map[branch_name] = branch

    return branch_map


# ============================================================
# MEMBUAT AKUN PENGGUNA
# ============================================================

def create_users(
    database,
    branch_map
):
    new_credentials = []

    for user_data in USER_DATA:
        username = (
            user_data["username"]
            .strip()
            .lower()
        )

        existing_user = database.scalar(
            select(User).where(
                User.username == username
            )
        )

        if existing_user is not None:
            print(
                f"[AKUN SUDAH ADA] {username}"
            )
            continue

        plain_password = generate_password()
        branch_name = user_data["branch"]

        branch_id = (
            branch_map[branch_name].id
            if branch_name
            else None
        )

        user = User(
            username=username,
            password_hash=create_password_hash(
                plain_password
            ),
            name=user_data["name"],
            role=user_data["role"],
            branch_id=branch_id,
            active=True,
        )

        database.add(user)
        database.flush()

        new_credentials.append(
            {
                "username": username,
                "password": plain_password,
                "role": user_data["role"].value,
            }
        )

        print(
            f"[AKUN DIBUAT] {username}"
        )

    return new_credentials


# ============================================================
# MENJALANKAN PENGISIAN DATA AWAL
# ============================================================

def seed_database():
    database = SessionLocal()

    try:
        print("")
        print(
            "Memulai pengisian data awal TULIP..."
        )
        print("")

        branch_map = create_branches(
            database
        )

        credentials = create_users(
            database,
            branch_map
        )

        database.commit()

        print("")
        print(
            "Data awal TULIP berhasil dibuat."
        )
        print("")

        if credentials:
            print("=" * 60)
            print(
                "SIMPAN DATA LOGIN BERIKUT DI TEMPAT AMAN"
            )
            print("=" * 60)

            for credential in credentials:
                print(
                    f"Username : {credential['username']}"
                )
                print(
                    f"Password : {credential['password']}"
                )
                print(
                    f"Role     : {credential['role']}"
                )
                print("-" * 60)

            print(
                "Password hanya diperlihatkan saat akun dibuat."
            )

        else:
            print(
                "Tidak ada akun baru karena semua akun sudah tersedia."
            )

    except Exception as error:
        database.rollback()

        print("")
        print(
            "Gagal membuat data awal TULIP."
        )
        print(
            f"Kesalahan: {error}"
        )

        raise

    finally:
        database.close()


# ============================================================
# TITIK MULAI PROGRAM
# ============================================================

if __name__ == "__main__":
    seed_database()