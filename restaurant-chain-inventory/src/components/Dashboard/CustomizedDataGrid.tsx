import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import { DataGrid, GridPagination } from '@mui/x-data-grid';
import CustomizedTabs from './CustomizedTabs'; 
import { columns, rows } from '../../data/gridData';

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
    <DataGrid sx={{ padding: 0 }}
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
            // TODO: fix routing
            <GridPanel rows={rows} columns={columns} createPath="/grid-2/new" />
          ),
        },
      ]}
    />
  );
}