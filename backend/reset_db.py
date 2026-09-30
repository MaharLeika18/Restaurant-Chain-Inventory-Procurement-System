"""
Wipes ALL data in the backend's database and recreates the empty tables.
Run it from the backend folder (so it finds your .env):

    python reset_db.py
"""
import sys

from app.database import Base, engine
from app import models  # noqa: F401 - registers every table on Base

print("This will DELETE ALL DATA in:")
print("  " + engine.url.render_as_string(hide_password=True))
if input("Type yes to continue: ").strip().lower() != "yes":
    print("Cancelled - nothing was changed.")
    sys.exit(0)

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
print("Done - every table is empty again.")
