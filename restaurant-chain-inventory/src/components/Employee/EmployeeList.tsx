import * as React from 'react';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import { GridActionsCellItem, GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router';
import { useDialogs } from '../../hooks/useDialogs/useDialogs';
import useNotifications from '../../hooks/useNotifications/useNotifications';
import { deleteOne, getMany, type Employee } from '../../data/employees';
import { useDeleteEntity } from '../../hooks/useDeleteEntity';
import PageContainer from '../PageContainer';
import ServerDataGrid, { ServerDataGridHandle } from '../TableFunctions/ServerDataGrid';

export default function EmployeeList() {
  const navigate = useNavigate();
  const dialogs = useDialogs();
  const notifications = useNotifications();
  const gridRef = React.useRef<ServerDataGridHandle>(null);
  const [isBusy, setIsBusy] = React.useState(false);

  const handleRefresh = React.useCallback(() => {
    if (!isBusy) gridRef.current?.reload();
  }, [isBusy]);

  const handleCreateClick = React.useCallback(() => {
    navigate('/employees/new');
  }, [navigate]);

  const handleRowEdit = React.useCallback(
    (employee: Employee) => () => {
      navigate(`/employees/${employee.id}/edit`);
    },
    [navigate],
  );

  const { handleDelete } = useDeleteEntity<Employee>({
    entityName: 'Employee',
    getLabel: (e) => e.name,
    deleteFn: (e) => deleteOne(e.id),
  });

  const columns = React.useMemo<GridColDef[]>(
    () => [
      { field: 'id', headerName: 'ID' },
      { field: 'name', headerName: 'Name', width: 140 },
      { field: 'age', headerName: 'Age', type: 'number' },
      {
        field: 'joinDate',
        headerName: 'Join date',
        type: 'date',
        valueGetter: (value) => value && new Date(value),
        width: 140,
      },
      {
        field: 'role',
        headerName: 'Department',
        type: 'singleSelect',
        valueOptions: ['Market', 'Finance', 'Development'],
        width: 160,
      },
      { field: 'isFullTime', headerName: 'Full-time', type: 'boolean' },
      {
        field: 'actions',
        type: 'actions',
        flex: 1,
        align: 'right',
        getActions: ({ row }) => [
          <GridActionsCellItem key="edit-item" icon={<EditIcon />} label="Edit" onClick={handleRowEdit(row)} />,
          <GridActionsCellItem key="delete-item" icon={<DeleteIcon />} label="Delete" onClick={() => handleDelete(row)(() => gridRef.current?.reload())}/>
        ],
      },
    ],
    [handleRowEdit],
  );

  const getRows = React.useCallback(getMany, []);
  
  return (
    <PageContainer
      title="Employees"
      breadcrumbs={[{ title: 'Employees' }]}
      actions={
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Tooltip title="Reload data" placement="right" enterDelay={1000}>
            <div>
              <IconButton size="small" aria-label="refresh" onClick={handleRefresh}>
                <RefreshIcon />
              </IconButton>
            </div>
          </Tooltip>
          <Button variant="contained" onClick={handleCreateClick} startIcon={<AddIcon />}>
            Create
          </Button>
        </Stack>
      }
    >
      <ServerDataGrid<Employee>
        ref={gridRef}
        columns={columns}
        getRows={getRows}
        onRowClick={(row) => navigate(`/employees/${row.id}`)}
      />
    </PageContainer>
  );
}
