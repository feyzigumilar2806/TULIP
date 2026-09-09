# ============================================================
# API DATA PUBLIK TULIP
# ============================================================

from typing import Annotated

from fastapi import APIRouter
from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.constants import OPERATION_SUBUNITS
from app.constants import WORK_UNITS
from app.database import get_database
from app.models import Branch


# ============================================================
# PENGATURAN ROUTER
# ============================================================

router = APIRouter(
    prefix="/api/public",
    tags=["Form Karyawan"]
)


# ============================================================
# PILIHAN FORMULIR KARYAWAN
# ============================================================

@router.get("/options")
def get_public_options(
    database: Annotated[
        Session,
        Depends(get_database)
    ]
):
    branches = database.scalars(
        select(Branch)
        .where(
            Branch.active.is_(True)
        )
        .order_by(
            Branch.name.asc()
        )
    ).all()

    return {
        "branches": [
            {
                "id": branch.id,
                "name": branch.name
            }
            for branch in branches
        ],
        "units": WORK_UNITS,
        "operation_subunits": OPERATION_SUBUNITS
    }