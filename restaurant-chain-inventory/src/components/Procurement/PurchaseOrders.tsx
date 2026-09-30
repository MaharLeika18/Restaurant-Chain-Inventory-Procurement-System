import * as React from 'react';
import { useState } from 'react';
import {
  Box,
  Button,
  Collapse,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Paper,
  useTheme,
  Chip,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { useNavigate } from 'react-router';
import useNotifications from '../../hooks/useNotifications/useNotifications';
import PageContainer from '../PageContainer';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

// TODO: Define types based on your data structure
type POStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Sent' | 'Partially Received' | 'Received' | 'Cancelled';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  branch: string;
  status: POStatus;
  itemCount: number;
  totalCost: number;
  dateCreated: string;
  expectedDelivery: string;
  items: POItem[];
}

interface POItem {
  id: string;
  ingredientName: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  lineTotal: number;
}

// TODO: Replace with actual API call
const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: '1',
    poNumber: 'PO-2025-001',
    supplier: 'Supplier A',
    branch: 'Branch A',
    status: 'Draft',
    itemCount: 5,
    totalCost: 250.00,
    dateCreated: '2025-09-28',
    expectedDelivery: '2025-10-05',
    items: [
      { id: '1', ingredientName: 'Tomato Sauce', quantityOrdered: 50, quantityReceived: 0, unitCost: 2.5, lineTotal: 125.00 },
      { id: '2', ingredientName: 'Mozzarella Cheese', quantityOrdered: 25, quantityReceived: 0, unitCost: 5.0, lineTotal: 125.00 },
    ],
  },
  {
    id: '2',
    poNumber: 'PO-2025-002',
    supplier: 'Supplier B',
    branch: 'Branch B',
    status: 'Pending Approval',
    itemCount: 3,
    totalCost: 180.00,
    dateCreated: '2025-09-29',
    expectedDelivery: '2025-10-08',
    items: [
      { id: '3', ingredientName: 'Olive Oil', quantityOrdered: 10, quantityReceived: 0, unitCost: 18.0, lineTotal: 180.00 },
    ],
  },
  {
    id: '3',
    poNumber: 'PO-2025-003',
    supplier: 'Supplier A',
    branch: 'Branch A',
    status: 'Approved',
    itemCount: 4,
    totalCost: 320.00,
    dateCreated: '2025-09-25',
    expectedDelivery: '2025-10-02',
    items: [
      { id: '4', ingredientName: 'Flour', quantityOrdered: 100, quantityReceived: 0, unitCost: 0.8, lineTotal: 80.00 },
      { id: '5', ingredientName: 'Sugar', quantityOrdered: 50, quantityReceived: 0, unitCost: 1.2, lineTotal: 60.00 },
      { id: '6', ingredientName: 'Salt', quantityOrdered: 30, quantityReceived: 0, unitCost: 0.5, lineTotal: 15.00 },
      { id: '7', ingredientName: 'Pepper', quantityOrdered: 20, quantityReceived: 0, unitCost: 8.25, lineTotal: 165.00 },
    ],
  },
  {
    id: '4',
    poNumber: 'PO-2025-004',
    supplier: 'Supplier C',
    branch: 'Branch C',
    status: 'Sent',
    itemCount: 2,
    totalCost: 150.00,
    dateCreated: '2025-09-24',
    expectedDelivery: '2025-10-01',
    items: [
      { id: '8', ingredientName: 'Chicken Breast', quantityOrdered: 20, quantityReceived: 0, unitCost: 7.5, lineTotal: 150.00 },
    ],
  },
  {
    id: '5',
    poNumber: 'PO-2025-005',
    supplier: 'Supplier B',
    branch: 'Branch B',
    status: 'Partially Received',
    itemCount: 3,
    totalCost: 200.00,
    dateCreated: '2025-09-23',
    expectedDelivery: '2025-09-30',
    items: [
      { id: '9', ingredientName: 'Beef', quantityOrdered: 15, quantityReceived: 10, unitCost: 10.0, lineTotal: 150.00 },
      { id: '10', ingredientName: 'Pork', quantityOrdered: 10, quantityReceived: 5, unitCost: 5.0, lineTotal: 50.00 },
    ],
  },
  {
    id: '6',
    poNumber: 'PO-2025-006',
    supplier: 'Supplier A',
    branch: 'Branch A',
    status: 'Received',
    itemCount: 4,
    totalCost: 175.00,
    dateCreated: '2025-09-20',
    expectedDelivery: '2025-09-27',
    items: [
      { id: '11', ingredientName: 'Lettuce', quantityOrdered: 30, quantityReceived: 30, unitCost: 2.0, lineTotal: 60.00 },
      { id: '12', ingredientName: 'Tomatoes', quantityOrdered: 40, quantityReceived: 40, unitCost: 1.5, lineTotal: 60.00 },
      { id: '13', ingredientName: 'Onions', quantityOrdered: 25, quantityReceived: 25, unitCost: 1.0, lineTotal: 25.00 },
      { id: '14', ingredientName: 'Peppers', quantityOrdered: 15, quantityReceived: 15, unitCost: 2.0, lineTotal: 30.00 },
    ],
  },
  {
    id: '7',
    poNumber: 'PO-2025-007',
    supplier: 'Supplier D',
    branch: 'Branch D',
    status: 'Cancelled',
    itemCount: 2,
    totalCost: 90.00,
    dateCreated: '2025-09-22',
    expectedDelivery: '2025-09-29',
    items: [
      { id: '15', ingredientName: 'Fish', quantityOrdered: 10, quantityReceived: 0, unitCost: 9.0, lineTotal: 90.00 },
    ],
  },
];

// TODO: Replace with actual API call to fetch available suppliers
const availableSuppliers = ['Supplier A', 'Supplier B', 'Supplier C', 'Supplier D', 'Supplier E'];

// TODO: Replace with actual API call to fetch available branches
const availableBranches = ['Branch A', 'Branch B', 'Branch C', 'Branch D', 'Branch E'];

// Collapsible Row Component
interface PORowProps {
  row: PurchaseOrder;
  onAction: (action: string, po: PurchaseOrder) => void;
  theme: any;
}

function PORow({ row, onAction, theme }: PORowProps) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const getAvailableActions = (status: POStatus) => {
    switch (status) {
      case 'Draft':
        return [
          { label: 'Edit', icon: <EditIcon fontSize="small" />, action: 'edit', enabled: true },
          { label: 'Submit for Approval', icon: <CheckIcon fontSize="small" />, action: 'submit', enabled: true },
        ];
      case 'Pending Approval':
        return [
          { label: 'Approve', icon: <CheckIcon fontSize="small" />, action: 'approve', enabled: true },
          { label: 'Reject', icon: <CloseIcon fontSize="small" />, action: 'reject', enabled: true },
        ];
      case 'Approved':
        return [
          { label: 'Export', icon: <FileDownloadIcon fontSize="small" />, action: 'export', enabled: true },
          { label: 'Reject', icon: <CloseIcon fontSize="small" />, action: 'reject', enabled: true },
        ];
      case 'Sent':
        return [
          { label: 'Receive Shipment', icon: <LocalShippingIcon fontSize="small" />, action: 'receive', enabled: true },
        ];
      case 'Partially Received':
        return [
          { label: 'Receive Shipment', icon: <LocalShippingIcon fontSize="small" />, action: 'receive', enabled: true },
        ];
      case 'Received':
        return [
          { label: 'Export', icon: <FileDownloadIcon fontSize="small" />, action: 'export', enabled: true },
        ];
      case 'Cancelled':
        return [];
      default:
        return [];
    }
  };

  const getStatusColor = (status: POStatus) => {
    switch (status) {
      case 'Draft':
        return 'default';
      case 'Pending Approval':
        return 'warning';
      case 'Approved':
        return 'info';
      case 'Sent':
        return 'primary';
      case 'Partially Received':
        return 'secondary';
      case 'Received':
        return 'success';
      case 'Cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const actions = getAvailableActions(row.status);

  return (
    <React.Fragment>
      <TableRow sx={{ '& > .MuiTableCell-root': { borderBottom: 'unset' } }}>
        <TableCell sx={{ width: 60 }}>
          <IconButton
            aria-label={open ? 'collapse row' : 'expand row'}
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          {row.poNumber}
        </TableCell>
        <TableCell>{row.supplier}</TableCell>
        <TableCell>{row.branch}</TableCell>
        <TableCell>
          <Chip
            label={row.status}
            color={getStatusColor(row.status) as any}
            size="small"
          />
        </TableCell>
        <TableCell align="right">{row.itemCount}</TableCell>
        <TableCell align="right">${row.totalCost.toFixed(2)}</TableCell>
        <TableCell>{row.dateCreated}</TableCell>
        <TableCell>{row.expectedDelivery}</TableCell>
        <TableCell sx={{ width: 80, position: 'relative' }}>
          <IconButton
            size="small"
            onClick={(e) => {
              setAnchorEl(e.currentTarget);
              setMenuOpen(true);
            }}
            disabled={actions.length === 0}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
          {menuOpen && actions.length > 0 && (
            <Paper
              sx={{
                position: 'absolute',
                top: '100%',
                right: 0,
                backgroundColor: 'background.paper',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxShadow: 2,
                zIndex: 10,
                minWidth: 150,
              }}
              onMouseLeave={() => setMenuOpen(false)}
            >
              {actions.map((action) => (
                <Button
                  key={action.action}
                  fullWidth
                  size="small"
                  disabled={!action.enabled}
                  onClick={() => {
                    onAction(action.action, row);
                    setMenuOpen(false);
                  }}
                  sx={{
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    color: 'text.primary',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                    '&:disabled': {
                      color: 'text.disabled',
                    }
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </Paper>
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={10}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="h6" gutterBottom component="div">
                PO Details
              </Typography>
              <Stack spacing={1} sx={{ mb: 2 }}>
                <Typography variant="body2">Supplier: {row.supplier}</Typography>
                <Typography variant="body2">Branch: {row.branch}</Typography>
                <Typography variant="body2">Status: {row.status}</Typography>
                <Typography variant="body2">Date Created: {row.dateCreated}</Typography>
                <Typography variant="body2">Expected Delivery: {row.expectedDelivery}</Typography>
              </Stack>
              <Typography variant="h6" gutterBottom component="div">
                PO Items
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>
                    <TableCell sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>Ingredient</TableCell>
                    <TableCell align="right" sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>Qty Ordered</TableCell>
                    <TableCell align="right" sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>Qty Received</TableCell>
                    <TableCell align="right" sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>Unit Cost</TableCell>
                    <TableCell align="right" sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>Line Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {row.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No items
                      </TableCell>
                    </TableRow>
                  ) : (
                    row.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.ingredientName}</TableCell>
                        <TableCell align="right">{item.quantityOrdered}</TableCell>
                        <TableCell align="right">{item.quantityReceived}</TableCell>
                        <TableCell align="right">${item.unitCost.toFixed(2)}</TableCell>
                        <TableCell align="right">${item.lineTotal.toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const theme = useTheme();

  // Filtering and pagination state
  const [filteredData, setFilteredData] = useState<PurchaseOrder[]>(mockPurchaseOrders);
  const [displayData, setDisplayData] = useState<PurchaseOrder[]>(mockPurchaseOrders);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filterStatus, setFilterStatus] = useState<POStatus | ''>('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterBranch, setFilterBranch] = useState('');

  // Update displayed data based on filters and pagination
  React.useEffect(() => {
    let filtered = [...mockPurchaseOrders];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((po) =>
        po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.supplier.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filterStatus) {
      filtered = filtered.filter((po) => po.status === filterStatus);
    }

    // Apply supplier filter
    if (filterSupplier) {
      filtered = filtered.filter((po) => po.supplier === filterSupplier);
    }

    // Apply branch filter
    if (filterBranch) {
      filtered = filtered.filter((po) => po.branch === filterBranch);
    }

    // Apply sorting
    if (sortField) {
      filtered.sort((a, b) => {
        const aVal = a[sortField as keyof PurchaseOrder];
        const bVal = b[sortField as keyof PurchaseOrder];

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }

        return 0;
      });
    }

    setFilteredData(filtered);

    // Apply pagination
    const start = currentPage * pageSize;
    const end = start + pageSize;
    setDisplayData(filtered.slice(start, end));
  }, [searchTerm, sortField, sortOrder, currentPage, pageSize, filterStatus, filterSupplier, filterBranch]);

  const handleRefresh = () => {
    setDisplayData([...displayData]);
  };

  const handleCreatePO = () => {
    // TODO: Navigate to PO creation page
    navigate('/procurement_management/new');
  };

  const handleAction = (action: string, po: PurchaseOrder) => {
    switch (action) {
      case 'edit':
        // TODO: Navigate to PO edit page
        navigate(`/procurement_management/purchase-orders/${po.id}/edit`);
        break;
      case 'submit':
        // TODO: Send to backend API
        console.log('Submit for approval:', po);
        notifications.showSuccess('PO submitted for approval');
        break;
      case 'approve':
        // TODO: Send to backend API
        console.log('Approve PO:', po);
        notifications.showSuccess('PO approved');
        break;
      case 'reject':
        // TODO: Send to backend API
        console.log('Reject PO:', po);
        notifications.showSuccess('PO rejected');
        break;
      case 'export':
        // TODO: Export PO
        console.log('Export PO:', po);
        notifications.showSuccess('PO exported');
        break;
      case 'receive':
        // Navigate to receive purchase order page
        navigate('/inventory_operations/receive-purchase-order');
        break;
      default:
        break;
    }
  };

  const totalPages = Math.ceil(filteredData.length / pageSize);

  return (
    <PageContainer
      title="Purchase Orders"
      breadcrumbs={[{ title: 'Procurement' }, { title: 'Purchase Orders' }]}
      showBranchSelector={false}
      actions={
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Tooltip title="Reload data" placement="right" enterDelay={1000}>
            <div>
              <IconButton size="small" onClick={handleRefresh}>
                <RefreshIcon />
              </IconButton>
            </div>
          </Tooltip>
          <Button variant="contained" onClick={handleCreatePO} startIcon={<AddIcon />}>
            Create PO
          </Button>
        </Stack>
      }
    >
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Stack spacing={2} sx={{ height: '100%' }}>
          {/* Search, Sort, and Filter Controls */}
          <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
            <TextField
              label="Search"
              placeholder="Search PO # or supplier..."
              size="small"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(0);
              }}
              sx={{ minWidth: 250 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortField}
                label="Sort By"
                onChange={(e) => {
                  setSortField(e.target.value);
                  setCurrentPage(0);
                }}
              >
                <MenuItem value="">None</MenuItem>
                <MenuItem value="poNumber">PO #</MenuItem>
                <MenuItem value="supplier">Supplier</MenuItem>
                <MenuItem value="branch">Branch</MenuItem>
                <MenuItem value="status">Status</MenuItem>
                <MenuItem value="dateCreated">Date Created</MenuItem>
                <MenuItem value="expectedDelivery">Expected Delivery</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Order</InputLabel>
              <Select
                value={sortOrder}
                label="Order"
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              >
                <MenuItem value="asc">Ascending</MenuItem>
                <MenuItem value="desc">Descending</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => {
                  setFilterStatus(e.target.value as POStatus | '');
                  setCurrentPage(0);
                }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Draft">Draft</MenuItem>
                <MenuItem value="Pending Approval">Pending Approval</MenuItem>
                <MenuItem value="Approved">Approved</MenuItem>
                <MenuItem value="Sent">Sent</MenuItem>
                <MenuItem value="Partially Received">Partially Received</MenuItem>
                <MenuItem value="Received">Received</MenuItem>
                <MenuItem value="Cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Supplier</InputLabel>
              <Select
                value={filterSupplier}
                label="Supplier"
                onChange={(e) => {
                  setFilterSupplier(e.target.value);
                  setCurrentPage(0);
                }}
              >
                <MenuItem value="">All</MenuItem>
                {availableSuppliers.map((supplier) => (
                  <MenuItem key={supplier} value={supplier}>
                    {supplier}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Branch</InputLabel>
              <Select
                value={filterBranch}
                label="Branch"
                onChange={(e) => {
                  setFilterBranch(e.target.value);
                  setCurrentPage(0);
                }}
              >
                <MenuItem value="">All</MenuItem>
                {availableBranches.map((branch) => (
                  <MenuItem key={branch} value={branch}>
                    {branch}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {/* Table */}
          <TableContainer sx={{ boxShadow: 1, flex: 1, overflow: 'auto' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>
                  <TableCell sx={{ width: 60, backgroundColor: (theme.vars || theme).palette.background.paper }} />
                  <TableCell sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>PO #</TableCell>
                  <TableCell sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>Supplier</TableCell>
                  <TableCell sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>Branch</TableCell>
                  <TableCell sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>Status</TableCell>
                  <TableCell align="right" sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>Item Count</TableCell>
                  <TableCell align="right" sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>Total Cost</TableCell>
                  <TableCell sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>Date Created</TableCell>
                  <TableCell sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>Expected Delivery</TableCell>
                  <TableCell sx={{ width: 80, backgroundColor: (theme.vars || theme).palette.background.paper }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {displayData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      No purchase orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  displayData.map((po) => (
                    <PORow
                      key={po.id}
                      row={po}
                      onAction={handleAction}
                      theme={theme}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination Controls */}
          <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Page Size</InputLabel>
              <Select
                value={pageSize}
                label="Page Size"
                onChange={(e) => {
                  setPageSize(e.target.value as unknown as number);
                  setCurrentPage(0);
                }}
              >
                <MenuItem value={5}>5</MenuItem>
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
              </Select>
            </FormControl>
            <Stack direction="row" spacing={1}>
              <Button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
              >
                Previous
              </Button>
              <Typography sx={{ alignSelf: 'center', px: 2 }}>
                Page {currentPage + 1} of {totalPages || 1}
              </Typography>
              <Button
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage >= totalPages - 1}
              >
                Next
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </LocalizationProvider>
    </PageContainer>
  );
}
