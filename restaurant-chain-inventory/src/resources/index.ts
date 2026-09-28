import type { GridColDef } from '@mui/x-data-grid';
import { api } from '../api/client';
import type { ResourceConfig } from './types';

// ---------- small helpers ----------

// id -> label lookup, used to show names instead of raw ids
async function nameMap(path: string, idKey: string, nameKey: string) {
  const rows: any[] = await api.get(path);
  return new Map<number, string>(rows.map((r) => [r[idKey], r[nameKey]]));
}
const label = (m: Map<number, string>, id: number | null | undefined) =>
  id == null ? '' : (m.get(id) ?? `#${id}`);

// The API sends timestamps as UTC without a "Z"; add it so the browser converts to local time.
const asUtc = (s: string) => (/[zZ]$|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`);
const fmtDate = (v: unknown) => (v ? (String(v).length === 10 ? String(v) : new Date(asUtc(String(v))).toLocaleDateString()) : '');
const fmtDateTime = (v: unknown) => (v ? new Date(asUtc(String(v))).toLocaleString() : '');
const money = (v: unknown) => (v == null || v === '' ? '' : `$${Number(v).toFixed(2)}`);
const pretty = (v: unknown) => {
  const s = String(v ?? '').replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const yesNo = (v: unknown) => (v ? 'Yes' : 'No');

const text = (field: string, headerName: string, extra: Partial<GridColDef> = {}): GridColDef => ({
  field, headerName, flex: 1, minWidth: 140, ...extra,
});
const num = (field: string, headerName: string, extra: Partial<GridColDef> = {}): GridColDef => ({
  field, headerName, type: 'number', width: 120, ...extra,
});
const id = (field: string, headerName = 'ID'): GridColDef => ({ field, headerName, type: 'number', width: 80 });
const date = (field: string, headerName: string): GridColDef => ({
  field, headerName, width: 130, valueFormatter: (v: unknown) => fmtDate(v),
});
const dateTime = (field: string, headerName: string): GridColDef => ({
  field, headerName, width: 190, valueFormatter: (v: unknown) => fmtDateTime(v),
});
const moneyCol = (field: string, headerName: string): GridColDef => ({
  field, headerName, type: 'number', width: 120, valueFormatter: (v: unknown) => money(v),
});
const enumCol = (field: string, headerName: string): GridColDef => ({
  field, headerName, width: 170, valueFormatter: (v: unknown) => pretty(v),
});

const q = (branchId: number | null) => (branchId != null ? `&branch_id=${branchId}` : '');

const ingredientOptions = async () =>
  (await api.get('/ingredients/?limit=500')).map((i: any) => ({ value: i.ingredient_id, label: `${i.ingredient_name} (${i.unit_of_measure})` }));
const categoryOptions = async () =>
  (await api.get('/ingredients/categories')).map((c: any) => ({ value: c.category_id, label: c.category_name }));

// ---------- the pages (paths match the sidebar links) ----------

export const resources: ResourceConfig[] = [
  // ===== Organization =====
  {
    path: '/organization/branches',
    title: 'Branches',
    idField: 'branch_id',
    refreshesBranches: true,
    columns: [id('branch_id'), text('branch_name', 'Name', { minWidth: 160 }), text('address', 'Address', { flex: 1.5, minWidth: 180 }),
      text('contact_number', 'Contact #', { flex: 0, width: 150 }), date('created_at', 'Created')],
    load: () => api.get('/branches/?limit=500'),
    form: {
      noun: 'branch',
      fields: [
        { name: 'branch_name', label: 'Branch name', required: true },
        { name: 'address', label: 'Address' },
        { name: 'contact_number', label: 'Contact number' },
      ],
      create: (p) => api.post('/branches/', p),
      update: (row, p) => api.patch(`/branches/${row.branch_id}`, p),
      remove: (row) => api.delete(`/branches/${row.branch_id}`),
      rowLabel: (r) => r.branch_name,
    },
  },

  // ===== Food =====
  {
    path: '/food/menu',
    title: 'Menu',
    idField: 'menu_item_id',
    notes: 'Add the recipe (ingredients per serving) when you create a dish. That is what lets a sale deduct stock. Existing recipes are listed on the Recipes page.',
    columns: [id('menu_item_id'), text('dish_name', 'Dish', { minWidth: 180 }), text('description', 'Description', { flex: 1.5 }),
      moneyCol('price', 'Price'), { field: 'is_active', headerName: 'Active', type: 'boolean', width: 100 }, num('ingredient_count', 'Ingredients')],
    load: async () => (await api.get('/menu/?limit=500')).map((m: any) => ({ ...m, ingredient_count: m.recipe.length })),
    form: {
      noun: 'menu item',
      fields: [
        { name: 'dish_name', label: 'Dish name', required: true },
        { name: 'description', label: 'Description', multiline: true },
        { name: 'price', label: 'Price', type: 'number', required: true },
        { name: 'is_active', label: 'Active (available to order)', type: 'boolean', default: true },
        { name: 'recipe', label: 'Recipe', type: 'recipe', createOnly: true, options: ingredientOptions },
      ],
      create: (p) => api.post('/menu/', p),
      update: (row, p) => api.patch(`/menu/${row.menu_item_id}`, p),
      remove: (row) => api.delete(`/menu/${row.menu_item_id}`),
      rowLabel: (r) => r.dish_name,
    },
  },
  {
    path: '/food/recipes',
    title: 'Recipes',
    idField: 'recipe_id',
    notes: 'Read-only. Each row is one ingredient in one dish. Recipes are set when a dish is created on the Menu page.',
    columns: [id('recipe_id'), text('dish_name', 'Dish', { minWidth: 180 }), text('ingredient_name', 'Ingredient'),
      num('quantity_required', 'Qty per serving', { width: 160 }), { field: 'unit', headerName: 'Unit', width: 100 }],
    load: async () => {
      const [menu, ingredients] = await Promise.all([api.get('/menu/?limit=500'), api.get('/ingredients/?limit=500')]);
      const byId = new Map<number, any>(ingredients.map((i: any) => [i.ingredient_id, i]));
      return menu.flatMap((m: any) =>
        m.recipe.map((r: any) => ({
          recipe_id: r.recipe_id,
          dish_name: m.dish_name,
          ingredient_name: byId.get(r.ingredient_id)?.ingredient_name ?? `#${r.ingredient_id}`,
          quantity_required: r.quantity_required,
          unit: byId.get(r.ingredient_id)?.unit_of_measure ?? '',
        })),
      );
    },
  },
  {
    path: '/food/ingredients',
    title: 'Ingredients',
    idField: 'ingredient_id',
    columns: [id('ingredient_id'), text('ingredient_name', 'Ingredient', { minWidth: 180 }), { field: 'unit_of_measure', headerName: 'Unit', width: 100 },
      text('category_name', 'Category'), { field: 'is_perishable', headerName: 'Perishable', type: 'boolean', width: 120 }],
    load: async () => {
      const [rows, cats] = await Promise.all([api.get('/ingredients/?limit=500'), nameMap('/ingredients/categories', 'category_id', 'category_name')]);
      return rows.map((r: any) => ({ ...r, category_name: label(cats, r.category_id) }));
    },
    form: {
      noun: 'ingredient',
      fields: [
        { name: 'ingredient_name', label: 'Ingredient name', required: true },
        { name: 'unit_of_measure', label: 'Unit (kg, L, pcs...)', required: true },
        { name: 'category_id', label: 'Category', type: 'select', options: categoryOptions },
        { name: 'is_perishable', label: 'Perishable', type: 'boolean', default: true },
      ],
      create: (p) => api.post('/ingredients/', p),
      update: (row, p) => api.patch(`/ingredients/${row.ingredient_id}`, p),
      remove: (row) => api.delete(`/ingredients/${row.ingredient_id}`),
      rowLabel: (r) => r.ingredient_name,
    },
  },
  {
    path: '/food/ingredient_categories',
    title: 'Ingredient Categories',
    idField: 'category_id',
    notes: 'The API supports adding categories but not renaming or deleting them yet.',
    columns: [id('category_id'), text('category_name', 'Category')],
    load: () => api.get('/ingredients/categories'),
    form: {
      noun: 'category',
      fields: [{ name: 'category_name', label: 'Category name', required: true }],
      create: (p) => api.post('/ingredients/categories', p),
    },
  },

  // ===== Sales =====
  {
    path: '/sales/order_log',
    title: 'Order Log',
    idField: 'order_id',
    branchScope: 'optional',
    notes: 'Read-only history. Ringing up new orders belongs on the Order Processing workflow page.',
    columns: [id('order_id', 'Order #'), text('branch_name', 'Branch', { flex: 0, width: 150 }), text('employee_name', 'Employee'),
      enumCol('status', 'Status'), moneyCol('total_amount', 'Total'), num('item_count', 'Items', { width: 90 }), dateTime('order_datetime', 'Date')],
    load: async ({ branchId }) => {
      const [orders, branches, employees] = await Promise.all([
        api.get(`/orders/?limit=500${q(branchId)}`),
        nameMap('/branches/?limit=500', 'branch_id', 'branch_name'),
        nameMap('/employees/?limit=500', 'employee_id', 'full_name'),
      ]);
      return orders.map((o: any) => ({
        ...o, branch_name: label(branches, o.branch_id), employee_name: label(employees, o.employee_id), item_count: o.items.length,
      }));
    },
  },
  {
    path: '/sales/order_items',
    title: 'Order Items',
    idField: 'order_item_id',
    branchScope: 'optional',
    notes: 'Read-only. One row per dish on each order.',
    columns: [id('order_item_id', 'Line #'), num('order_id', 'Order #', { width: 100 }), text('branch_name', 'Branch', { flex: 0, width: 150 }),
      text('dish_name', 'Dish', { minWidth: 180 }), num('quantity', 'Qty', { width: 90 }), moneyCol('unit_price', 'Unit price'),
      moneyCol('subtotal', 'Subtotal'), enumCol('order_status', 'Order status')],
    load: async ({ branchId }) => {
      const [orders, branches, dishes] = await Promise.all([
        api.get(`/orders/?limit=500${q(branchId)}`),
        nameMap('/branches/?limit=500', 'branch_id', 'branch_name'),
        nameMap('/menu/?limit=500', 'menu_item_id', 'dish_name'),
      ]);
      return orders.flatMap((o: any) =>
        o.items.map((it: any) => ({
          ...it, order_id: o.order_id, branch_name: label(branches, o.branch_id), dish_name: label(dishes, it.menu_item_id), order_status: o.status,
        })),
      );
    },
  },

  // ===== Inventory =====
  {
    path: '/inventory/ingredient_batches',
    title: 'Ingredient Batches',
    idField: 'batch_id',
    branchScope: 'required',
    notes: 'Read-only. Stock received in lots, soonest-expiring first. New batches arrive through purchase orders.',
    columns: [id('batch_id', 'Batch'), text('ingredient_name', 'Ingredient', { minWidth: 170 }), { field: 'lot_number', headerName: 'Lot #', width: 150 },
      num('quantity_received', 'Received'), num('quantity_remaining', 'Remaining'), moneyCol('unit_cost', 'Unit cost'),
      date('expiration_date', 'Expires'), date('received_date', 'Received on')],
    load: async ({ branchId }) => {
      const [stock, names] = await Promise.all([
        api.get(`/inventory/branch/${branchId}`),
        nameMap('/ingredients/?limit=500', 'ingredient_id', 'ingredient_name'),
      ]);
      const perIngredient = await Promise.all(stock.map((s: any) => api.get(`/inventory/batches/branch/${branchId}/ingredient/${s.ingredient_id}`)));
      return perIngredient
        .flat()
        .map((b: any) => ({ ...b, ingredient_name: label(names, b.ingredient_id) }))
        .sort((a: any, b: any) => (a.expiration_date ?? '9999').localeCompare(b.expiration_date ?? '9999'));
    },
  },
  {
    path: '/inventory/inventory_log',
    title: 'Inventory Log',
    idField: 'transaction_id',
    branchScope: 'required',
    notes: 'Read-only ledger of every stock movement: receipts, sales, waste, adjustments and transfers.',
    columns: [id('transaction_id', 'ID'), dateTime('transaction_date', 'When'), text('ingredient_name', 'Ingredient'),
      enumCol('transaction_type', 'Type'), num('quantity', 'Quantity'), text('notes', 'Notes', { flex: 2, minWidth: 220 })],
    load: async ({ branchId }) => {
      const [tx, names] = await Promise.all([
        api.get(`/inventory/transactions/branch/${branchId}?limit=500`),
        nameMap('/ingredients/?limit=500', 'ingredient_id', 'ingredient_name'),
      ]);
      return tx.map((t: any) => ({ ...t, ingredient_name: label(names, t.ingredient_id) }))
        .sort((a: any, b: any) => b.transaction_id - a.transaction_id);
    },
  },
  {
    path: '/inventory/stock_transfers',
    title: 'Stock Transfers',
    idField: 'transfer_id',
    branchScope: 'optional',
    notes: 'Read-only. Shows transfers where the selected branch is the sender or the receiver.',
    columns: [id('transfer_id', 'ID'), text('from_branch', 'From'), text('to_branch', 'To'), enumCol('status', 'Status'),
      num('item_count', 'Items', { width: 90 }), dateTime('requested_at', 'Requested'), dateTime('completed_at', 'Completed'), text('notes', 'Notes')],
    load: async ({ branchId }) => {
      const [transfers, branches] = await Promise.all([
        api.get(`/stock-transfers/?limit=500${q(branchId)}`),
        nameMap('/branches/?limit=500', 'branch_id', 'branch_name'),
      ]);
      return transfers.map((t: any) => ({
        ...t, from_branch: label(branches, t.from_branch_id), to_branch: label(branches, t.to_branch_id), item_count: t.items.length,
      }));
    },
  },
  {
    path: '/inventory/waste_log',
    title: 'Waste Log',
    idField: 'waste_id',
    branchScope: 'required',
    notes: 'Read-only. Spoiled, expired or damaged stock. Log new waste from the Inventory Operations workflow page.',
    columns: [id('waste_id', 'ID'), dateTime('waste_date', 'When'), text('ingredient_name', 'Ingredient'), num('quantity', 'Quantity'),
      enumCol('reason', 'Reason'), text('notes', 'Notes', { flex: 2, minWidth: 200 })],
    load: async ({ branchId }) => {
      const [waste, names] = await Promise.all([
        api.get(`/inventory/waste/branch/${branchId}`),
        nameMap('/ingredients/?limit=500', 'ingredient_id', 'ingredient_name'),
      ]);
      return waste.map((w: any) => ({ ...w, ingredient_name: label(names, w.ingredient_id) }));
    },
  },

  // ===== Procurement =====
  {
    path: '/procurement/suppliers',
    title: 'Suppliers',
    idField: 'supplier_id',
    columns: [id('supplier_id'), text('supplier_name', 'Supplier', { minWidth: 180 }), text('contact_person', 'Contact person'),
      text('contact_number', 'Contact #', { flex: 0, width: 150 }), text('email', 'Email'), text('address', 'Address')],
    load: () => api.get('/suppliers/?limit=500'),
    form: {
      noun: 'supplier',
      fields: [
        { name: 'supplier_name', label: 'Supplier name', required: true },
        { name: 'contact_person', label: 'Contact person' },
        { name: 'contact_number', label: 'Contact number' },
        { name: 'email', label: 'Email' },
        { name: 'address', label: 'Address' },
      ],
      create: (p) => api.post('/suppliers/', p),
      update: (row, p) => api.patch(`/suppliers/${row.supplier_id}`, p),
      remove: (row) => api.delete(`/suppliers/${row.supplier_id}`),
      rowLabel: (r) => r.supplier_name,
    },
  },
  {
    path: '/procurement/purchase_orders',
    title: 'Purchase Orders',
    idField: 'po_id',
    branchScope: 'optional',
    notes: 'Read-only list. Approving, sending and receiving orders belongs on the Procurement Management workflow page.',
    columns: [id('po_id', 'PO #'), text('branch_name', 'Branch', { flex: 0, width: 150 }), text('supplier_name', 'Supplier'),
      enumCol('status', 'Status'), { field: 'is_system_generated', headerName: 'Auto-generated', type: 'boolean', width: 140 },
      date('expected_delivery_date', 'Expected'), date('actual_delivery_date', 'Delivered'), num('item_count', 'Items', { width: 90 }),
      { field: 'has_discrepancy', headerName: 'Discrepancy', type: 'boolean', width: 120 }],
    load: async ({ branchId }) => {
      const [pos, branches, suppliers] = await Promise.all([
        api.get(`/purchase-orders/?limit=500${q(branchId)}`),
        nameMap('/branches/?limit=500', 'branch_id', 'branch_name'),
        nameMap('/suppliers/?limit=500', 'supplier_id', 'supplier_name'),
      ]);
      return pos.map((p: any) => ({
        ...p, branch_name: label(branches, p.branch_id), supplier_name: label(suppliers, p.supplier_id), item_count: p.items.length,
      }));
    },
  },
  {
    path: '/procurement/purchase_order_items',
    title: 'Purchase Order Items',
    idField: 'po_item_id',
    branchScope: 'optional',
    notes: 'Read-only. One row per ingredient on each purchase order.',
    columns: [id('po_item_id', 'Line #'), num('po_id', 'PO #', { width: 90 }), text('ingredient_name', 'Ingredient', { minWidth: 170 }),
      num('ordered_quantity', 'Ordered'), num('fulfilled_quantity', 'Received'), moneyCol('unit_cost', 'Unit cost'), enumCol('po_status', 'PO status')],
    load: async ({ branchId }) => {
      const [pos, names] = await Promise.all([
        api.get(`/purchase-orders/?limit=500${q(branchId)}`),
        nameMap('/ingredients/?limit=500', 'ingredient_id', 'ingredient_name'),
      ]);
      return pos.flatMap((p: any) =>
        p.items.map((it: any) => ({ ...it, po_id: p.po_id, ingredient_name: label(names, it.ingredient_id), po_status: p.status })),
      );
    },
  },

  // ===== Analytics =====
  {
    path: '/analytics/demand_forecasts',
    title: 'Demand Forecasts',
    idField: 'forecast_id',
    branchScope: 'required',
    notes: 'Saved forecasts appear here. Nothing yet? Generate one from the API docs (Demand Forecasting section) and refresh.',
    columns: [id('forecast_id', 'ID'), text('ingredient_name', 'Ingredient'), { field: 'method', headerName: 'Method', width: 150 },
      num('historical_days_used', 'History (days)', { width: 140 }), num('forecast_daily_demand', 'Daily demand', { width: 140 }),
      num('forecast_period_days', 'Period (days)', { width: 130 }), num('forecast_total_demand', 'Total demand', { width: 140 }), date('forecast_date', 'Forecast date')],
    load: async ({ branchId }) => {
      const [rows, names] = await Promise.all([
        api.get(`/forecast/branch/${branchId}/history`),
        nameMap('/ingredients/?limit=500', 'ingredient_id', 'ingredient_name'),
      ]);
      return rows.map((r: any) => ({ ...r, ingredient_name: label(names, r.ingredient_id) }));
    },
  },
  {
    path: '/analytics/reorder_predictions',
    title: 'Reorder Predictions',
    idField: 'ingredient_id',
    branchScope: 'required',
    notes: 'Live check of every tracked ingredient at this branch against its PAR level.',
    columns: [text('ingredient_name', 'Ingredient', { minWidth: 180 }), num('current_stock', 'In stock'), num('par_level', 'PAR level'),
      num('days_of_stock_remaining', 'Days left', { width: 110 }),
      { field: 'needs_reorder', headerName: 'Needs reorder?', width: 150, valueFormatter: (v: unknown) => yesNo(v) },
      num('suggested_order_quantity', 'Suggested order', { width: 150 })],
    load: ({ branchId }) => api.get(`/reorder/branch/${branchId}`),
  },
  {
    path: '/analytics/supplier_performance',
    title: 'Supplier Performance',
    idField: 'supplier_id',
    notes: 'On-time rate only counts deliveries that had an expected date to compare against.',
    columns: [text('supplier_name', 'Supplier', { minWidth: 200 }), num('total_purchase_orders', 'Received POs', { width: 150 }),
      num('total_delivered_on_time', 'On time', { width: 110 }), num('total_delivered_late', 'Late', { width: 110 }),
      { field: 'on_time_delivery_rate', headerName: 'On-time rate', type: 'number', width: 140,
        valueFormatter: (v: unknown) => `${Math.round(Number(v) * 100)}%` }],
    load: () => api.get('/dashboard/supplier-performance'),
  },
];
