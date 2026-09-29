import { useParams, useNavigate } from 'react-router';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';
import { useLoadEntity } from '../../hooks/useLoadEntity';
import { useDeleteEntity } from '../../hooks/useDeleteEntity';
import { getOne, deleteOne, type Employee } from '../../data/employees';
import { AsyncContent, Field } from '../TableFunctions/AsyncContent';
import PageContainer from '../PageContainer';

export default function EmployeeShow() {
  const { employeeId } = useParams();
  const navigate = useNavigate();

  const { data: employee, isLoading, error } = useLoadEntity(getOne, [Number(employeeId)]);
  const { handleDelete } = useDeleteEntity<Employee>({
    entityName: 'Employee',
    getLabel: (e) => e.name,
    deleteFn: (e) => deleteOne(e.id),
  });

  return (
    <PageContainer
      title={`Employee ${employeeId}`}
      breadcrumbs={[{ title: 'Employees', path: '/employees' }, { title: `Employee ${employeeId}` }]}
    >
      <Box sx={{ display: 'flex', flex: 1, width: '100%' }}>
        <AsyncContent isLoading={isLoading} error={error}>
          {employee && (
            <Box sx={{ flexGrow: 1, width: '100%' }}>
              <Grid container spacing={2} sx={{ width: '100%' }}>
                <Field label="Name" value={employee.name} />
                <Field label="Age" value={employee.age} />
                <Field label="Join date" value={dayjs(employee.joinDate).format('MMMM D, YYYY')} />
                <Field label="Department" value={employee.role} />
                <Field label="Full-time" value={employee.isFullTime ? 'Yes' : 'No'} />
              </Grid>
              <Divider sx={{ my: 3 }} />
              <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
                <Button variant="contained" startIcon={<ArrowBackIcon />} onClick={() => navigate('/employees')}>
                  Back
                </Button>
                <Stack direction="row" spacing={2}>
                  <Button variant="contained" startIcon={<EditIcon />} onClick={() => navigate(`/employees/${employeeId}/edit`)}>
                    Edit
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDelete(employee)(() => navigate('/employees'))}
                  >
                    Delete
                  </Button>
                </Stack>
              </Stack>
            </Box>
          )}
        </AsyncContent>
      </Box>
    </PageContainer>
  );
}