"""
Reorder-point logic, now driven by the manager-set PAR level per branch
ingredient (BranchIngredient.par_level) rather than a stored consumption
rate: reorder triggers once current_stock falls to/below par_level. Average
daily demand (from services.forecasting) is layered on top only to explain
"how many days left" and to size the suggested order quantity against
supplier lead time - it doesn't change whether the trigger fires.
"""
from sqlalchemy.orm import Session

from app.models.inventory import BranchIngredient
from app.models.ingredient import Ingredient
from app.models.forecast import ReorderPrediction
from app.models.supplier import SupplierIngredient
from app.schemas.inventory import ReorderCheckOut

from app.services.forecasting import average_daily_demand


def _default_lead_time_days(db: Session, ingredient_id: int) -> int:
    """Use the preferred (or cheapest) supplier's lead time; fall back to 3 days if none is linked yet."""
    link = (
        db.query(SupplierIngredient)
        .filter(SupplierIngredient.ingredient_id == ingredient_id)
        .order_by(SupplierIngredient.is_preferred.desc(), SupplierIngredient.unit_cost.asc())
        .first()
    )
    return link.lead_time_days if link else 3


def check_reorder(db: Session, branch_ingredient: BranchIngredient, ingredient: Ingredient) -> ReorderCheckOut:
    current_stock = float(branch_ingredient.current_stock)
    par_level = float(branch_ingredient.par_level)
    needs_reorder = current_stock <= par_level

    avg_daily, _, _ = average_daily_demand(db, branch_ingredient.branch_id, ingredient.ingredient_id)
    days_remaining = (current_stock / avg_daily) if avg_daily > 0 else None

    lead_time_days = _default_lead_time_days(db, ingredient.ingredient_id)
    # Suggested top-up: bring stock back to PAR plus one lead-time cycle of expected demand.
    target_level = par_level + (avg_daily * lead_time_days)
    suggested_qty = max(target_level - current_stock, 0) if needs_reorder else 0

    return ReorderCheckOut(
        branch_id=branch_ingredient.branch_id,
        ingredient_id=ingredient.ingredient_id,
        ingredient_name=ingredient.ingredient_name,
        current_stock=current_stock,
        par_level=par_level,
        days_of_stock_remaining=round(days_remaining, 2) if days_remaining is not None else None,
        needs_reorder=needs_reorder,
        suggested_order_quantity=round(suggested_qty, 3),
    )


def check_all_reorders_for_branch(db: Session, branch_id: int) -> list[ReorderCheckOut]:
    rows = (
        db.query(BranchIngredient)
        .join(Ingredient, Ingredient.ingredient_id == BranchIngredient.ingredient_id)
        .filter(BranchIngredient.branch_id == branch_id)
        .all()
    )
    return [check_reorder(db, row, row.ingredient) for row in rows]


def save_reorder_predictions_for_branch(db: Session, branch_id: int) -> list[ReorderPrediction]:
    """
    Runs the check for every ingredient at a branch and persists one
    ReorderPrediction row per ingredient, so the Procurement/Dashboard pages
    have a queryable history of when the system flagged low stock (not just
    the live state). Called by the Reorder Recommendations dashboard action
    and by the auto-PO generator.
    """
    from datetime import date, timedelta

    results = check_all_reorders_for_branch(db, branch_id)
    saved = []
    for result in results:
        predicted_stockout = None
        if result.days_of_stock_remaining is not None:
            predicted_stockout = date.today() + timedelta(days=int(result.days_of_stock_remaining))

        prediction = ReorderPrediction(
            branch_id=result.branch_id,
            ingredient_id=result.ingredient_id,
            current_stock_at_check=result.current_stock,
            par_level_at_check=result.par_level,
            predicted_stockout_date=predicted_stockout,
            suggested_order_quantity=result.suggested_order_quantity,
            needs_reorder=result.needs_reorder,
        )
        db.add(prediction)
        saved.append(prediction)

    db.commit()
    for p in saved:
        db.refresh(p)
    return saved


def get_reorder_prediction_history(
    db: Session, branch_id: int, ingredient_id: int | None = None, limit: int = 50
) -> list[ReorderPrediction]:
    query = db.query(ReorderPrediction).filter(ReorderPrediction.branch_id == branch_id)
    if ingredient_id is not None:
        query = query.filter(ReorderPrediction.ingredient_id == ingredient_id)
    return query.order_by(ReorderPrediction.generated_at.desc()).limit(limit).all()
