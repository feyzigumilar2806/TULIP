from sqlalchemy import inspect

from app import models
from app.database import Base
from app.database import engine


def create_database_tables() -> None:
    print("Membuat tabel database TULIP...")

    Base.metadata.create_all(
        bind=engine
    )

    inspector = inspect(engine)
    table_names = inspector.get_table_names()

    print("Tabel berhasil tersedia:")

    for table_name in sorted(table_names):
        print(f"- {table_name}")


if __name__ == "__main__":
    create_database_tables()