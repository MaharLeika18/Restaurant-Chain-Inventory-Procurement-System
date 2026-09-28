from collections import defaultdict
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models.order import OrderLog, OrderItem
from app.models.menu import Menu
from app.models.enums import OrderStatus, InventoryTransactionType
from app.schemas.order import OrderCreate, OrderItemCreate
from app.schemas.inventory import InventoryTransactionCreate
from app.crud.inventory import record_transaction


def get_order(db: Session, order_id: int) -> OrderLog | None:
    return (
        db.query(OrderLog)
        .options(joinedload(OrderLog.items))
        .filter(OrderLog.order_id == order_id)
        .first()
    )


def get_orders(
    db: Session, branch_id: int | None = None, status: OrderStatus | None = None, skip: int = 0, limit: int = 100
) -> list[OrderLog]:
    query = db.query(OrderLog).options(joinedload(OrderLog.items))
    if branch_id is not None:
        query = query.filter(OrderLog.branch_id == branch_id)
    if status is not None:
        query = query.filter(OrderLog.status == status)
    return query.order_by(OrderLog.order_datetime.desc()).offset(skip).limit(limit).all()


def create_order(db: Session, order_in: OrderCreate) -> OrderLog:
    """Rings up a transaction (status OPEN). Stock isn't deducted until the
    order is completed via complete_order(), so an order can still be voided
    without having touched inventory."""
    if not order_in.items:
        raise HTTPException(status_code=400, detail="An order needs at least one item.")

    order = OrderLog(
        branch_id=order_in.branch_id,
        employee_id=order_in.employee_id,
        payment_method=order_in.payment_method,
        status=OrderStatus.OPEN,
        total_amount=0,
    )

    total = 0.0
    for item_in in order_in.items:
        menu_item = db.get(Menu, item_in.menu_item_id)
        if menu_item is None:
            raise HTTPException(status_code=404, detail=f"Menu item {item_in.menu_item_id} not found.")
        subtotal = float(menu_item.price) * item_in.quantity
        total += subtotal
        order.items.append(OrderItem(
            menu_item_id=item_in.menu_item_id,
            quantity=item_in.quantity,
            unit_price=float(menu_item.price),
            subtotal=subtotal,
        ))

    order.total_amount = total
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def add_order_item(db: Session, order: OrderLog, item_in: OrderItemCreate) -> OrderLog:
    """addOrderItem: append a dish to an OPEN order and recompute the total."""
    if order.status != OrderStatus.OPEN:
        raise HTTPException(status_code=400, detail=f"Cannot add items to an order that is {order.status.value}.")

    menu_item = db.get(Menu, item_in.menu_item_id)
    if menu_item is None:
        raise HTTPException(status_code=404, detail=f"Menu item {item_in.menu_item_id} not found.")

    subtotal = float(menu_item.price) * item_in.quantity
    order.items.append(OrderItem(
        menu_item_id=item_in.menu_item_id,
        quantity=item_in.quantity,
        unit_price=float(menu_item.price),
        subtotal=subtotal,
    ))
    order.total_amount = float(order.total_amount) + subtotal

    db.commit()
    db.refresh(order)
    return order


def complete_order(db: Session, order: OrderLog) -> OrderLog:
    """
    Finalizes an order: explodes each ordered dish through its Recipe to
    figure out total ingredient usage, then deducts branch stock via the
    normal CONSUMPTION transaction path (FIFO from batches). Ingredient
    needs are aggregated first so a shared ingredient across two dishes on
    the same order only writes one ledger line.
    """
    if order.status != OrderStatus.OPEN:
        raise HTTPException(status_code=400, detail=f"Cannot complete an order that is {order.status.value}.")

    ingredient_needs: dict[int, float] = defaultdict(float)
    for order_item in order.items:
        menu_item = db.get(Menu, order_item.menu_item_id)
        for recipe_line in menu_item.recipe:
            ingredient_needs[recipe_line.ingredient_id] += float(recipe_line.quantity_required) * order_item.quantity

    for ingredient_id, quantity in ingredient_needs.items():
        record_transaction(db, InventoryTransactionCreate(
            branch_id=order.branch_id,
            ingredient_id=ingredient_id,
            transaction_type=InventoryTransactionType.CONSUMPTION,
            quantity=quantity,
            reference=f"order:{order.order_id}",
            notes="Deducted from completed order.",
        ))

    order.status = OrderStatus.COMPLETED
    order.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    return order


def cancel_order(db: Session, order: OrderLog) -> OrderLog:
    """Voids an order. Only valid while still OPEN, since COMPLETED orders
    have already deducted stock (use refund_order() to reverse those)."""
    if order.status != OrderStatus.OPEN:
        raise HTTPException(status_code=400, detail=f"Cannot cancel an order that is {order.status.value}.")
    order.status = OrderStatus.CANCELLED
    db.commit()
    db.refresh(order)
    return order


def refund_order(db: Session, order: OrderLog) -> OrderLog:
    """
    Reverses a COMPLETED order: re-explodes the recipe the same way
    complete_order() did, and adds each ingredient's quantity back via an
    ADJUSTMENT transaction (a straight TRANSFER/CONSUMPTION reversal isn't
    used, since the stock may have come from a batch that's since been
    used up - ADJUSTMENT just restores the aggregate total honestly).
    """
    if order.status != OrderStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Only a COMPLETED order can be refunded.")

    ingredient_needs: dict[int, float] = defaultdict(float)
    for order_item in order.items:
        menu_item = db.get(Menu, order_item.menu_item_id)
        for recipe_line in menu_item.recipe:
            ingredient_needs[recipe_line.ingredient_id] += float(recipe_line.quantity_required) * order_item.quantity

    for ingredient_id, quantity in ingredient_needs.items():
        record_transaction(db, InventoryTransactionCreate(
            branch_id=order.branch_id,
            ingredient_id=ingredient_id,
            transaction_type=InventoryTransactionType.ADJUSTMENT,
            quantity=quantity,
            reference=f"order:{order.order_id}",
            notes="Stock restored from refunded order.",
        ))

    order.status = OrderStatus.REFUNDED
    db.commit()
    db.refresh(order)
    return order
