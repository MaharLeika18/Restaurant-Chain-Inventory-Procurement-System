import { useParams, useNavigate } from 'react-router';
import { useLoadEntity } from '../../hooks/useLoadEntity';
import { useCrudForm } from '../../hooks/useCrudForm';
import { getOne, updateOne, validateEmployee, type Employee, type EmployeeFormState } from '../../data/employees';
import { AsyncContent } from '../TableFunctions/AsyncContent';
import EmployeeForm from './EmployeeForm';
import PageContainer from '../PageContainer';
import Box from '@mui/material/Box';

function EmployeeEditForm({
  employeeId,
  initialValues,
  onSaved,
}: {
  employeeId: string;
  initialValues: Partial<EmployeeFormState['values']>;
  onSaved: (employee: Employee) => void;
}) {
  const navigate = useNavigate();

  const { formState, handleFieldChange, handleReset, handleSubmit } = useCrudForm<Employee>({
    initialValues,
    validate: validateEmployee,
    onSubmit: async (values) => {
      onSaved(await updateOne(Number(employeeId), values));
    },
    successMessage: 'Employee edited successfully.',
    failureMessagePrefix: 'Failed to edit employee. Reason:',
    onSuccess: () => navigate('/employees'),
  });

  return (
    <EmployeeForm
      formState={formState}
      onFieldChange={handleFieldChange}
      onSubmit={handleSubmit}
      onReset={handleReset}
      submitButtonLabel="Save"
      backButtonPath={`/employees/${employeeId}`}
    />
  );
}

export default function EmployeeEdit() {
  const { employeeId } = useParams();
  const { data: employee, isLoading, error, setData } = useLoadEntity(getOne, [Number(employeeId)]);

  return (
    <PageContainer
      title={`Edit Employee ${employeeId}`}
      breadcrumbs={[
        { title: 'Employees', path: '/employees' },
        { title: `Employee ${employeeId}`, path: `/employees/${employeeId}` },
        { title: 'Edit' },
      ]}
    >
      <Box sx={{ display: 'flex', flex: 1 }}>
        <AsyncContent isLoading={isLoading} error={error}>
          {employee && (
            <EmployeeEditForm employeeId={employeeId!} initialValues={employee} onSaved={setData} />
          )}
        </AsyncContent>
      </Box>
    </PageContainer>
  );
}