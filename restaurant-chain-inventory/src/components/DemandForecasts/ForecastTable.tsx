import * as React from 'react';
import { useNavigate } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import { DataGrid, GridColDef, GridPagination } from '@mui/x-data-grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { api } from '../../api/client';
import { useBranch } from '../../context/BranchContext';

function GridPanel({ rows, columns }: { rows: readonly any[]; columns: readonly any[] }) {
  return (
    <DataGrid
      sx={{ padding: 0 }}
      rows={rows}
      columns={columns}
      getRowClassName={(params) =>
        params.indexRelativeToCurrentPage % 2 === 0 ? 'even' : 'odd'
      }
      initialState={{
        pagination: { paginationModel: { pageSize: 20 } },
      }}
      pageSizeOptions={[10, 20, 50]}
      disableColumnResize
      density="compact"
      slots={{
        footer: () => <GridPagination />,
      }}
      slotProps={{
        filterPanel: {
          filterFormProps: {
            logicOperatorInputProps: {
              variant: 'outlined',
              size: 'small',
            },
            columnInputProps: {
              variant: 'outlined',
              size: 'small',
              sx: { mt: 'auto' },
            },
            operatorInputProps: {
              variant: 'outlined',
              size: 'small',
              sx: { mt: 'auto' },
            },
            valueInputProps: {
              InputComponentProps: {
                variant: 'outlined',
                size: 'small',
              },
            },
          },
        },
      }}
    />
  );
}

// Mirrors app/schemas/forecast.py's DemandForecastOut - there is no stored
// "confidence" score in the backend, so that column is replaced with the
// real "Method" the forecast was generated with (moving_average or
// weighted_average) rather than showing a number the backend never computed.
const columns: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 70 },
  { field: 'ingredient', headerName: 'Ingredient', flex: 1, minWidth: 160 },
  { field: 'method', headerName: 'Method', width: 150 },
  { field: 'forecast_daily_demand', headerName: 'Daily Demand', type: 'number', width: 130 },
  { field: 'forecast_total_demand', headerName: 'Forecasted Qty', type: 'number', width: 140 },
  { field: 'historical_days_used', headerName: 'History Used (days)', type: 'number', width: 160 },
  {
    field: 'start_date', headerName: 'Generated', type: 'date',
    valueGetter: (value) => value && new Date(value), width: 130,
  },
  {
    field: 'end_date', headerName: 'Through', type: 'date',
    valueGetter: (value) => value && new Date(value), width: 130,
  },
];

export default function CustomizedDataGrid() {
  const { branchId } = useBranch();
  const [rows, setRows] = React.useState<any[]>([]);
  const [ingredients, setIngredients] = React.useState<any[]>([]);
  const [selectedIngredient, setSelectedIngredient] = React.useState('');
  const [generating, setGenerating] = React.useState(false);

  const load = React.useCallback(() => {
    if (branchId == null) return;
    Promise.all([
      api.get(`/forecast/branch/${branchId}/history`),
      api.get('/ingredients/?limit=500'),
    ]).then(([history, ingredientRows]: any[]) => {
      setIngredients(ingredientRows);
      const nameById = new Map(ingredientRows.map((i: any) => [i.ingredient_id, i.ingredient_name]));
      setRows(
        history.map((f: any) => {
          const generated = new Date(f.forecast_date);
          const through = new Date(generated.getTime() + f.forecast_period_days * 86400000);
          return {
            id: f.forecast_id,
            ingredient: nameById.get(f.ingredient_id) ?? `#${f.ingredient_id}`,
            method: f.method,
            forecast_daily_demand: f.forecast_daily_demand,
            forecast_total_demand: f.forecast_total_demand,
            historical_days_used: f.historical_days_used,
            start_date: f.forecast_date,
            end_date: through.toISOString(),
          };
        }),
      );
    });
  }, [branchId]);
  React.useEffect(() => { load(); }, [load]);

  const handleGenerate = async () => {
    if (!selectedIngredient || branchId == null) return;
    setGenerating(true);
    try {
      await api.get(`/forecast/branch/${branchId}/ingredient/${selectedIngredient}?lookback_days=30&forecast_period_days=7`);
      load();
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }} alignItems="center">
        <TextField select size="small" label="Ingredient" sx={{ minWidth: 200 }} value={selectedIngredient} onChange={(e) => setSelectedIngredient(e.target.value)}>
          {ingredients.map((i: any) => <MenuItem key={i.ingredient_id} value={i.ingredient_id}>{i.ingredient_name}</MenuItem>)}
        </TextField>
        <Button variant="contained" onClick={handleGenerate} disabled={!selectedIngredient || generating}>
          {generating ? 'Generating…' : 'Generate forecast'}
        </Button>
      </Stack>
      <GridPanel rows={rows} columns={columns} />
    </Box>
  );
}