from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.enums import OrderStatus
from app.schemas.order import OrderCreate, OrderOut, OrderItemCreate
from app.crud import order as crud_order

router = APIRouter(prefix="/orders", tags=["Order Processing"])


@router.get("/", response_model=list[OrderOut])
def list_orders_by_branch(
    branch_id: int | None = None, status: OrderStatus | None = None,
    skip: int = 0, limit: int = 100, db: Session = Depends(get_db),
):
    return crud_order.get_orders(db, branch_id=branch_id, status=status, skip=skip, limit=limit)


@router.post("/", response_model=OrderOut, status_code=201)
def create_order(order_in: OrderCreate, db: Session = Depends(get_db)):
    """createOrder: rings up a transaction as OPEN. Stock isn't touched until /finalize."""
    return crud_order.create_order(db, order_in)


@router.get("/{order_id}", response_model=OrderOut)
def get_order_by_id(order_id: int, db: Session = Depends(get_db)):
    order = crud_order.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    return order


@router.post("/{order_id}/items", response_model=OrderOut, status_code=201)
def add_order_item(order_id: int, item_in: OrderItemCreate, db: Session = Depends(get_db)):
    """addOrderItem: append a dish to an OPEN order."""
    order = crud_order.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    return crud_order.add_order_item(db, order, item_in)


@router.post("/{order_id}/finalize", response_model=OrderOut)
def finalize_order(order_id: int, db: Session = Depends(get_db)):
    """finalizeOrder: locks the order in and deducts ingredient stock via each dish's recipe."""
    order = crud_order.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    return crud_order.complete_order(db, order)


@router.post("/{order_id}/cancel", response_model=OrderOut)
def cancel_order(order_id: int, db: Session = Depends(get_db)):
    """Void an order that hasn't been finalized yet (no stock impact)."""
    order = crud_order.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    return crud_order.cancel_order(db, order)


@router.post("/{order_id}/refund", response_model=OrderOut)
def refund_order(order_id: int, db: Session = Depends(get_db)):
    """refundOrder: reverses a finalized order and restores the ingredient stock it used."""
    order = crud_order.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    return crud_order.refund_order(db, order)
