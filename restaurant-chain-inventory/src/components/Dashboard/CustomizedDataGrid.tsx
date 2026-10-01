import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import AddIcon from '@mui/icons-material/Add';
import { DataGrid, GridPagination, GridColDef } from '@mui/x-data-grid';
import CustomizedTabs from './CustomizedTabs';
import { useBranch } from '../../context/BranchContext';
import { api } from '../../api/client';

interface CustomFooterProps {
  createPath?: string;
  createLabel?: string;
  selectedRows?: any[];
}

function CustomFooter({ createPath, createLabel = 'Create', selectedRows = [] }: CustomFooterProps) {
  const navigate = useNavigate();

  const handleCreateClick = React.useCallback(() => {
    if (createPath) navigate(createPath, { state: { selectedItems: selectedRows } });
  }, [navigate, createPath, selectedRows]);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', px: 1 }}>
      {createPath ? (
        <Button variant="contained" onClick={handleCreateClick} startIcon={<AddIcon />} disabled={createPath.includes('/new') && selectedRows.length === 0}>
          {createLabel}
        </Button>
      ) : (
        <Box />
      )}
      <GridPagination />
    </Box>
  );
}

interface GridPanelProps {
  rows: readonly any[];
  columns: readonly any[];
  createPath?: string;
  createLabel?: string;
  showCheckbox?: boolean;
  loading?: boolean;
}

function GridPanel({ rows, columns, createPath, createLabel, showCheckbox = false, loading = false }: GridPanelProps) {
  const [selectedRows, setSelectedRows] = React.useState<any[]>([]);

  return (
    <DataGrid sx={{ padding: 0 }}
      checkboxSelection={showCheckbox}
      rows={rows}
      columns={columns}
      loading={loading}
      getRowClassName={(params) =>
        params.indexRelativeToCurrentPage % 2 === 0 ? 'even' : 'odd'
      }
      initialState={{
        pagination: { paginationModel: { pageSize: 20 } },
      }}
      pageSizeOptions={[10, 20, 50]}
      disableColumnResize
      density="compact"
      onRowSelectionModelChange={(newSelection: any) => {
        // MUI X v9's selection model is { type: 'include' | 'exclude', ids: Set<GridRowId> },
        // not a plain array of ids.
        const ids: Set<any> = newSelection.ids ?? new Set();
        const selected = newSelection.type === 'exclude'
          ? rows.filter((row) => !ids.has(row.id))
          : rows.filter((row) => ids.has(row.id));
        setSelectedRows(selected);
      }}
      slots={{
        footer: () => <CustomFooter createPath={createPath} createLabel={createLabel} selectedRows={selectedRows} />,
      }}
      slotProps={{
        filterPanel: {
          filterFormProps: {
            logicOperatorInputProps: { variant: 'outlined', size: 'small' },
            columnInputProps: { variant: 'outlined', size: 'small', sx: { mt: 'auto' } },
            operatorInputProps: { variant: 'outlined', size: 'small', sx: { mt: 'auto' } },
            valueInputProps: { InputComponentProps: { variant: 'outlined', size: 'small' } },
          },
        },
      }}
    />
  );
}

const expirationColumns: GridColDef[] = [
  { field: 'ingredient', headerName: 'Ingredient', flex: 1.2, minWidth: 160 },
  { field: 'branch', headerName: 'Branch', flex: 0.8, minWidth: 120 },
  { field: 'lotNumber', headerName: 'Lot #', flex: 0.8, minWidth: 120 },
  { field: 'quantityRemaining', headerName: 'Qty Remaining', headerAlign: 'right', align: 'right', flex: 0.7, minWidth: 110 },
  { field: 'expirationDate', headerName: 'Expires', flex: 0.7, minWidth: 110 },
  {
    field: 'daysLeft', headerName: 'Days Left', headerAlign: 'right', align: 'right', flex: 0.6, minWidth: 100,
    renderCell: (params) => (
      <Chip size="small" label={params.value <= 0 ? 'Expired' : `${params.value}d`} color={params.value <= 0 ? 'error' : params.value <= 3 ? 'warning' : 'default'} />
    ),
  },
];

const reorderColumns: GridColDef[] = [
  { field: 'ingredient', headerName: 'Ingredient', flex: 1.5, minWidth: 180 },
  { field: 'branch', headerName: 'Branch', flex: 0.8, minWidth: 120 },
  { field: 'currentStock', headerName: 'Current Stock', headerAlign: 'right', align: 'right', flex: 0.6, minWidth: 100 },
  { field: 'parLevel', headerName: 'PAR Level', headerAlign: 'right', align: 'right', flex: 0.6, minWidth: 100 },
  { field: 'recommendedQty', headerName: 'Recommended Qty', headerAlign: 'right', align: 'right', flex: 0.6, minWidth: 120 },
  { field: 'suggestedSupplier', headerName: 'Suggested Supplier', flex: 1, minWidth: 150 },
  {
    field: 'urgency', headerName: 'Urgency', flex: 0.6, minWidth: 100,
    renderCell: (params) => (
      <Chip size="small" label={params.value} color={params.value === 'Critical' ? 'error' : params.value === 'Low' ? 'warning' : 'default'} />
    ),
  },
];

export default function CustomizedDataGrid() {
  const { branches, branchId } = useBranch();
  const [expiring, setExpiring] = React.useState<any[]>([]);
  const [reorder, setReorder] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (branchId == null) return;
    setLoading(true);
    const branchName = branches.find((b: any) => b.branch_id === branchId)?.branch_name ?? '';

    Promise.all([
      api.get(`/inventory/branch/${branchId}`),
      api.get('/ingredients/?limit=500'),
      api.get('/reorder/branch/' + branchId),
      api.get('/suppliers/?limit=500'),
    ])
      .then(async ([stock, ingredients, reorderChecks, suppliers]: any[]) => {
        const ingredientById = new Map(ingredients.map((i: any) => [i.ingredient_id, i]));

        // Expiration Tracking: soonest-expiring active batches at this branch.
        const perIngredientBatches = await Promise.all(
          stock.map((s: any) => api.get(`/inventory/batches/branch/${branchId}/ingredient/${s.ingredient_id}?only_available=true`)),
        );
        const today = new Date();
        const expiringRows = perIngredientBatches
          .flat()
          .filter((b: any) => b.expiration_date)
          .map((b: any) => {
            const days = Math.ceil((new Date(b.expiration_date).getTime() - today.getTime()) / 86400000);
            return {
              id: b.batch_id,
              ingredient: ingredientById.get(b.ingredient_id)?.ingredient_name ?? `#${b.ingredient_id}`,
              branch: branchName,
              lotNumber: b.lot_number || `BATCH-${b.batch_id}`,
              quantityRemaining: b.quantity_remaining,
              expirationDate: b.expiration_date,
              daysLeft: days,
            };
          })
          .sort((a: any, b: any) => a.daysLeft - b.daysLeft);
        setExpiring(expiringRows);

        // Reorder Recommendations: everything below PAR at this branch, with a
        // suggested supplier - feeds straight into Create Purchase Order.
        const flagged = reorderChecks.filter((r: any) => r.needs_reorder);
        const reorderRows = await Promise.all(
          flagged.map(async (r: any) => {
            const links = await api.get(`/suppliers/ingredient-links/by-ingredient/${r.ingredient_id}`);
            const preferred = links.find((l: any) => l.is_preferred) ?? links[0];
            const supplier = preferred ? suppliers.find((s: any) => s.supplier_id === preferred.supplier_id) : null;
            const ratio = r.par_level > 0 ? r.current_stock / r.par_level : 1;
            return {
              id: String(r.ingredient_id),
              ingredient: ingredientById.get(r.ingredient_id)?.ingredient_name ?? `#${r.ingredient_id}`,
              branch: branchName,
              branchId,
              currentStock: r.current_stock,
              parLevel: r.par_level,
              recommendedQty: r.suggested_order_quantity,
              suggestedSupplier: supplier?.supplier_name ?? 'None configured',
              suggestedSupplierId: supplier?.supplier_id ?? null,
              unitCost: preferred?.unit_cost ?? 0,
              urgency: ratio <= 0.5 ? 'Critical' : ratio <= 1 ? 'Low' : 'Normal',
            };
          }),
        );
        setReorder(reorderRows);
      })
      .finally(() => setLoading(false));
  }, [branchId, branches]);

  return (
    <CustomizedTabs
      tabs={[
        {
          label: 'Expiration Tracking',
          content: <GridPanel rows={expiring} columns={expirationColumns} loading={loading} />,
        },
        {
          label: 'Reorder Recommendations',
          content: (
            <GridPanel
              rows={reorder}
              columns={reorderColumns}
              createPath="/procurement_management/new"
              createLabel="Create PO"
              showCheckbox
              loading={loading}
            />
          ),
        },
      ]}
    />
  );
}
