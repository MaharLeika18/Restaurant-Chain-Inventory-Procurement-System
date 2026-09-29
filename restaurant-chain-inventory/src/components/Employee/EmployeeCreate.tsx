import { useNavigate } from 'react-router';
import { useCrudForm } from '../../hooks/useCrudForm';
import { createOneEmployee, validateEmployee, type Employee, type EmployeeFormState } from '../../data/employees';
import EmployeeForm from './EmployeeForm';
import PageContainer from '../PageContainer';

const INITIAL_FORM_VALUES: Partial<EmployeeFormState['values']> = {
  role: 'Market',
  isFullTime: true,
};

export default function EmployeeCreate() {
  const navigate = useNavigate();

  const { formState, handleFieldChange, handleReset, handleSubmit } = useCrudForm<Employee>({
    initialValues: INITIAL_FORM_VALUES,
    validate: validateEmployee,
    onSubmit: async (values) => {
      await createOneEmployee(values as Omit<Employee, 'id'>);
    },
    successMessage: 'Employee created successfully.',
    failureMessagePrefix: 'Failed to create employee. Reason:',
    onSuccess: () => navigate('/employees'),
  });

  return (
    <PageContainer title="New Employee" breadcrumbs={[{ title: 'Employees', path: '/employees' }, { title: 'New' }]}>
      <EmployeeForm
        formState={formState}
        onFieldChange={handleFieldChange}
        onSubmit={handleSubmit}
        onReset={handleReset}
        submitButtonLabel="Create"
      />
    </PageContainer>
  );
}