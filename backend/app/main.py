from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app import models  # noqa: F401 - import so every model is registered on Base before create_all

from app.routers import (
    auth,
    branches,
    employees,
    ingredients,
    suppliers,
    menu,
    inventory,
    orders,
    purchase_orders,
    stock_transfers,
    reorder,
    forecasting,
    reports,
)

app = FastAPI(title=settings.app_name, debug=settings.debug)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to your deployed frontend's origin before shipping
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    # Creates any tables that don't exist yet. Fine for local dev; once the
    # schema stabilizes, switch to Alembic migrations (alembic upgrade head)
    # instead of relying on this.
    Base.metadata.create_all(bind=engine)


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "service": settings.app_name}


app.include_router(auth.router)
app.include_router(branches.router)
app.include_router(employees.router)
app.include_router(ingredients.router)
app.include_router(suppliers.router)
app.include_router(menu.router)
app.include_router(inventory.router)
app.include_router(orders.router)
app.include_router(purchase_orders.router)
app.include_router(stock_transfers.router)
app.include_router(reorder.router)
app.include_router(forecasting.router)
app.include_router(reports.router)
