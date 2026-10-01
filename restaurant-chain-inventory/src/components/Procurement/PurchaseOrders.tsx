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
  Alert,
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
import { api } from '../../api/client';
import { useDialogs } from '../../hooks/useDialogs/useDialogs';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

// Mirrors app/models/enums.py PurchaseOrderStatus. The backend has no
// separate "Draft" state - a PO is PENDING_APPROVAL the moment it's created -
// so Draft/Edit/Submit-for-approval (which don't map to any real endpoint)
// have been dropped from the actions below.
type POStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

const STATUS_LABEL: Record<POStatus, string> = {
  PENDING_APPROVAL: 'Pending Approval', APPROVED: 'Approved', REJECTED: 'Rejected',
  ORDERED: 'Sent', PARTIALLY_RECEIVED: 'Partially Received', RECEIVED: 'Received', CANCELLED: 'Cancelled',
};

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  supplierId: number;
  branch: string;
  branchId: number;
  status: POStatus;
  itemCount: number;
  totalCost: number;
  dateCreated: string;
  expectedDelivery: string;
  hasDiscrepancy: boolean;
  discrepancyNotes: string | null;
  items: POItem[];
}

interface POItem {
  id: string;
  ingredientId: number;
  ingredientName: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  lineTotal: number;
}

// Collapsible Row Component
interface PORowProps {
  row: PurchaseOrder;
  onAction: (action: string, po: PurchaseOrder) => void;
  theme: any;
  busyRowId: string | null;
}

function PORow({ row, onAction, theme, busyRowId }: PORowProps) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const getAvailableActions = (status: POStatus) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return [
          { label: 'Approve', icon: <CheckIcon fontSize="small" />, action: 'approve', enabled: true },
          { label: 'Reject', icon: <CloseIcon fontSize="small" />, action: 'reject', enabled: true },
        ];
      case 'APPROVED':
        return [
          { label: 'Send to Supplier', icon: <LocalShippingIcon fontSize="small" />, action: 'send', enabled: true },
          { label: 'Cancel', icon: <CloseIcon fontSize="small" />, action: 'cancel', enabled: true },
        ];
      case 'ORDERED':
        return [
          { label: 'Receive Shipment', icon: <LocalShippingIcon fontSize="small" />, action: 'receive', enabled: true },
          { label: 'Cancel', icon: <CloseIcon fontSize="small" />, action: 'cancel', enabled: true },
        ];
      case 'PARTIALLY_RECEIVED':
        return [
          { label: 'Receive Shipment', icon: <LocalShippingIcon fontSize="small" />, action: 'receive', enabled: true },
        ];
      case 'RECEIVED':
      case 'REJECTED':
      case 'CANCELLED':
        return [];
      default:
        return [];
    }
  };

  const getStatusColor = (status: POStatus) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return 'warning';
      case 'APPROVED':
        return 'info';
      case 'ORDERED':
        return 'primary';
      case 'PARTIALLY_RECEIVED':
        return 'secondary';
      case 'RECEIVED':
        return 'success';
      case 'REJECTED':
      case 'CANCELLED':
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
            label={STATUS_LABEL[row.status]}
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
            disabled={actions.length === 0 || busyRowId === row.id}
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
  const dialogs = useDialogs();
  const theme = useTheme();

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [availableSuppliers, setAvailableSuppliers] = useState<{ id: number; name: string }[]>([]);
  const [availableBranches, setAvailableBranches] = useState<{ id: number; name: string }[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadOrders = React.useCallback(() => {
    Promise.all([
      api.get('/purchase-orders/?limit=200'),
      api.get('/suppliers/?limit=500'),
      api.get('/branches/?limit=500'),
      api.get('/ingredients/?limit=500'),
    ])
      .then(([pos, suppliers, branches, ingredients]: any[]) => {
        setAvailableSuppliers(suppliers.map((s: any) => ({ id: s.supplier_id, name: s.supplier_name })));
        setAvailableBranches(branches.map((b: any) => ({ id: b.branch_id, name: b.branch_name })));
        const supplierById = new Map(suppliers.map((s: any) => [s.supplier_id, s.supplier_name]));
        const branchById = new Map(branches.map((b: any) => [b.branch_id, b.branch_name]));
        const ingredientById = new Map(ingredients.map((i: any) => [i.ingredient_id, i.ingredient_name]));
        setPurchaseOrders(
          pos.map((po: any) => ({
            id: String(po.po_id),
            poNumber: `PO-${po.po_id}`,
            supplier: supplierById.get(po.supplier_id) ?? `#${po.supplier_id}`,
            supplierId: po.supplier_id,
            branch: branchById.get(po.branch_id) ?? `#${po.branch_id}`,
            branchId: po.branch_id,
            status: po.status,
            itemCount: po.items.length,
            totalCost: po.items.reduce((sum: number, it: any) => sum + it.ordered_quantity * it.unit_cost, 0),
            dateCreated: po.created_at,
            expectedDelivery: po.expected_delivery_date ?? '—',
            hasDiscrepancy: po.has_discrepancy,
            discrepancyNotes: po.discrepancy_notes,
            items: po.items.map((it: any) => ({
              id: String(it.po_item_id),
              ingredientId: it.ingredient_id,
              ingredientName: ingredientById.get(it.ingredient_id) ?? `#${it.ingredient_id}`,
              quantityOrdered: it.ordered_quantity,
              quantityReceived: it.fulfilled_quantity,
              unitCost: it.unit_cost,
              lineTotal: it.ordered_quantity * it.unit_cost,
            })),
          })),
        );
      })
      .catch((e) => setLoadError(e.message));
  }, []);
  React.useEffect(() => { loadOrders(); }, [loadOrders]);

  // Filtering and pagination state
  const [filteredData, setFilteredData] = useState<PurchaseOrder[]>([]);
  const [displayData, setDisplayData] = useState<PurchaseOrder[]>([]);
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
    let filtered = [...purchaseOrders];

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
  }, [purchaseOrders, searchTerm, sortField, sortOrder, currentPage, pageSize, filterStatus, filterSupplier, filterBranch]);

  const handleRefresh = () => {
    loadOrders();
  };

  const handleCreatePO = () => {
    navigate('/procurement_management/new');
  };

  const runAction = async (po: PurchaseOrder, path: string, roleGated: boolean) => {
    setBusyId(po.id);
    try {
      await api.post(`/purchase-orders/${po.id}/${path}`);
      notifications.show(`${po.poNumber} updated.`, { severity: 'success', autoHideDuration: 3000 });
      loadOrders();
    } catch (e) {
      const hint = roleGated && (e as Error).message.includes('403') ? ' (log in as a manager or admin to do this)' : '';
      notifications.show(`Couldn't update ${po.poNumber}: ${(e as Error).message}${hint}`, { severity: 'error', autoHideDuration: 7000 });
    } finally {
      setBusyId(null);
    }
  };

  const handleAction = async (action: string, po: PurchaseOrder) => {
    switch (action) {
      case 'approve':
        await runAction(po, 'approve', true);
        break;
      case 'reject': {
        const ok = await dialogs.confirm(`Reject ${po.poNumber} from ${po.supplier}?`, { title: 'Reject purchase order?', severity: 'error', okText: 'Reject', cancelText: 'Back' });
        if (ok) await runAction(po, 'reject', true);
        break;
      }
      case 'send':
        await runAction(po, 'send', false);
        break;
      case 'cancel': {
        const ok = await dialogs.confirm(`Cancel ${po.poNumber}?`, { title: 'Cancel purchase order?', severity: 'error', okText: 'Cancel PO', cancelText: 'Back' });
        if (ok) await runAction(po, 'cancel', false);
        break;
      }
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
          {loadError && <Alert severity="error">{loadError}</Alert>}
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
                {(Object.keys(STATUS_LABEL) as POStatus[]).map((st) => (
                  <MenuItem key={st} value={st}>{STATUS_LABEL[st]}</MenuItem>
                ))}
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
                  <MenuItem key={supplier.id} value={supplier.name}>
                    {supplier.name}
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
                  <MenuItem key={branch.id} value={branch.name}>
                    {branch.name}
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
                      busyRowId={busyId}
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
