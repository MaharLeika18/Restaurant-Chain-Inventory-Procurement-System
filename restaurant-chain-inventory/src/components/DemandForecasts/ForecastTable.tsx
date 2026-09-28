import * as React from 'react';
import { useNavigate } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import { DataGrid, GridColDef, GridPagination } from '@mui/x-data-grid';

interface CustomFooterProps {
  createPath: string;
}

function CustomFooter({ createPath }: CustomFooterProps) {
  const navigate = useNavigate();

  const handleCreateClick = React.useCallback(() => {
    navigate(createPath);
  }, [navigate, createPath]);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        px: 1,
      }}
    >
      {/* TODO: link this button to Purchase Order Page */}
      <Button variant="contained" onClick={handleCreateClick} startIcon={<AddIcon />}>
        Create
      </Button>
      <GridPagination />
    </Box>
  );
}

interface GridPanelProps {
  rows: readonly any[];
  columns: readonly any[];
  createPath: string;
}

function GridPanel({ rows, columns, createPath }: GridPanelProps) {
  return (
    <DataGrid
      sx={{ padding: 0 }}
      checkboxSelection
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
        footer: () => <CustomFooter createPath={createPath} />,
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

// TODO: REPLACE WITH SQLALCHEMY + POSTGRESQL
const dummyData = [
  {
    id: 1,
    ingredient: 'Chicken Breast',
    quantity: 85,
    forecasted_quantity: 120,
    forecast_confidence: 0.92,
    start_date: '2026-08-01',
    end_date: '2026-08-31',
  },
  {
    id: 2,
    ingredient: 'All-Purpose Flour',
    quantity: 150,
    forecasted_quantity: 180,
    forecast_confidence: 0.88,
    start_date: '2026-08-01',
    end_date: '2026-08-31',
  },
  {
    id: 3,
    ingredient: 'White Sugar',
    quantity: 95,
    forecasted_quantity: 110,
    forecast_confidence: 0.84,
    start_date: '2026-08-01',
    end_date: '2026-08-31',
  },
  {
    id: 4,
    ingredient: 'Cooking Oil',
    quantity: 60,
    forecasted_quantity: 75,
    forecast_confidence: 0.91,
    start_date: '2026-08-01',
    end_date: '2026-08-31',
  },
  {
    id: 5,
    ingredient: 'Tomato Sauce',
    quantity: 45,
    forecasted_quantity: 70,
    forecast_confidence: 0.79,
    start_date: '2026-08-01',
    end_date: '2026-08-31',
  },
];

const dummyColumns: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 70 },
  { field: 'ingredient', headerName: 'Ingredient', flex: 1, minWidth: 160 },
  { field: 'quantity', headerName: 'Quantity', type: 'number', width: 110 },
  {
    field: 'forecasted_quantity',
    headerName: 'Forecasted Qty',
    type: 'number',
    width: 140,
  },
  {
    field: 'forecast_confidence',
    headerName: 'Confidence',
    type: 'number',
    width: 120,
    valueFormatter: (value: number) => `${Math.round(value * 100)}%`,
  },
  {
    field: 'start_date',
    headerName: 'Start Date',
    type: 'date',
    valueGetter: (value) => value && new Date(value),
    width: 130,
  },
  {
    field: 'end_date',
    headerName: 'End Date',
    type: 'date',
    valueGetter: (value) => value && new Date(value),
    width: 130,
  },
];

export default function CustomizedDataGrid() {
  return (
    <GridPanel rows={dummyData} columns={dummyColumns} createPath="/ingredients/new" />
  );
}