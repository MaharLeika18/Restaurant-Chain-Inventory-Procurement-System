import * as React from 'react';
import { useTheme, type Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import Toolbar from '@mui/material/Toolbar';
import type {} from '@mui/material/themeCssVarsAugmentation';

import PersonIcon from '@mui/icons-material/Person';
import BarChartIcon from '@mui/icons-material/BarChart';
import CircleIcon from '@mui/icons-material/Circle';
import StoreIcon from '@mui/icons-material/Store';
import WorkspacesIcon from '@mui/icons-material/Workspaces';
import CategoryIcon from '@mui/icons-material/Category';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import KitchenIcon from '@mui/icons-material/Kitchen';
import SoupKitchenIcon from '@mui/icons-material/SoupKitchen';
import EggIcon from '@mui/icons-material/Egg';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import ReceiptIcon from '@mui/icons-material/Receipt';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import RecyclingIcon from '@mui/icons-material/Recycling';
import LocalGroceryStoreIcon from '@mui/icons-material/LocalGroceryStore';
import StorefrontIcon from '@mui/icons-material/Storefront';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BatchPredictionIcon from '@mui/icons-material/BatchPrediction';
import StarsIcon from '@mui/icons-material/Stars';

import { matchPath, useLocation } from 'react-router';
import DashboardSidebarContext from '../context/DashboardSidebarContext';
import { DRAWER_WIDTH, MINI_DRAWER_WIDTH } from '../scripts/constants';
import DashboardSidebarPageItem from './DashboardSidebarPageItem';
import DashboardSidebarHeaderItem from './DashboardSidebarHeaderItem';
import DashboardSidebarDividerItem from './DashboardSidebarDividerItem';
import getDrawerSxTransitionMixin from '../scripts/mixins';

export interface DashboardSidebarProps {
  expanded?: boolean;
  setExpanded: (expanded: boolean) => void;
  disableCollapsibleSidebar?: boolean;
  container?: Element;
}

export default function DashboardSidebar({
  expanded = true,
  setExpanded,
  disableCollapsibleSidebar = false,
  container,
}: DashboardSidebarProps) {
  const theme = useTheme();

  const { pathname } = useLocation();

  const [expandedItemIds, setExpandedItemIds] = React.useState<string[]>([]);

  const isOverSmViewport = useMediaQuery(theme.breakpoints.up('sm'));
  const isOverMdViewport = useMediaQuery(theme.breakpoints.up('md'));
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const shouldReduceDrawerMotion =
    theme.motion.reducedMotion === 'always' ||
    (theme.motion.reducedMotion === 'system' && prefersReducedMotion);
  const drawerEnteringDuration = shouldReduceDrawerMotion
    ? 0
    : theme.transitions.duration.enteringScreen;
  const drawerLeavingDuration = shouldReduceDrawerMotion
    ? 0
    : theme.transitions.duration.leavingScreen;

  const [isFullyExpanded, setIsFullyExpanded] = React.useState(expanded);
  const [isFullyCollapsed, setIsFullyCollapsed] = React.useState(!expanded);

  React.useEffect(() => {
    if (expanded) {
      if (drawerEnteringDuration === 0) {
        setIsFullyExpanded(true);
        return undefined;
      }

      const drawerWidthTransitionTimeout = setTimeout(() => {
        setIsFullyExpanded(true);
      }, drawerEnteringDuration);

      return () => clearTimeout(drawerWidthTransitionTimeout);
    }

    setIsFullyExpanded(false);

    return undefined;
  }, [drawerEnteringDuration, expanded]);

  React.useEffect(() => {
    if (!expanded) {
      if (drawerLeavingDuration === 0) {
        setIsFullyCollapsed(true);
        return undefined;
      }

      const drawerWidthTransitionTimeout = setTimeout(() => {
        setIsFullyCollapsed(true);
      }, drawerLeavingDuration);

      return () => clearTimeout(drawerWidthTransitionTimeout);
    }

    setIsFullyCollapsed(false);

    return undefined;
  }, [drawerLeavingDuration, expanded]);

  const mini = !disableCollapsibleSidebar && !expanded;

  const handleSetSidebarExpanded = React.useCallback(
    (newExpanded: boolean) => () => {
      setExpanded(newExpanded);
    },
    [setExpanded],
  );

  const handlePageItemClick = React.useCallback(
    (itemId: string, hasNestedNavigation: boolean) => {
      if (hasNestedNavigation && !mini) {
        setExpandedItemIds((previousValue) =>
          previousValue.includes(itemId)
            ? previousValue.filter(
                (previousValueItemId) => previousValueItemId !== itemId,
              )
            : [...previousValue, itemId],
        );
      } else if (!isOverSmViewport && !hasNestedNavigation) {
        setExpanded(false);
      }
    },
    [mini, setExpanded, isOverSmViewport],
  );

  const hasDrawerTransitions =
    isOverSmViewport && (!disableCollapsibleSidebar || isOverMdViewport);

  const getDrawerContent = React.useCallback(
    (viewport: 'phone' | 'tablet' | 'desktop') => (
      <React.Fragment>
        <Toolbar />
        <Box
          component="nav"
          aria-label={`${viewport.charAt(0).toUpperCase()}${viewport.slice(1)}`}
          sx={[
            {
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              overflow: 'auto',
              scrollbarGutter: mini ? 'stable' : 'auto',
              overflowX: 'hidden',
              pt: !mini ? 0 : 2,
            },
            hasDrawerTransitions
              ? getDrawerSxTransitionMixin(isFullyExpanded, 'padding')
              : null,
          ]}
        >
          <List
            dense
            sx={{
              padding: mini ? 0 : 0.5,
              mb: 4,
              width: mini ? MINI_DRAWER_WIDTH : 'auto',
            }}
          >        
            <DashboardSidebarHeaderItem>Reports</DashboardSidebarHeaderItem>
            <DashboardSidebarPageItem
              id="dashboard"
              title="Dashboard"
              icon={<CircleIcon />}
              href="/dashboard"
              selected={!!matchPath('/dashboard/*', pathname) || pathname === '/'}
            />
            <DashboardSidebarDividerItem />
            <DashboardSidebarHeaderItem>Workflow</DashboardSidebarHeaderItem>
            <DashboardSidebarPageItem
              id="order_processing"
              title="Order Processing"
              icon={<CircleIcon />}
              href="/order_processing"
              selected={!!matchPath('/order_processing/*', pathname) || pathname === '/'}
            />
            <DashboardSidebarPageItem
              id="inventory_operations"
              title="Inventory Operations"
              icon={<CircleIcon />}
              href="/inventory_operations"
              selected={!!matchPath('/inventory_operations/*', pathname) || pathname === '/'}
            />
            <DashboardSidebarPageItem
              id="procurement_management"
              title="Procurement Management"
              icon={<CircleIcon />}
              href="/procurement_management"
              selected={!!matchPath('/procurement_management/*', pathname) || pathname === '/'}
            />
            <DashboardSidebarDividerItem />
            <DashboardSidebarHeaderItem>Tables</DashboardSidebarHeaderItem>
            <DashboardSidebarPageItem
              id="organization"
              title="Organization"
              icon={<WorkspacesIcon />}
              href="/organization"
              selected={!!matchPath('/organization', pathname)}
              defaultExpanded={!!matchPath('/organization', pathname)}
              expanded={expandedItemIds.includes('organization')}
              nestedNavigation={
                <List
                  dense
                  sx={{
                    padding: 0,
                    my: 1,
                    pl: mini ? 0 : 1,
                    minWidth: 240,
                  }}
                >
                  <DashboardSidebarPageItem
                    id="branches"
                    title="Branches"
                    icon={<StoreIcon />}
                    href="/organization/branches"
                    selected={!!matchPath('/organization/branches', pathname)}
                  />
                  <DashboardSidebarPageItem
                    id="employees"
                    title="Employees"
                    icon={<PersonIcon />}
                    href="/organization/employees"
                    selected={!!matchPath('/organization/employees', pathname)}
                  />
                </List>
              }
            />
            <DashboardSidebarPageItem
              id="food"
              title="Food"
              icon={<KitchenIcon />}
              href="/food"
              selected={!!matchPath('/food', pathname)}
              defaultExpanded={!!matchPath('/food', pathname)}
              expanded={expandedItemIds.includes('food')}
              nestedNavigation={
                <List
                  dense
                  sx={{
                    padding: 0,
                    my: 1,
                    pl: mini ? 0 : 1,
                    minWidth: 240,
                  }}
                >
                  <DashboardSidebarPageItem
                    id="menu"
                    title="Menu"
                    icon={<MenuBookIcon />}
                    href="/food/menu"
                    selected={!!matchPath('/food/menu', pathname)}
                  />
                  <DashboardSidebarPageItem
                    id="recipes"
                    title="Recipes"
                    icon={<SoupKitchenIcon />}
                    href="/food/recipes"
                    selected={!!matchPath('/food/recipes', pathname)}
                  />
                  <DashboardSidebarPageItem
                    id="ingredients"
                    title="Ingredients"
                    icon={<EggIcon />}
                    href="/food/ingredients"
                    selected={!!matchPath('/food/ingredients', pathname)}
                  />
                  <DashboardSidebarPageItem
                    id="ingredient_categories"
                    title="Ingredient Categories"
                    icon={<CategoryIcon />}
                    href="/food/ingredient_categories"
                    selected={!!matchPath('/food/ingredient_categories', pathname)}
                  />
                </List>
              }
            />
            <DashboardSidebarPageItem
              id="sales"
              title="Sales"
              icon={<PointOfSaleIcon />}
              href="/sales"
              selected={!!matchPath('/sales', pathname)}
              defaultExpanded={!!matchPath('/sales', pathname)}
              expanded={expandedItemIds.includes('sales')}
              nestedNavigation={
                <List
                  dense
                  sx={{
                    padding: 0,
                    my: 1,
                    pl: mini ? 0 : 1,
                    minWidth: 240,
                  }}
                >
                  <DashboardSidebarPageItem
                    id="order_log"
                    title="Order Log"
                    icon={<ReceiptIcon />}
                    href="/sales/order_log"
                    selected={!!matchPath('/sales/order_log', pathname)}
                  />
                  <DashboardSidebarPageItem
                    id="order_items"
                    title="Order Items"
                    icon={<FormatListNumberedIcon />}
                    href="/sales/order_items"
                    selected={!!matchPath('/sales/order_items', pathname)}
                  />
                </List>
              }
            />
            <DashboardSidebarPageItem
              id="inventory"
              title="Inventory"
              icon={<InventoryIcon />}
              href="/inventory"
              selected={!!matchPath('/inventory', pathname)}
              defaultExpanded={!!matchPath('/inventory', pathname)}
              expanded={expandedItemIds.includes('inventory')}
              nestedNavigation={
                <List
                  dense
                  sx={{
                    padding: 0,
                    my: 1,
                    pl: mini ? 0 : 1,
                    minWidth: 240,
                  }}
                >
                  <DashboardSidebarPageItem
                    id="ingredient_batches"
                    title="Ingredient Batches"
                    icon={<LocalShippingIcon />}
                    href="/inventory/ingredient_batches"
                    selected={!!matchPath('/inventory/ingredient_batches', pathname)}
                  />
                  <DashboardSidebarPageItem
                    id="inventory_log"
                    title="Inventory Log"
                    icon={<FormatListBulletedIcon />}
                    href="/inventory/inventory_log"
                    selected={!!matchPath('/inventory/inventory_log', pathname)}
                  />
                  <DashboardSidebarPageItem
                    id="stock_transfers"
                    title="Stock Transfers"
                    icon={<SwapHorizIcon />}
                    href="/inventory/performance"
                    selected={!!matchPath('/inventory/stock_transfers', pathname)}
                  />
                  <DashboardSidebarPageItem
                    id="waste_log"
                    title="Waste Log"
                    icon={<RecyclingIcon />}
                    href="/inventory/waste_log"
                    selected={!!matchPath('/inventory/waste_log', pathname)}
                  />
                </List>
              }
            />
            <DashboardSidebarPageItem
              id="procurement"
              title="Procurement"
              icon={<LocalGroceryStoreIcon />}
              href="/procurement"
              selected={!!matchPath('/procurement', pathname)}
              defaultExpanded={!!matchPath('/procurement', pathname)}
              expanded={expandedItemIds.includes('procurement')}
              nestedNavigation={
                <List
                  dense
                  sx={{
                    padding: 0,
                    my: 1,
                    pl: mini ? 0 : 1,
                    minWidth: 240,
                  }}
                >
                  <DashboardSidebarPageItem
                    id="supplier"
                    title="Suppliers"
                    icon={<StorefrontIcon />}
                    href="/procurement/demand"
                    selected={!!matchPath('/procurement/demand', pathname)}
                  />
                  <DashboardSidebarPageItem
                    id="purchase_orders"
                    title="Reorder Predictions"
                    icon={<RequestQuoteIcon />}
                    href="/procurement/reorder"
                    selected={!!matchPath('/procurement/reorder', pathname)}
                  />
                  <DashboardSidebarPageItem
                    id="purchase_order_items"
                    title="Purchase Order Items"
                    icon={<ReceiptLongIcon />}
                    href="/procurement/performance"
                    selected={!!matchPath('/procurement/performance', pathname)}
                  />
                </List>
              }
            />
            <DashboardSidebarPageItem
              id="analytics"
              title="Analytics"
              icon={<BarChartIcon />}
              href="/analytics"
              selected={!!matchPath('/analytics', pathname)}
              defaultExpanded={!!matchPath('/analytics', pathname)}
              expanded={expandedItemIds.includes('analytics')}
              nestedNavigation={
                <List
                  dense
                  sx={{
                    padding: 0,
                    my: 1,
                    pl: mini ? 0 : 1,
                    minWidth: 240,
                  }}
                >
                  <DashboardSidebarPageItem
                    id="demand_forecasts"
                    title="Demand Forecasts"
                    icon={<TrendingUpIcon />}
                    href="/analytics/demand_forecasts"
                    selected={!!matchPath('/analytics/demand_forecasts', pathname)}
                  />
                  <DashboardSidebarPageItem
                    id="reorder_predictions"
                    title="Reorder Predictions"
                    icon={<BatchPredictionIcon />}
                    href="/analytics/reorder_predictions"
                    selected={!!matchPath('/analytics/reorder_predictions', pathname)}
                  />
                  <DashboardSidebarPageItem
                    id="supplier_performance"
                    title="Supplier Performance"
                    icon={<StarsIcon />}
                    href="/analytics/supplier_performance"
                    selected={!!matchPath('/analytics/supplier_performance', pathname)}
                  />
                </List>
              }
            />
          </List>
        </Box>
      </React.Fragment>
    ),
    [mini, hasDrawerTransitions, isFullyExpanded, expandedItemIds, pathname],
  );

  const getDrawerSharedSx = React.useCallback(
    (isTemporary: boolean) => (drawerTheme: Theme) => {
      const drawerWidth = mini ? MINI_DRAWER_WIDTH : DRAWER_WIDTH;
      const widthTransitionStyles = getDrawerSxTransitionMixin(
        expanded,
        'width',
      )(drawerTheme);

      return {
        displayPrint: 'none',
        width: drawerWidth,
        flexShrink: 0,
        ...widthTransitionStyles,
        overflowX: 'hidden',
        ...(isTemporary ? { position: 'absolute' } : {}),
        [`& .MuiDrawer-paper`]: {
          position: 'absolute',
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundImage: 'none',
          ...widthTransitionStyles,
          overflowX: 'hidden',
        },
      };
    },
    [expanded, mini],
  );

  const sidebarContextValue = React.useMemo(() => {
    return {
      onPageItemClick: handlePageItemClick,
      mini,
      fullyExpanded: isFullyExpanded,
      fullyCollapsed: isFullyCollapsed,
      hasDrawerTransitions,
    };
  }, [
    handlePageItemClick,
    mini,
    isFullyExpanded,
    isFullyCollapsed,
    hasDrawerTransitions,
  ]);

  return (
    <DashboardSidebarContext.Provider value={sidebarContextValue}>
      <Drawer
        container={container}
        variant="temporary"
        open={expanded}
        onClose={handleSetSidebarExpanded(false)}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={[
          {
            display: {
              xs: 'block',
              sm: disableCollapsibleSidebar ? 'block' : 'none',
              md: 'none',
            },
          },
          getDrawerSharedSx(true),
        ]}
      >
        {getDrawerContent('phone')}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={[
          {
            display: {
              xs: 'none',
              sm: disableCollapsibleSidebar ? 'none' : 'block',
              md: 'none',
            },
          },
          getDrawerSharedSx(false),
        ]}
      >
        {getDrawerContent('tablet')}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={[{ display: { xs: 'none', md: 'block' } }, getDrawerSharedSx(false)]}
      >
        {getDrawerContent('desktop')}
      </Drawer>
    </DashboardSidebarContext.Provider>
  );
}
