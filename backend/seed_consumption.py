"""
Backfills 30 days of CONSUMPTION ledger entries per branch, derived from
simulated sales x recipes, so the dashboard charts have history.

Run from the backend folder:  python seed_consumption.py
"""
import random
from collections import defaultdict
from datetime import date, datetime, time, timedelta

from sqlalchemy import Date, cast, func

from app.database import SessionLocal
from app.models.branch import Branch
from app.models.enums import InventoryTransactionType
from app.models.ingredient import Ingredient
from app.models.inventory import InventoryTransaction

DAYS = 30
SIGN = 1
random.seed(42)  # same data every run

# dish -> [(ingredient_name, qty_per_dish)]  (copied from the seed script's MENU)
RECIPES = {
    "Chicken Rice Bowl": [("Chicken Breast", 0.18), ("Jasmine Rice", 0.20), ("Onion", 0.02), ("Garlic", 0.01), ("Cooking Oil", 0.015)],
    "Beef Tapa Rice": [("Beef Sirloin", 0.16), ("Jasmine Rice", 0.20), ("Tomato", 0.04), ("Onion", 0.02), ("Garlic", 0.01), ("Cooking Oil", 0.015)],
    "Crispy Chicken Salad": [("Chicken Breast", 0.14), ("Lettuce", 0.05), ("Tomato", 0.04), ("Onion", 0.02), ("Cooking Oil", 0.01)],
    "Creamy Garlic Pasta": [("Pancit Noodles", 0.15), ("All-Purpose Cream", 0.05), ("Garlic", 0.01), ("Cooking Oil", 0.015), ("Onion", 0.02)],
    "Garlic Chicken Noodles": [("Pancit Noodles", 0.14), ("Chicken Breast", 0.10), ("Onion", 0.02), ("Garlic", 0.01), ("Cooking Oil", 0.015), ("Tomato", 0.03)],
}

# Relative popularity of each dish (makes some ingredients clearly heavier)
POPULARITY = {
    "Chicken Rice Bowl": 1.4,
    "Beef Tapa Rice": 1.0,
    "Crispy Chicken Salad": 0.7,
    "Creamy Garlic Pasta": 0.8,
    "Garlic Chicken Noodles": 1.1,
}

# Branch size multiplier, keyed by branch name from the seed script
BRANCH_VOLUME = {"BGC Central": 1.2, "Makati South": 1.0, "Quezon Gateway": 0.8}

BASE_DISHES_PER_DAY = 45


def day_multiplier(d: date, i: int) -> float:
    weekend = 1.35 if d.weekday() in (4, 5, 6) else 1.0   # Fri-Sun busier
    trend = 1.0 + (i / DAYS) * 0.15                         # gentle upward trend
    noise = random.uniform(0.85, 1.15)
    return weekend * trend * noise


def main():
    db = SessionLocal()
    try:
        today = date.today()
        start = today - timedelta(days=DAYS - 1)

        existing = (
            db.query(func.count(InventoryTransaction.transaction_id))  # adjust PK name if different
            .filter(
                InventoryTransaction.transaction_type == InventoryTransactionType.CONSUMPTION,
                cast(InventoryTransaction.transaction_date, Date) >= start,
            )
            .scalar()
        )
        if existing:
            print(f"Found {existing} CONSUMPTION rows in the last {DAYS} days. Not adding more.")
            return

        ingredients = {i.ingredient_name: i.ingredient_id for i in db.query(Ingredient).all()}
        missing = {n for r in RECIPES.values() for n, _ in r} - set(ingredients)
        if missing:
            raise SystemExit(f"Ingredients not found (run the main seed first): {sorted(missing)}")

        dishes = list(RECIPES)
        weights = [POPULARITY[d] for d in dishes]
        rows = []

        for branch in db.query(Branch).all():
            volume = BRANCH_VOLUME.get(branch.branch_name, 1.0)
            for i in range(DAYS):
                d = start + timedelta(days=i)
                dish_count = int(BASE_DISHES_PER_DAY * volume * day_multiplier(d, i))
                sold = random.choices(dishes, weights=weights, k=dish_count)

                used = defaultdict(float)
                for dish in sold:
                    for name, qty in RECIPES[dish]:
                        used[name] += qty

                for name, qty in used.items():
                    rows.append(
                        InventoryTransaction(
                            branch_id=branch.branch_id,
                            ingredient_id=ingredients[name],
                            transaction_type=InventoryTransactionType.CONSUMPTION,
                            quantity=SIGN * round(qty, 3),
                            transaction_date=datetime.combine(d, time(21, 0)),
                        )
                    )

        db.add_all(rows)
        db.commit()
        print(f"Inserted {len(rows)} CONSUMPTION rows across {DAYS} days.")
    finally:
        db.close()


if __name__ == "__main__":
    main()