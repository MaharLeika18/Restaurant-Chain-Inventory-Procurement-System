import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import { DataGrid, GridPagination } from '@mui/x-data-grid';
import CustomizedTabs from './CustomizedTabs';
import { columns, rows, reorderColumns, reorderRows } from '../../data/gridData';

interface CustomFooterProps {
  createPath: string;
  selectedRows?: any[];
}

function CustomFooter({ createPath, selectedRows = [] }: CustomFooterProps) {
  const navigate = useNavigate();

  const handleCreateClick = React.useCallback(() => {
    navigate(createPath, { state: { selectedItems: selectedRows } });
  }, [navigate, createPath, selectedRows]);

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
      {/* Link this button to Purchase Order Page */}
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
  showCheckbox?: boolean;
}

function GridPanel({ rows, columns, createPath, showCheckbox = false }: GridPanelProps) {
  const [selectedRows, setSelectedRows] = React.useState<any[]>([]);

  return (
    <DataGrid sx={{ padding: 0 }}
      checkboxSelection={showCheckbox}
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
      onRowSelectionModelChange={(newSelection) => {
        const selected = rows.filter((row) => newSelection.includes(row.id));
        setSelectedRows(selected);
      }}
      slots={{
        footer: () => <CustomFooter createPath={createPath} selectedRows={selectedRows} />,
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

export default function CustomizedDataGrid() {
  return (
    <CustomizedTabs
      tabs={[
        {
          label: 'Expiration Tracking',
          content: (
            <GridPanel rows={rows} columns={columns} createPath="/employees/new" />
          ),
        },
        {
          label: 'Reorder Recommendations',
          content: (
            <GridPanel rows={reorderRows} columns={reorderColumns} createPath="/procurement/purchase-orders" showCheckbox={true} />
          ),
        },
      ]}
    />
  );
}