"""
Fills the database with demo data by calling the running backend's API
(so it also proves the backend works). Standard library only - no installs.

    python seed_demo.py                      # backend on http://localhost:8000
    python seed_demo.py http://localhost:8000

Safe to re-run: if branches already exist it stops without adding anything.
To start over from empty, run reset_db.py first.
"""
import json
import sys
import urllib.error
import urllib.request
from datetime import date, timedelta

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000").rstrip("/")
TODAY = date.today()


def call(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            raw = r.read()
            if not raw:
                return None
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                # Health endpoints may return plain text instead of JSON.
                return raw.decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        print(f"\n!! {method} {path} failed: HTTP {e.code}\n   {e.read().decode()[:300]}")
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"\n!! Can't reach the backend at {BASE}  ({e.reason})")
        print("   Is the backend window running and showing 'Application startup complete.'?")
        sys.exit(1)


def require_data(response, description):
    if response is None:
        raise TypeError(f"{description} returned no JSON body")
    if not isinstance(response, dict):
        raise TypeError(f"{description} did not return a JSON object: {response!r}")
    return response


print(f"Backend: {BASE}")
health = call("GET", "/")
print(f"  reachable: {health.get('service') if isinstance(health, dict) else health}")

if call("GET", "/branches/"):
    branches = call("GET", "/branches/")
    print(repr(branches))
    print("\nThe database already has branches, so I'm not adding demo data again.")
    print("To wipe it and start over, run reset_db.py from the backend folder, then run this again.")
    sys.exit(0)

# ---- branches + people ------------------------------------------------------
downtown = require_data(call("POST", "/branches/", {"branch_name": "Downtown", "address": "123 Main St", "contact_number": "0917-000-0001"}), "creating the Downtown branch")
uptown = require_data(call("POST", "/branches/", {"branch_name": "Uptown", "address": "456 High St", "contact_number": "0917-000-0002"}), "creating the Uptown branch")
D, U = downtown["branch_id"], uptown["branch_id"]

jane = require_data(call("POST", "/employees/", {"branch_id": D, "full_name": "Jane Manager", "position": "Branch Manager",
                                                 "contact_number": "0917-111-0001", "hire_date": "2024-03-01"}), "creating Jane's employee record")
call("POST", "/employees/", {"branch_id": D, "full_name": "Mark Cruz", "position": "Cashier",
                              "contact_number": "0917-111-0002", "hire_date": "2025-01-15"})
call("POST", "/employees/", {"branch_id": U, "full_name": "Ana Reyes", "position": "Head Cook",
                              "contact_number": "0917-111-0003", "hire_date": "2024-08-20"})
call("POST", "/employees/accounts", {"employee_id": jane["employee_id"], "username": "jane",
                                      "password": "secret123", "role": "MANAGER"})
token = require_data(call("POST", "/auth/login", {"username": "jane", "password": "secret123"}), "logging in as Jane")["access_token"]

# ---- ingredients ------------------------------------------------------------
cats = {n: require_data(call("POST", "/ingredients/categories", {"category_name": n}), f"creating the {n} category")["category_id"]
        for n in ("Meat", "Vegetables", "Dry Goods", "Dairy")}


def ingredient(name, unit, cat, perishable):
    return require_data(call("POST", "/ingredients/", {"ingredient_name": name, "unit_of_measure": unit,
                                                        "category_id": cats[cat], "is_perishable": perishable}),
                       f"creating ingredient {name}")["ingredient_id"]


chicken = ingredient("Chicken Breast", "kg", "Meat", True)
rice = ingredient("Rice", "kg", "Dry Goods", False)
onion = ingredient("Onion", "kg", "Vegetables", True)
oil = ingredient("Cooking Oil", "L", "Dry Goods", False)
milk = ingredient("Milk", "L", "Dairy", True)

# ---- suppliers ----------------------------------------------------------------
fresh = require_data(call("POST", "/suppliers/", {"supplier_name": "FreshFarms Poultry"}), "creating FreshFarms Poultry")["supplier_id"]
grain = require_data(call("POST", "/suppliers/", {"supplier_name": "GrainCo Distributors"}), "creating GrainCo Distributors")["supplier_id"]
for sup, ing, cost, lead in [(fresh, chicken, 180, 3), (fresh, onion, 60, 2), (fresh, milk, 95, 2),
                             (grain, rice, 55, 5), (grain, oil, 120, 4)]:
    call("POST", "/suppliers/ingredient-links", {"supplier_id": sup, "ingredient_id": ing,
                                                  "unit_cost": cost, "lead_time_days": lead, "is_preferred": True})

# ---- stock: PAR levels + received batches ----------------------------------
# (branch, ingredient, PAR level, qty on hand, unit cost, days until expiry or None)
stock = [
    (D, chicken, 51, 25, 180, 3),    # below PAR  -> shows as low stock
    (D, rice,    40, 100, 55, None),  # healthy
    (D, onion,   15, 8,   60, 2),    # below PAR and expiring soon
    (D, oil,     20, 30,  120, None),
    (D, milk,    25, 40,  95, 5),
    (U, chicken, 30, 60,  178, 4),
    (U, rice,    25, 50,  55, None),
]
batch_ids = {}
for b, ing, par, qty, cost, exp in stock:
    call("POST", "/inventory/branch-ingredient", {"branch_id": b, "ingredient_id": ing, "par_level": par, "current_stock": 0})
    batch_ids[(b, ing)] = require_data(call("POST", "/inventory/batches", {
        "branch_id": b, "ingredient_id": ing, "quantity_received": qty, "unit_cost": cost,
        "lot_number": f"LOT-{b}{ing}-001",
        "expiration_date": (TODAY + timedelta(days=exp)).isoformat() if exp else None}),
        f"creating inventory batch for branch {b}, ingredient {ing}")["batch_id"]

# ---- menu with recipes -----------------------------------------------------
bowl = require_data(call("POST", "/menu/", {"dish_name": "Chicken Rice Bowl", "price": 150,
                                            "recipe": [{"ingredient_id": chicken, "quantity_required": 0.2},
                                                       {"ingredient_id": rice, "quantity_required": 0.15}]}) , "creating Chicken Rice Bowl")["menu_item_id"]
fried = require_data(call("POST", "/menu/", {"dish_name": "Fried Chicken", "price": 120,
                                             "recipe": [{"ingredient_id": chicken, "quantity_required": 0.25},
                                                        {"ingredient_id": oil, "quantity_required": 0.05}]}) , "creating Fried Chicken")["menu_item_id"]

# ---- sales: completed orders deduct stock through the recipes --------------
for items in ([(bowl, 10), (fried, 4)], [(bowl, 6)], [(fried, 8), (bowl, 3)]):
    o = require_data(call("POST", "/orders/", {"branch_id": D, "employee_id": jane["employee_id"],
                                               "items": [{"menu_item_id": m, "quantity": q} for m, q in items]}), "placing an order")
    call("POST", f"/orders/{o['order_id']}/finalize")

# ---- waste ----------------------------------------------------------------------
# batch_id matters: waste cost is priced from the batch's unit cost (no batch = cost 0)
call("POST", "/inventory/waste", {"branch_id": D, "ingredient_id": onion, "batch_id": batch_ids[(D, onion)],
                                   "quantity": 1.5, "reason": "SPOILED", "notes": "left out overnight", "recorded_by": jane["employee_id"]})

# ---- procurement: auto-recommend POs for low stock, push one through ------
pos = call("POST", f"/purchase-orders/generate-recommendations/{D}")
if pos:
    first = pos[0]
    call("POST", f"/purchase-orders/{first['po_id']}/approve", token=token)
    call("POST", f"/purchase-orders/{first['po_id']}/send")
    call("POST", f"/purchase-orders/{first['po_id']}/receive", {"items": [
        {"po_item_id": it["po_item_id"], "quantity_received": it["ordered_quantity"],
         "lot_number": "LOT-PO-RCV", "expiration_date": (TODAY + timedelta(days=5)).isoformat()}
        for it in first["items"]]})

# ---- summary -------------------------------------------------------------------
s = require_data(call("GET", f"/dashboard/branch/{D}/summary"), f"fetching dashboard summary for branch {D}")
print("\nDone. Demo data created:")
print("  2 branches, 3 employees, 5 ingredients, 2 suppliers, 2 menu items, 3 sales, purchase orders")
print(f"\nDowntown dashboard now reads:")
print(f"  low-stock items     : {s['low_stock_count']}")
print(f"  waste cost (7 days) : {s['waste_cost_last_7_days']}")
print(f"  inventory value     : {s['total_inventory_value']}")
print(f"  pending POs         : {s['pending_purchase_orders']}")
print("\nManager login (for /docs): username jane / password secret123")
