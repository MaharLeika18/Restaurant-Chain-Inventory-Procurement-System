import json
import sys
import urllib.error
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000").rstrip("/")
PASSWORD = "Password123!"          # same test password as the SQL file
REPLAY_SALES = False               # see note below the script


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


# =============================================================================
# DATA (taken from restaurant_chain_mock_data.sql; keys are the SQL ids)
# =============================================================================

BRANCHES = {
    1: ("BGC Central", "28th Street, Bonifacio Global City, Taguig", "+63 917 555 0101"),
    2: ("Makati South", "Ayala Avenue, Makati City", "+63 917 555 0102"),
    3: ("Quezon Gateway", "Tomas Morato Avenue, Quezon City", "+63 917 555 0103"),
}

# employee_id: (branch_id, full_name, position, contact, hire_date, username, role)
EMPLOYEES = {
    1:  (1, "Ana Santos",     "Branch Manager", "+63 917 555 1101", "2024-02-21", "ana.santos",     "ADMIN"),
    2:  (1, "Miguel Reyes",   "Cashier",        "+63 917 555 1102", "2024-03-29", "miguel.reyes",   "BRANCH_STAFF"),
    3:  (1, "Carla Cruz",     "Head Cook",      "+63 917 555 1103", "2024-05-05", "carla.cruz",     "BRANCH_STAFF"),
    4:  (1, "Joshua Navarro", "Kitchen Staff",  "+63 917 555 1104", "2024-06-11", "joshua.navarro", "BRANCH_STAFF"),
    5:  (2, "Bea Reyes",      "Branch Manager", "+63 917 555 1105", "2024-07-18", "bea.reyes",      "MANAGER"),
    6:  (2, "Paolo Cruz",     "Cashier",        "+63 917 555 1106", "2024-08-24", "paolo.cruz",     "BRANCH_STAFF"),
    7:  (2, "Nina Navarro",   "Head Cook",      "+63 917 555 1107", "2024-09-30", "nina.navarro",   "BRANCH_STAFF"),
    8:  (2, "Andre Santos",   "Kitchen Staff",  "+63 917 555 1108", "2024-11-06", "andre.santos",   "BRANCH_STAFF"),
    9:  (3, "Mika Cruz",      "Branch Manager", "+63 917 555 1109", "2024-12-13", "mika.cruz",      "MANAGER"),
    10: (3, "Rafael Navarro", "Cashier",        "+63 917 555 1110", "2025-01-19", "rafael.navarro", "BRANCH_STAFF"),
    11: (3, "Liza Santos",    "Head Cook",      "+63 917 555 1111", "2025-02-25", "liza.santos",    "BRANCH_STAFF"),
    12: (3, "Ken Reyes",      "Kitchen Staff",  "+63 917 555 1112", "2025-04-03", "ken.reyes",      "BRANCH_STAFF"),
}

CATEGORIES = {1: "Meat", 2: "Grains & Noodles", 3: "Produce", 4: "Pantry", 5: "Dairy & Cooking"}

# ingredient_id: (name, unit, category_id, is_perishable)
INGREDIENTS = {
    1:  ("Chicken Breast",    "kg", 1, True),
    2:  ("Beef Sirloin",      "kg", 1, True),
    3:  ("Jasmine Rice",      "kg", 2, False),
    4:  ("Pancit Noodles",    "kg", 2, False),
    5:  ("Lettuce",           "kg", 3, True),
    6:  ("Tomato",            "kg", 3, True),
    7:  ("Onion",             "kg", 3, True),
    8:  ("Garlic",            "kg", 3, True),
    9:  ("Cooking Oil",       "L",  5, False),
    10: ("All-Purpose Cream", "L",  5, True),
}

# supplier_id: (name, contact_person, contact_number, email, address)
SUPPLIERS = {
    1: ("FreshFarm Foods",      "Marvin Dela Cruz", "+63 917 600 1001", "sales@freshfarm.example",   "Caloocan City"),
    2: ("Metro Grains & Pantry", "Ivy Tan",         "+63 917 600 1002", "orders@metrograins.example", "Pasig City"),
    3: ("GreenBasket Produce",  "Ramon Garcia",     "+63 917 600 1003", "hello@greenbasket.example",  "Marikina City"),
}

# (supplier_id, ingredient_id, unit_cost, lead_time_days, is_preferred)
SUPPLIER_INGREDIENTS = [
    (1, 1, 238, 2, True),  (1, 2, 418, 3, True),  (1, 8, 178, 4, False), (1, 9, 120, 4, False),
    (2, 1, 245, 4, False), (2, 3, 61, 3, True),   (2, 4, 82, 4, True),   (2, 8, 175, 4, False),
    (2, 9, 118, 4, True),  (2, 10, 96, 3, True),
    (3, 3, 64, 3, False),  (3, 5, 132, 2, True),  (3, 6, 94, 2, True),   (3, 7, 88, 2, True),
    (3, 8, 182, 2, True),
]

# menu_item_id: (dish_name, description, price, [(ingredient_id, qty_required), ...])
MENU = {
    1: ("Chicken Rice Bowl", "Grilled chicken over garlic rice with onion garnish.", 189,
        [(1, 0.18), (3, 0.20), (7, 0.02), (8, 0.01), (9, 0.015)]),
    2: ("Beef Tapa Rice", "Tender beef strips with garlic rice and tomato.", 229,
        [(2, 0.16), (3, 0.20), (6, 0.04), (7, 0.02), (8, 0.01), (9, 0.015)]),
    3: ("Crispy Chicken Salad", "Crispy chicken with lettuce, tomato, and onion.", 179,
        [(1, 0.14), (5, 0.05), (6, 0.04), (7, 0.02), (9, 0.01)]),
    4: ("Creamy Garlic Pasta", "Pancit noodles in a creamy garlic sauce.", 169,
        [(4, 0.15), (10, 0.05), (8, 0.01), (9, 0.015), (7, 0.02)]),
    5: ("Garlic Chicken Noodles", "Stir-fried noodles with chicken, garlic, tomato, and onion.", 199,
        [(4, 0.14), (1, 0.10), (7, 0.02), (8, 0.01), (9, 0.015), (6, 0.03)]),
}

# (branch_id, ingredient_id): par_level
PAR_LEVELS = {
    (1, 1): 15, (1, 2): 10, (1, 3): 37.5, (1, 4): 12, (1, 5): 4, (1, 6): 4, (1, 7): 5, (1, 8): 2.5, (1, 9): 8, (1, 10): 5,
    (2, 1): 18.75, (2, 2): 10, (2, 3): 30, (2, 4): 12, (2, 5): 4, (2, 6): 4, (2, 7): 5, (2, 8): 2.5, (2, 9): 8, (2, 10): 5,
    (3, 1): 15, (3, 2): 10, (3, 3): 30, (3, 4): 12, (3, 5): 5, (3, 6): 4, (3, 7): 5, (3, 8): 3.125, (3, 9): 8, (3, 10): 5,
}

# Batches are seeded with their *remaining* quantity so branch stock lands on
# the same totals as the SQL file (consumption/transfers are already netted out).
# (sql_batch_id, branch, ingredient, supplier, lot, remaining, unit_cost, received_date, expiry)
BATCHES = [
    (1,  1, 1,  None, "OPEN-B1-01", 1.000, 238, "2026-08-25", "2026-10-15"),
    (2,  1, 2,  None, "OPEN-B1-02", 1.000, 418, "2026-08-25", "2026-10-15"),
    (4,  1, 4,  None, "OPEN-B1-04", 2.000, 82,  "2026-08-25", None),
    (5,  1, 5,  None, "OPEN-B1-05", 0.000, 132, "2026-08-25", "2026-09-22"),   # waste #1 (see WASTE)
    (6,  1, 6,  None, "OPEN-B1-06", 1.000, 94,  "2026-08-25", "2026-10-15"),
    (7,  1, 7,  None, "OPEN-B1-07", 1.160, 88,  "2026-08-25", "2026-10-15"),
    (8,  1, 8,  None, "OPEN-B1-08", 1.670, 175, "2026-08-25", "2026-10-15"),
    (10, 1, 10, None, "OPEN-B1-10", 2.000, 96,  "2026-08-25", "2026-10-15"),
    (11, 2, 1,  None, "OPEN-B2-01", 3.520, 238, "2026-08-25", "2026-09-20"),   # waste #2
    (12, 2, 2,  None, "OPEN-B2-02", 2.000, 418, "2026-08-25", "2026-10-15"),
    (13, 2, 3,  None, "OPEN-B2-03", 2.000, 61,  "2026-08-25", None),
    (14, 2, 4,  None, "OPEN-B2-04", 2.000, 82,  "2026-08-25", None),
    (15, 2, 5,  None, "OPEN-B2-05", 1.600, 132, "2026-08-25", "2026-10-15"),
    (16, 2, 6,  None, "OPEN-B2-06", 1.000, 94,  "2026-08-25", "2026-10-15"),
    (17, 2, 7,  None, "OPEN-B2-07", 2.000, 88,  "2026-08-25", "2026-10-15"),
    (18, 2, 8,  None, "OPEN-B2-08", 1.660, 175, "2026-08-25", "2026-10-15"),
    (19, 2, 9,  None, "OPEN-B2-09", 2.000, 118, "2026-08-25", None),
    (20, 2, 10, None, "OPEN-B2-10", 1.600, 96,  "2026-08-25", "2026-10-15"),
    (21, 3, 1,  None, "OPEN-B3-01", 4.760, 238, "2026-08-25", "2026-10-15"),
    (22, 3, 2,  None, "OPEN-B3-02", 1.000, 418, "2026-08-25", "2026-10-15"),
    (23, 3, 3,  None, "OPEN-B3-03", 2.000, 61,  "2026-08-25", None),
    (24, 3, 4,  None, "OPEN-B3-04", 2.000, 82,  "2026-08-25", None),
    (25, 3, 5,  None, "OPEN-B3-05", 2.000, 132, "2026-08-25", "2026-10-15"),
    (26, 3, 6,  None, "OPEN-B3-06", 0.950, 94,  "2026-08-25", "2026-09-21"),   # waste #3
    (27, 3, 7,  None, "OPEN-B3-07", 0.140, 88,  "2026-08-25", "2026-10-15"),
    (28, 3, 8,  None, "OPEN-B3-08", 1.630, 175, "2026-08-25", "2026-10-15"),
    (29, 3, 9,  None, "OPEN-B3-09", 2.000, 118, "2026-08-25", None),
    (30, 3, 10, None, "OPEN-B3-10", 1.650, 96,  "2026-08-25", "2026-10-15"),
    (31, 1, 3,  2, "LOT-B1-0904-031", 44.000, 61,  "2026-09-04", None),
    (32, 1, 9,  2, "LOT-B1-0904-032", 18.000, 118, "2026-09-04", None),
    (33, 1, 4,  2, "LOT-B1-0904-033", 18.000, 82,  "2026-09-04", None),
    (34, 1, 10, 2, "LOT-B1-0904-034", 11.650, 96,  "2026-09-04", "2026-09-11"),
    (35, 1, 3,  1, "LOT-B1-0918-035", 37.500, 61,  "2026-09-18", None),
    (36, 1, 9,  1, "LOT-B1-0918-036", 15.000, 120, "2026-09-18", None),
    (37, 1, 4,  1, "LOT-B1-0918-037", 13.500, 82,  "2026-09-18", None),
    (38, 1, 10, 1, "LOT-B1-0918-038", 9.000, 96,  "2026-09-18", "2026-09-25"),
    (39, 2, 1,  2, "LOT-B2-0904-039", 16.480, 245, "2026-09-04", "2026-09-18"),
    (40, 2, 2,  2, "LOT-B2-0904-040", 11.040, 418, "2026-09-04", "2026-09-14"),
    (41, 2, 3,  2, "LOT-B2-0904-041", 45.000, 61,  "2026-09-04", None),
    (42, 2, 7,  2, "LOT-B2-0904-042", 13.160, 88,  "2026-09-04", "2026-09-14"),
    (43, 2, 1,  1, "LOT-B2-0918-043", 15.000, 238, "2026-09-18", "2026-09-28"),
    (44, 2, 2,  1, "LOT-B2-0918-044", 9.000, 418, "2026-09-18", "2026-09-25"),
    (45, 2, 3,  1, "LOT-B2-0918-045", 33.750, 61,  "2026-09-18", None),
    (46, 2, 7,  1, "LOT-B2-0918-046", 10.500, 88,  "2026-09-18", "2026-09-25"),
    (47, 3, 1,  2, "LOT-B3-0904-047", 14.240, 245, "2026-09-04", "2026-09-25"),
    (48, 3, 3,  2, "LOT-B3-0904-048", 40.000, 61,  "2026-09-04", None),
    (49, 3, 5,  2, "LOT-B3-0904-049", 9.700, 132, "2026-09-04", "2026-09-11"),
    (50, 3, 6,  2, "LOT-B3-0904-050", 9.050, 94,  "2026-09-04", "2026-09-11"),
    (51, 3, 1,  1, "LOT-B3-0918-051", 13.500, 238, "2026-09-18", "2026-09-25"),
    (52, 3, 3,  1, "LOT-B3-0918-052", 30.000, 61,  "2026-09-18", None),
    (53, 3, 5,  1, "LOT-B3-0918-053", 7.500, 132, "2026-09-18", "2026-09-28"),
    (54, 3, 6,  1, "LOT-B3-0918-054", 7.500, 94,  "2026-09-18", "2026-09-28"),
    (55, 2, 3,  None, "TRF-01-055", 8.000, 61,  "2026-09-24", None),
    (56, 2, 9,  None, "TRF-01-056", 4.000, 118, "2026-09-24", None),
    (57, 1, 3,  None, "ADJ-B1-057", 1.200, 61,  "2026-09-26", None),
    (58, 2, 9,  None, "ADJ-B2-058", 0.800, 118, "2026-09-26", None),
]

# (branch, ingredient, sql_batch_id, quantity, reason, notes, recorded_by_employee)
# The batch is created with remaining + waste qty, then the waste call brings it
# back down to the SQL "remaining" figure.
WASTE = [
    (1, 5, 5,  2.5, "EXPIRED", "Lettuce passed its use-by date.",          3),
    (2, 1, 11, 3.0, "SPOILED", "Chicken developed off odor during storage.", 7),
    (3, 6, 26, 1.5, "EXPIRED", "Tomatoes became unsuitable for service.",    11),
]

# COMPLETED POS orders only: (branch, cashier_employee, [(menu_item_id, qty), ...])
COMPLETED_ORDERS = [
    (1, 2, [(2, 1), (4, 3), (5, 1)]), (1, 2, [(3, 3)]), (1, 2, [(4, 2), (1, 2)]), (1, 2, [(5, 1)]),
    (1, 2, [(1, 1), (3, 3)]), (1, 2, [(2, 3), (5, 3)]), (1, 2, [(3, 2), (5, 1)]), (1, 2, [(4, 1)]),
    (1, 2, [(5, 3), (2, 3)]), (1, 2, [(1, 3)]), (1, 2, [(2, 2), (4, 1), (5, 2)]), (1, 2, [(3, 1)]),
    (2, 6, [(3, 3), (5, 4)]), (2, 6, [(4, 2)]), (2, 6, [(5, 1), (2, 1)]), (2, 6, [(1, 1)]),
    (2, 6, [(2, 3), (4, 2)]), (2, 6, [(3, 2), (5, 1)]), (2, 6, [(4, 1), (1, 1)]), (2, 6, [(5, 3)]),
    (2, 6, [(1, 3), (3, 2)]), (2, 6, [(2, 2)]), (2, 6, [(3, 1), (5, 6)]), (2, 6, [(4, 3)]),
    (3, 10, [(4, 2), (1, 2), (5, 3)]), (3, 10, [(5, 1)]), (3, 10, [(1, 1), (3, 3)]), (3, 10, [(2, 3)]),
    (3, 10, [(3, 2), (5, 1)]), (3, 10, [(4, 1), (5, 2)]), (3, 10, [(5, 3), (2, 3)]), (3, 10, [(1, 3)]),
    (3, 10, [(2, 2), (4, 1)]), (3, 10, [(3, 1)]), (3, 10, [(4, 3), (1, 3), (5, 1)]), (3, 10, [(5, 2)]),
]


# =============================================================================
# SEEDING
# =============================================================================

print(f"Backend: {BASE}")
health = call("GET", "/")
print(f"  reachable: {health.get('service') if isinstance(health, dict) else health}")

if call("GET", "/branches/"):
    print("\nThe database already has branches, so I'm not adding demo data again.")
    print("To wipe it and start over, run reset_db.py from the backend folder, then run this again.")
    sys.exit(0)

# ---- branches ---------------------------------------------------------------
branch_map = {}
for sql_id, (name, addr, phone) in BRANCHES.items():
    r = require_data(call("POST", "/branches/", {"branch_name": name, "address": addr,
                                                 "contact_number": phone}), f"creating branch {name}")
    branch_map[sql_id] = r["branch_id"]

# ---- employees + login accounts ---------------------------------------------
emp_map = {}
for sql_id, (b, name, pos, phone, hired, username, role) in EMPLOYEES.items():
    r = require_data(call("POST", "/employees/", {"branch_id": branch_map[b], "full_name": name,
                                                  "position": pos, "contact_number": phone,
                                                  "hire_date": hired}), f"creating employee {name}")
    emp_map[sql_id] = r["employee_id"]
    call("POST", "/employees/accounts", {"employee_id": r["employee_id"], "username": username,
                                          "password": PASSWORD, "role": role})

token = require_data(call("POST", "/auth/login", {"username": "ana.santos", "password": PASSWORD}),
                     "logging in as Ana")["access_token"]

# ---- ingredients ------------------------------------------------------------
cat_map = {sql_id: require_data(call("POST", "/ingredients/categories", {"category_name": n}),
                                f"creating the {n} category")["category_id"]
           for sql_id, n in CATEGORIES.items()}

ing_map = {}
for sql_id, (name, unit, cat, perishable) in INGREDIENTS.items():
    ing_map[sql_id] = require_data(call("POST", "/ingredients/", {
        "ingredient_name": name, "unit_of_measure": unit,
        "category_id": cat_map[cat], "is_perishable": perishable}),
        f"creating ingredient {name}")["ingredient_id"]

# ---- suppliers ----------------------------------------------------------------
sup_map = {}
for sql_id, (name, contact, phone, email, addr) in SUPPLIERS.items():
    sup_map[sql_id] = require_data(call("POST", "/suppliers/", {
        "supplier_name": name, "contact_person": contact, "contact_number": phone,
        "email": email, "address": addr}), f"creating supplier {name}")["supplier_id"]

for sup, ing, cost, lead, preferred in SUPPLIER_INGREDIENTS:
    call("POST", "/suppliers/ingredient-links", {"supplier_id": sup_map[sup], "ingredient_id": ing_map[ing],
                                                  "unit_cost": cost, "lead_time_days": lead,
                                                  "is_preferred": preferred})

# ---- stock: PAR levels + batches ----------------------------------------------
for (b, ing), par in PAR_LEVELS.items():
    call("POST", "/inventory/branch-ingredient", {"branch_id": branch_map[b], "ingredient_id": ing_map[ing],
                                                   "par_level": par, "current_stock": 0})

waste_qty_by_batch = {w[2]: w[3] for w in WASTE}
batch_map = {}
for sql_id, b, ing, sup, lot, remaining, cost, received, expiry in BATCHES:
    qty = round(remaining + waste_qty_by_batch.get(sql_id, 0), 3)
    if qty <= 0:
        continue
    payload = {"branch_id": branch_map[b], "ingredient_id": ing_map[ing], "quantity_received": qty,
               "unit_cost": cost, "lot_number": lot, "expiration_date": expiry}
    if sup:
        payload["supplier_id"] = sup_map[sup]
    batch_map[sql_id] = require_data(call("POST", "/inventory/batches", payload),
                                     f"creating batch {lot}")["batch_id"]

# ---- menu with recipes -----------------------------------------------------
menu_map = {}
for sql_id, (dish, desc, price, recipe) in MENU.items():
    menu_map[sql_id] = require_data(call("POST", "/menu/", {
        "dish_name": dish, "description": desc, "price": price,
        "recipe": [{"ingredient_id": ing_map[i], "quantity_required": q} for i, q in recipe]}),
        f"creating {dish}")["menu_item_id"]

# ---- waste (batch_id matters: waste cost is priced from the batch) ----------
for b, ing, sql_batch, qty, reason, notes, by in WASTE:
    call("POST", "/inventory/waste", {"branch_id": branch_map[b], "ingredient_id": ing_map[ing],
                                       "batch_id": batch_map[sql_batch], "quantity": qty,
                                       "reason": reason, "notes": notes,
                                       "recorded_by": emp_map[by]})

# ---- sales (optional): completed orders deduct stock through the recipes ----
if REPLAY_SALES:
    for b, cashier, items in COMPLETED_ORDERS:
        o = require_data(call("POST", "/orders/", {
            "branch_id": branch_map[b], "employee_id": emp_map[cashier],
            "items": [{"menu_item_id": menu_map[m], "quantity": q} for m, q in items]}), "placing an order")
        call("POST", f"/orders/{o['order_id']}/finalize")

# ---- procurement: auto-recommend POs for low stock, push one per branch through
for sql_b, real_b in branch_map.items():
    pos = call("POST", f"/purchase-orders/generate-recommendations/{real_b}")
    if pos:
        first = pos[0]
        call("POST", f"/purchase-orders/{first['po_id']}/approve", token=token)
        call("POST", f"/purchase-orders/{first['po_id']}/send")
        call("POST", f"/purchase-orders/{first['po_id']}/receive", {"items": [
            {"po_item_id": it["po_item_id"], "quantity_received": it["ordered_quantity"],
             "lot_number": f"LOT-PO-RCV-B{sql_b}"}
            for it in first["items"]]})

# ---- summary -------------------------------------------------------------------
print("\nDone. Demo data created:")
print(f"  {len(branch_map)} branches, {len(emp_map)} employees, {len(ing_map)} ingredients, "
      f"{len(sup_map)} suppliers, {len(menu_map)} menu items, {len(batch_map)} batches")
for sql_b, real_b in branch_map.items():
    s = require_data(call("GET", f"/dashboard/branch/{real_b}/summary"), f"fetching dashboard for branch {real_b}")
    print(f"\n{BRANCHES[sql_b][0]} dashboard now reads:")
    print(f"  low-stock items     : {s['low_stock_count']}")
    print(f"  waste cost (7 days) : {s['waste_cost_last_7_days']}")
    print(f"  inventory value     : {s['total_inventory_value']}")
    print(f"  pending POs         : {s['pending_purchase_orders']}")
print(f"\nLogins (for /docs): ana.santos (ADMIN), bea.reyes / mika.cruz (MANAGER), others BRANCH_STAFF")
print(f"Password for everyone: {PASSWORD}")