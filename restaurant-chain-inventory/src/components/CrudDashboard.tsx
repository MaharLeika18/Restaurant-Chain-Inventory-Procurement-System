import CssBaseline from '@mui/material/CssBaseline';
import { createHashRouter, RouterProvider } from 'react-router';
import DashboardLayout from './DashboardLayout.tsx';
import Dashboard from './Dashboard.tsx';
import EmployeeList from './Employee/EmployeeList.tsx';
import EmployeeShow from './Employee/EmployeeShow.tsx';
import EmployeeCreate from './Employee/EmployeeCreate.tsx';
import EmployeeEdit from './Employee/EmployeeEdit.tsx';
import NotificationsProvider from '../hooks/useNotifications/NotificationsProvider.tsx';
import DialogsProvider from '../hooks/useDialogs/DialogsProvider.tsx';
import AppTheme from '../theme/AppTheme.tsx';
import {
  dataGridCustomizations,
  datePickersCustomizations,
  sidebarCustomizations,
  formInputCustomizations,
} from '../theme/customizations/index.ts';

const router = createHashRouter([
  {
    Component: DashboardLayout,
    children: [
      {
        path: '/dashboard',
        Component: Dashboard,
      },
      {
        path: '/employees',
        Component: EmployeeList,
      },
      {
        path: '/employees/:employeeId',
        Component: EmployeeShow,
      },
      {
        path: '/employees/new',
        Component: EmployeeCreate,
      },
      {
        path: '/employees/:employeeId/edit',
        Component: EmployeeEdit,
      },


      // Fallback route for the example routes in dashboard sidebar items
      {
        path: '*',
        Component: EmployeeList,
      },
    ],
  },
]);

const themeComponents = {
  ...dataGridCustomizations,
  ...datePickersCustomizations,
  ...sidebarCustomizations,
  ...formInputCustomizations,
};

export default function CrudDashboard(props: { disableCustomTheme?: boolean }) {
  return (
    <AppTheme {...props} themeComponents={themeComponents}>
      <CssBaseline enableColorScheme />
      <NotificationsProvider>
        <DialogsProvider>
          <RouterProvider router={router} />
        </DialogsProvider>
      </NotificationsProvider>
    </AppTheme>
  );
}
