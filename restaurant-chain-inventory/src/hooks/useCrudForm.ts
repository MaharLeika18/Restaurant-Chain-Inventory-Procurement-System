import * as React from 'react';
import useNotifications from './useNotifications/useNotifications';

export type FormFieldValue = string | string[] | number | boolean | File | null;

interface ValidationResult {
  issues?: { path?: (string | number)[]; message: string }[];
}

interface UseCrudFormOptions<TValues extends Record<string, any>> {
  initialValues: Partial<TValues>;
  validate: (values: Partial<TValues>) => ValidationResult;
  onSubmit: (values: Partial<TValues>) => Promise<void>;
  successMessage: string;
  failureMessagePrefix: string;
  onSuccess?: () => void;
}

export function useCrudForm<TValues extends Record<string, any>>({
  initialValues,
  validate,
  onSubmit,
  successMessage,
  failureMessagePrefix,
  onSuccess,
}: UseCrudFormOptions<TValues>) {
  const notifications = useNotifications();

  const [formState, setFormState] = React.useState<{
    values: Partial<TValues>;
    errors: Partial<Record<keyof TValues, string>>;
  }>(() => ({ values: initialValues, errors: {} }));

  const formValues = formState.values;
  const formErrors = formState.errors;

  const setFormValues = React.useCallback((values: Partial<TValues>) => {
    setFormState((prev) => ({ ...prev, values }));
  }, []);

  const setFormErrors = React.useCallback(
    (errors: Partial<Record<keyof TValues, string>>) => {
      setFormState((prev) => ({ ...prev, errors }));
    },
    [],
  );

  const handleFieldChange = React.useCallback(
    (name: keyof TValues, value: FormFieldValue) => {
      const newFormValues = { ...formValues, [name]: value };
      setFormValues(newFormValues);

      const { issues } = validate(newFormValues);
      setFormErrors({
        ...formErrors,
        [name]: issues?.find((issue) => issue.path?.[0] === name)?.message,
      });
    },
    [formValues, formErrors, validate, setFormValues, setFormErrors],
  );

  const handleReset = React.useCallback(() => {
    setFormValues(initialValues);
  }, [initialValues, setFormValues]);

  const handleSubmit = React.useCallback(async () => {
    const { issues } = validate(formValues);
    if (issues && issues.length > 0) {
      setFormErrors(
        Object.fromEntries(issues.map((issue) => [issue.path?.[0], issue.message])),
      );
      return;
    }
    setFormErrors({});

    try {
      await onSubmit(formValues);
      notifications.show(successMessage, { severity: 'success', autoHideDuration: 3000 });
      onSuccess?.();
    } catch (submitError) {
      notifications.show(`${failureMessagePrefix} ${(submitError as Error).message}`, {
        severity: 'error',
        autoHideDuration: 3000,
      });
      throw submitError;
    }
  }, [
    formValues,
    validate,
    onSubmit,
    notifications,
    successMessage,
    failureMessagePrefix,
    onSuccess,
    setFormErrors,
  ]);

  return { formState, handleFieldChange, handleReset, handleSubmit };
}
