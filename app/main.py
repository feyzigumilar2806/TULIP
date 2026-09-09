# ============================================================
# APLIKASI UTAMA TULIP
# File utama untuk menjalankan seluruh sistem
# ============================================================

from pathlib import Path

from fastapi import FastAPI
from fastapi import Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import text

from app.admin import router as admin_router
from app.auth import router as auth_router
from app.config import settings
from app.dashboard import router as dashboard_router
from app.database import engine
from app.export import router as export_router
from app.files import router as file_router
from app.proofs import router as proof_router
from app.public import router as public_router
from app.transactions import router as transaction_router


# ============================================================
# LOKASI FOLDER WEBSITE
# ============================================================

BASE_DIRECTORY = Path(
    __file__
).resolve().parent.parent

STATIC_DIRECTORY = (
    BASE_DIRECTORY / "static"
)

TEMPLATE_DIRECTORY = (
    BASE_DIRECTORY / "templates"
)


# ============================================================
# MEMBUAT APLIKASI FASTAPI
# ============================================================

app = FastAPI(
    title=settings.app_name,
    description=(
        "Sistem Tukar Uang Logam "
        "Internal Prosegur"
    ),
    version="1.3.0"
)


# ============================================================
# MEMASANG FILE CSS DAN JAVASCRIPT
# ============================================================

app.mount(
    "/static",
    StaticFiles(
        directory=str(
            STATIC_DIRECTORY
        )
    ),
    name="static"
)


# ============================================================
# MEMASANG TEMPLATE HTML
# ============================================================

templates = Jinja2Templates(
    directory=str(
        TEMPLATE_DIRECTORY
    )
)


# ============================================================
# MEMASANG SELURUH ROUTER API
# ============================================================

app.include_router(
    auth_router
)

app.include_router(
    public_router
)

app.include_router(
    transaction_router
)

app.include_router(
    dashboard_router
)

app.include_router(
    proof_router
)

app.include_router(
    file_router
)

app.include_router(
    admin_router
)

app.include_router(
    export_router
)


# ============================================================
# HALAMAN WEBSITE UTAMA
# ============================================================

@app.get("/")
def homepage(
    request: Request
):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "application_name": (
                settings.app_name
            ),
            "version": "1.3.0"
        }
    )


# ============================================================
# PEMERIKSAAN KONEKSI DATABASE
# ============================================================

@app.get("/api/health")
def database_health():
    with engine.connect() as connection:
        connection.execute(
            text("SELECT 1")
        )

    return {
        "status": "success",
        "message": (
            "TULIP berhasil terhubung "
            "ke PostgreSQL."
        )
    }