from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

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

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Creates any tables that don't exist yet. Switch to Alembic migrations later
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to your deployed frontend's origin before shipping
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(IntegrityError)
async def handle_integrity_error(request, exc: IntegrityError):
    """Database constraint violations (duplicate name, record still in use) used to
    surface as a bare 500 - which the browser can't even read because error
    responses skip CORS. Return a clear 409 instead."""
    detail = str(getattr(exc, "orig", exc)).lower()
    if "unique" in detail or "duplicate key" in detail:
        message = "A record with the same name already exists."
    elif "foreign key" in detail:
        message = "This record is still linked to other records (or points to one that doesn't exist)."
    else:
        message = "This change conflicts with existing data."
    return JSONResponse(status_code=409, content={"detail": message})


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
