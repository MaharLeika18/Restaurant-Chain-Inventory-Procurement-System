import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import FormHelperText from '@mui/material/FormHelperText';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent, SelectProps } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router';
import dayjs, { Dayjs } from 'dayjs';
import type { Employee } from '../../data/employees';
import { useBranch } from '../../context/BranchContext';

export interface EmployeeFormState {
  values: Partial<Omit<Employee, 'id'>>;
  errors: Partial<Record<keyof EmployeeFormState['values'], string>>;
}

export type FormFieldValue = string | string[] | number | boolean | File | null;

export interface EmployeeFormProps {
  formState: EmployeeFormState;
  onFieldChange: (
    name: keyof EmployeeFormState['values'],
    value: FormFieldValue,
  ) => void;
  onSubmit: (formValues: Partial<EmployeeFormState['values']>) => Promise<void>;
  onReset?: (formValues: Partial<EmployeeFormState['values']>) => void;
  submitButtonLabel: string;
  backButtonPath?: string;
}

interface ValidationResult<TValues> {
  issues: { path: (keyof TValues)[]; message: string }[];
}

interface UseCrudFormOptions<TValues extends Record<string, any>> {
  initialValues: Partial<TValues>;
  validate: (values: Partial<TValues>) => ValidationResult<TValues>;
  onSubmit: (values: Partial<TValues>) => Promise<void>;
  successMessage: string;
  failureMessagePrefix: string;
  onSuccess?: () => void;
}

export default function EmployeeForm(props: EmployeeFormProps) {
  const {
    formState,
    onFieldChange,
    onSubmit,
    onReset,
    submitButtonLabel,
    backButtonPath,
  } = props;

  const formValues = formState.values;
  const formErrors = formState.errors;

  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      setIsSubmitting(true);
      try {
        await onSubmit(formValues);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formValues, onSubmit],
  );

  const handleTextFieldChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFieldChange(
        event.target.name as keyof EmployeeFormState['values'],
        event.target.value,
      );
    },
    [onFieldChange],
  );

  const handleNumberFieldChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFieldChange(
        event.target.name as keyof EmployeeFormState['values'],
        Number(event.target.value),
      );
    },
    [onFieldChange],
  );

  const handleCheckboxFieldChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
      onFieldChange(event.target.name as keyof EmployeeFormState['values'], checked);
    },
    [onFieldChange],
  );

  const handleDateFieldChange = React.useCallback(
    (fieldName: keyof EmployeeFormState['values']) => (value: Dayjs | null) => {
      if (value?.isValid()) {
        onFieldChange(fieldName, value.toISOString() ?? null);
      } else if (formValues[fieldName]) {
        onFieldChange(fieldName, null);
      }
    },
    [formValues, onFieldChange],
  );

  const handleSelectFieldChange = React.useCallback(
    (event: SelectChangeEvent) => {
      onFieldChange(
        event.target.name as keyof EmployeeFormState['values'],
        event.target.value,
      );
    },
    [onFieldChange],
  );

  const handleReset = React.useCallback(() => {
    if (onReset) {
      onReset(formValues);
    }
  }, [formValues, onReset]);

  const handleBack = React.useCallback(() => {
    navigate(backButtonPath ?? '/employees');
  }, [navigate, backButtonPath]);

  const { branches } = useBranch();

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      autoComplete="off"
      onReset={handleReset}
      sx={{ width: '100%' }}
    >
      <FormGroup>
        <Grid container spacing={2} sx={{ mb: 2, width: '100%' }}>
          <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
            <TextField
              value={formValues.name ?? ''}
              onChange={handleTextFieldChange}
              name="name"
              label="Full name"
              error={!!formErrors.name}
              helperText={formErrors.name ?? ' '}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
            <FormControl error={!!formErrors.branch_id} fullWidth>
              <InputLabel id="employee-branch-label">Branch</InputLabel>
              <Select
                value={formValues.branch_id != null ? String(formValues.branch_id) : ''}
                onChange={(event) =>
                  onFieldChange('branch_id', Number((event.target as HTMLInputElement).value))
                }
                labelId="employee-branch-label"
                name="branch_id"
                label="Branch"
                fullWidth
              >
                {branches.map((branch: any) => (
                  <MenuItem key={branch.branch_id} value={String(branch.branch_id)}>
                    {branch.branch_name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>{formErrors.branch_id ?? ' '}</FormHelperText>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
            <TextField
              value={formValues.position ?? ''}
              onChange={handleTextFieldChange}
              name="position"
              label="Position"
              placeholder="e.g. Branch Manager, Cashier"
              error={!!formErrors.position}
              helperText={formErrors.position ?? ' '}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
            <TextField
              value={formValues.contact_number ?? ''}
              onChange={handleTextFieldChange}
              name="contact_number"
              label="Contact number"
              error={!!formErrors.contact_number}
              helperText={formErrors.contact_number ?? ' '}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                value={formValues.hire_date ? dayjs(formValues.hire_date) : null}
                onChange={handleDateFieldChange('hire_date')}
                name="hire_date"
                label="Hire date"
                slotProps={{
                  textField: {
                    error: !!formErrors.hire_date,
                    helperText: formErrors.hire_date ?? ' ',
                    fullWidth: true,
                  },
                }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
            <FormControl>
              <FormControlLabel
                name="is_active"
                control={
                  <Checkbox
                    size="large"
                    checked={formValues.is_active ?? true}
                    onChange={handleCheckboxFieldChange}
                  />
                }
                label="Active"
              />
              <FormHelperText error={!!formErrors.is_active}>
                {formErrors.is_active ?? ' '}
              </FormHelperText>
            </FormControl>
          </Grid>
        </Grid>
      </FormGroup>
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
        >
          Back
        </Button>
        <Button
          type="submit"
          variant="contained"
          size="large"
          loading={isSubmitting}
        >
          {submitButtonLabel}
        </Button>
      </Stack>
    </Box>
  );
}
