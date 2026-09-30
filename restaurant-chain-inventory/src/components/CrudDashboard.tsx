import CssBaseline from '@mui/material/CssBaseline';
import { createHashRouter, Navigate, RouterProvider } from 'react-router';
import DashboardLayout from './DashboardLayout.tsx';
import Dashboard from './Dashboard.tsx';
import EmployeeList from './Employee/EmployeeList.tsx';
import EmployeeShow from './Employee/EmployeeShow.tsx';
import EmployeeCreate from './Employee/EmployeeCreate.tsx';
import EmployeeEdit from './Employee/EmployeeEdit.tsx';
import BuildDemandForecast from './DemandForecasts/BuildDemandForecast.tsx'
import PointOfSale from './POS/PointOfSale.tsx'
import Inventory from './InventoryOperations/Inventory.tsx'
import ReceivePurchaseOrder from './InventoryOperations/ReceivePurchaseOrder.tsx'
import AdjustStock from './InventoryOperations/AdjustStock.tsx'
import Transfer from './InventoryOperations/Transfer.tsx'

import NotificationsProvider from '../hooks/useNotifications/NotificationsProvider.tsx';
import DialogsProvider from '../hooks/useDialogs/DialogsProvider.tsx';
import AppTheme from '../theme/AppTheme.tsx';
import { BranchProvider } from '../context/BranchContext.jsx';
import ResourcePage from './Resource/ResourcePage.tsx';
import ComingSoon from './ComingSoon.tsx';
import { resources } from '../resources/index.ts';
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
      { path: '/', element: <Navigate to="/dashboard" replace /> },
      {
        path: '/employees',
        Component: EmployeeList,
      },
      // the sidebar's Employees link points here
      { path: '/organization/employees', Component: EmployeeList },
      // every table page (Branches, Menu, Ingredients, ...) - see src/resources/index.ts
      ...resources.map((r) => ({
        path: r.path,
        element: <ResourcePage key={r.path} config={r} />,
      })),
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
      

      {
        path: '/demand_forecast',
        Component: BuildDemandForecast,
      },
      {
        path: '/order_processing',
        Component: PointOfSale
      },
      {
        path: '/inventory_operations',
        Component: Inventory
      },
      {
        path: '/inventory_operations/receive-purchase-order',
        Component: ReceivePurchaseOrder
      },
      {
        path: '/inventory_operations/:itemId/adjust-stock',
        Component: AdjustStock
      },
      {
        path: '/inventory_operations/:itemId/transfer',
        Component: Transfer
      },

      // Anything without a page yet (workflow pages, sidebar group headings)
      {
        path: '*',
        Component: ComingSoon,
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
          <BranchProvider>
            <RouterProvider router={router} />
          </BranchProvider>
        </DialogsProvider>
      </NotificationsProvider>
    </AppTheme>
  );
}
