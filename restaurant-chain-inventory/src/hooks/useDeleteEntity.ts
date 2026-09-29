import * as React from 'react';
import { useDialogs } from './useDialogs/useDialogs';
import useNotifications from './useNotifications/useNotifications';

export function useDeleteEntity<T>({
  entityName,
  getLabel,
  deleteFn,
}: {
  entityName: string;
  getLabel: (entity: T) => string;
  deleteFn: (entity: T) => Promise<void>;
}) {
  const dialogs = useDialogs();
  const notifications = useNotifications();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = React.useCallback(
    (entity: T) => async (onDeleted?: () => void) => {
      const confirmed = await dialogs.confirm(`Do you wish to delete ${getLabel(entity)}?`, {
        title: `Delete ${entityName}?`,
        severity: 'error',
        okText: 'Delete',
        cancelText: 'Cancel',
      });

      if (confirmed) {
        setIsDeleting(true);
        try {
          await deleteFn(entity);
          notifications.show(`${entityName} deleted successfully.`, {
            severity: 'success',
            autoHideDuration: 3000,
          });
          onDeleted?.();
        } catch (deleteError) {
          notifications.show(
            `Failed to delete ${entityName.toLowerCase()}. Reason: ${(deleteError as Error).message}`,
            { severity: 'error', autoHideDuration: 3000 },
          );
        }
        setIsDeleting(false);
      }
    },
    [dialogs, notifications, entityName, getLabel, deleteFn],
  );

  return { handleDelete, isDeleting };
}