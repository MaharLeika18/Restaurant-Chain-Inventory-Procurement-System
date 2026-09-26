# Restaurant-Chain-Inventory-Procurement-System
Centralized system that manages inventory and procurement for a multi-branch restaurant chain. 

## Technologies used:
- React
- Tailwind
- FastAPI
- SQLAlchemy
- PostgreSQL

## Libraries used:
- Material UI
- Landing Page Components

## Workflow:
1. Branch 
2. Records inventory
3. System monitors consumption
4. Detects low-stock items
5. Forecasts demand
6. Generates purchase recommendation
7. Manager approves purchase
8. Supplier receives order
9. Branch receives inventory

## Features:
- Multi-branch inventory
- Ingredient-level inventory
- Supplier management
- Purchase orders
- Stock transfers between branches
- Expiration tracking
- Batch/lot tracking
- Automatic reorder points
- Demand forecasting
- Supplier performance analysis
- Waste tracking
- Inventory valuation

## Example
Suppose Branch A has:
 
Chicken:
Current stock: 25 kg
Average daily consumption: 12 kg
Supplier lead time: 3 days
Safety stock: 15 kg
 
The system can calculate when another order needs to be placed.

| Page | Purpose | Functions | Tables |
|---|---|---|---|
| Dashboard(s) | Low Stocks, Consumption, Demand Forecast, Reorder Recommendations, Inventory Valuation Report, Waste Report, Expiration Tracking, Supplier Performance Report, Summary Report (stock health, pending POs, alerts) | | |
| Order Processing | Order Entry, Order History | `createOrder`, `addOrderItem`, `finalizeOrder`, `getOrderById`, `listOrdersByBranch`, `refundOrder` | Order Log, Order Items, Menu |
| Inventory Operations | Inventory Receiving, Stock Count & Adjustment, Stock Transfer, Inventory Dashboard | `recordInventory`, `createBatch`, `recordAdjustment`, `recordWaste`, `createTransfer`, `approveTransfer`, `receeiveTransfer`, `getCurrentStock`, `filterByBranch`, `filterByCategory` | Inventory Log, Ingredient Batches, Ingredients, Waste Log, Stock Transfer, Stock Transfer Items |
| Procurement | Purchase Order (Creation, Approval, Details), Receive Purchase Order | `approvePurchaseOrder`, `rejectPurchaseOrder`, `editPOBeforeApproval`, `sendPurchaseOrder`, `getPOStatus`, `cancelPurchaseOrder`, `receivePurchaseOrder`, `martchReceivedQty`, `flagDiscrepancy` | Purchase Orders, Purchase Order Items, Reorder Predictions, Suppliers, Employees, Ingredient Batches, Inventory Log, Supplier Performance |

## Installation:
In your terminal:
1. cd to project directory
2. `python -m venv .venv`
3. `pip install -r requirements.txt`

To run the web app:
1. `cd restaurant-chain-inventory`
2. `npm run dev`

## Attributions:
ingredients by kliwir art from <a href="https://thenounproject.com/browse/icons/term/ingredients/" target="_blank" title="ingredients Icons">Noun Project</a> (CC BY 3.0)