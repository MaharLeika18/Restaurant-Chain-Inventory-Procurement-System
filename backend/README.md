# Backend — Restaurant Chain Inventory & Procurement System

FastAPI + SQLAlchemy 2.0 + PostgreSQL backend, covering the full workflow
from Branch stock through to Order Processing, Inventory Operations, and
Procurement, plus the prediction tables (Demand Forecasts, Reorder
Predictions) and dashboard/report endpoints.

## 1. Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env             # then edit DATABASE_URL for your local Postgres
```

```sql
CREATE DATABASE restaurant_inventory;
```

```bash
uvicorn app.main:app --reload
```

Tables auto-create on startup for local dev (`Base.metadata.create_all` in
`app/main.py`). Swap to Alembic migrations once the schema stabilizes.

Interactive docs: `http://localhost:8000/docs`

## 2. Project layout

```
app/
  main.py       FastAPI app, CORS, router registration, startup hook
  config.py     Settings (reads .env)
  database.py   SQLAlchemy engine/session, get_db() dependency
  models/       ORM models, one file per domain
  schemas/      Pydantic request/response models
  crud/         DB operations + business rules
  services/     Reorder-point algorithm, forecasting, PO auto-recommendations, dashboard reports
  routers/      FastAPI route handlers, one file per resource
```

## 3. Data model

**Main info:** `branches`, `employees` + `users` (login account, one per
employee), `ingredient_categories`, `ingredients` (chain-wide catalog),
`suppliers` + `supplier_ingredients` (price/lead time per pair),
`menu_items` + `recipe_ingredients` (a dish's bill of materials).

**Per-branch stock:** `branch_ingredients` holds the running `current_stock`,
the manager-set `par_level` (reorder trigger), and a cached
`nearest_expiry_date`. Kept separate from `ingredients` so a `Recipe` can
reference one ingredient chain-wide regardless of which branch is cooking it.

**Transactions:** `order_logs` + `order_items` (POS sales), `inventory_transactions`
(append-only ledger: RECEIPT/CONSUMPTION/ADJUSTMENT/TRANSFER_IN/TRANSFER_OUT/WASTE),
`waste_logs` (the "why" behind a WASTE ledger entry), `purchase_orders` +
`purchase_order_items` (ordered_quantity/fulfilled_quantity, approval +
discrepancy tracking), `batches` (lot/expiration tracking, FIFO), `stock_transfers`
+ `stock_transfer_items`.

**Predictions (persisted, not just computed on request):** `demand_forecasts`,
`reorder_predictions` - both are written every time their endpoint runs, so
the dashboard can show history, not just the live number.

## 4. How stock actually moves

- **A completed order** (`POST /orders/{id}/finalize`) explodes every dish's
  recipe and writes CONSUMPTION transactions per ingredient (FIFO from batches).
  `POST /orders/{id}/refund` reverses it with an ADJUSTMENT.
- **A received PO** (`POST /purchase-orders/{id}/receive`) creates a `Batch`
  per line item and a RECEIPT transaction.
- **A completed stock transfer** (`POST /stock-transfers/{id}/receive`) writes
  a TRANSFER_OUT at the source branch and a TRANSFER_IN at the destination.
- **Waste** (`POST /inventory/waste`) writes a WASTE transaction + a `WasteLog`
  row with a reason, and consumes from batches the same way.

## 5. Reorder-point algorithm

`app/services/reorder.py`. Triggers when `current_stock <= par_level`
(the manager-set threshold on `branch_ingredients`). Average daily demand
(from `services/forecasting.py`) and the linked supplier's lead time are
layered on top only to size the *suggested order quantity* and estimate
*days of stock remaining* - they don't change whether the trigger fires.

`POST /purchase-orders/generate-recommendations/{branch_id}` turns whatever's
flagged into draft POs, grouped by preferred supplier, ready for a manager
to approve.

## 6. Demand forecasting

`app/services/forecasting.py`. Primary source: completed `order_items`
exploded through each dish's `Recipe` (real usage from what customers
ordered). Falls back to the raw `inventory_transactions` CONSUMPTION ledger
if there's no order history yet for that branch/ingredient. Moving average
over a lookback window (default 30 days); every call persists a
`DemandForecast` row.

## 7. Mapping to the team's page/function plan

| Page | Functions | Where |
|---|---|---|
| Order Processing | `createOrder`, `addOrderItem`, `finalizeOrder`, `getOrderById`, `listOrdersByBranch`, `refundOrder` | `routers/orders.py` |
| Inventory Operations | `recordInventory`, `createBatch`, `recordAdjustment`, `recordWaste`, `createTransfer`, `approveTransfer`, `receiveTransfer`, `getCurrentStock`, `filterByBranch`, `filterByCategory` | `routers/inventory.py`, `routers/stock_transfers.py` |
| Procurement | `approvePurchaseOrder`, `rejectPurchaseOrder`, `editPOBeforeApproval`, `sendPurchaseOrder`, `getPOStatus`, `cancelPurchaseOrder`, `receivePurchaseOrder`, `matchReceivedQty`, `flagDiscrepancy` | `routers/purchase_orders.py` |
| Dashboard(s) | Low Stocks, Consumption, Demand Forecast, Reorder Recommendations, Inventory Valuation, Waste Report, Expiration Tracking, Supplier Performance, Summary | `routers/reports.py`, `routers/reorder.py`, `routers/forecasting.py` |

Every generic function also has a plain REST equivalent (e.g. `approvePurchaseOrder`
is both `POST /purchase-orders/{id}/approve` and the general
`PATCH /purchase-orders/{id}/status`) - use whichever is more convenient
from the frontend; they call the same CRUD code underneath.

### Design calls worth flagging to the team

- **Ingredient stays branch-agnostic** (no `branch_id` directly on it) so
  `Recipe` can reference one row chain-wide. Per-branch stock/PAR
  level/nearest-expiry live in `branch_ingredients` instead - same role a
  simple "Ingredient with branch_id" would have played, just normalized.
- **`ordered_quantity`/`fulfilled_quantity` live on `purchase_order_items`**
  (per ingredient line), not the PO header, since one PO can carry several
  ingredients.
- **Discrepancy detection** happens automatically the moment a PO is closed
  out as `RECEIVED` (via `/receive` or a manual `PATCH /status`) if any
  line's fulfilled quantity doesn't match what was ordered - covers both
  over-delivery and a manager closing out a permanently short shipment.
  `flagDiscrepancy` is also exposed directly for anything else (wrong item,
  damaged box, pricing issue).
- **Supplier Performance isn't a stored table** - it's computed on request
  in `services/reports.py` from `purchase_orders.expected_delivery_date` vs
  `actual_delivery_date`. Flag if the team wants it persisted/snapshotted
  like the other prediction tables instead.

## 8. Auth

`POST /auth/login` (`{username, password}`) returns a JWT (`access_token`,
8-hour expiry by default). Send it as `Authorization: Bearer <token>` on
subsequent requests. `GET /auth/me` returns the logged-in user's identity.

A user account is created via `POST /employees/accounts` (`{employee_id,
username, password, role}`) - one account per `Employee`, password is
hashed with bcrypt before storage (never stored or returned in plaintext).

**Role-gated actions** (require a MANAGER or ADMIN token; anyone else gets
403, no token gets 401):
- `POST /purchase-orders/{id}/approve`, `/reject`, `/cancel`
- `POST /stock-transfers/{id}/approve`

Everything else is currently open (no token required) so the rest of the
frontend can be built/tested without wiring auth into every screen first.
Add `Depends(require_role(...))` from `app/services/auth.py` to any other
route your team wants gated the same way - `approve`/`reject`/`cancel` above
show the pattern. `approved_by` on both POs and transfers defaults to the
logged-in user's `employee_id` if not passed explicitly.

Change `JWT_SECRET_KEY` in `.env` before deploying anywhere beyond your own
machine - the default in `.env.example` is not safe to use as-is.

## 9. Not yet implemented

- Alembic migrations (currently relies on `create_all` for local dev)
- Refresh tokens / logout / password-reset flow (login + `/me` only, for now)
