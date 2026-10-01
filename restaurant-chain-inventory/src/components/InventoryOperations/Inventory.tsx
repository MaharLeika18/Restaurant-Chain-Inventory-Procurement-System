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
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNavigate } from 'react-router';
import useNotifications from '../../hooks/useNotifications/useNotifications';
import PageContainer from '../PageContainer';
import { api } from '../../api/client';
import { useBranch } from '../../context/BranchContext';

// TODO: Define types based on your data structure
interface InventoryItem {
  id: string;
  ingredientId: number;
  ingredientName: string;
  category: string;
  currentQty: number;
  parLevel: number;
  status: 'OK' | 'Low' | 'Critical' | 'Overstock';
  unit: string;
  nearestExpiry: string;
  lastUpdated: string;
}

interface InventoryBatch {
  id: string;
  batchNumber: string;
  receivedDate: string;
  expiryDate: string;
  qtyRemaining: number;
  unitCost: number;
  sourcePO: string;
}

// Status is derived from current stock vs. PAR level - the backend doesn't
// store a status enum, so this mirrors app/services/reorder.py's thresholds.
function deriveStatus(current: number, par: number): InventoryItem['status'] {
  if (par <= 0) return 'OK';
  if (current <= par * 0.5) return 'Critical';
  if (current <= par) return 'Low';
  if (current > par * 1.5) return 'Overstock';
  return 'OK';
}

// Collapsible Row Component
interface InventoryRowProps {
  row: InventoryItem;
  batches: InventoryBatch[];
  onExpand: () => void;
  onAdjustStock: () => void;
  onTransfer: () => void;
}

function InventoryRow({ row, batches, onExpand, onAdjustStock, onTransfer }: InventoryRowProps) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const theme = useTheme();

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case 'OK':
        return '#4caf50';
      case 'Low':
        return '#ff9800';
      case 'Critical':
        return '#f44336';
      case 'Overstock':
        return '#2196f3';
      default:
        return '#757575';
    }
  };

  return (
    <React.Fragment>
      <TableRow sx={{ '& > .MuiTableCell-root': { borderBottom: 'unset' } }}>
        <TableCell sx={{ width: 60 }}>
          <IconButton
            aria-label={open ? 'collapse row' : 'expand row'}
            size="small"
            onClick={() => {
              const next = !open;
              setOpen(next);
              if (next) onExpand();
            }}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          {row.ingredientName}
        </TableCell>
        <TableCell>{row.category}</TableCell>
        <TableCell align="right">{row.currentQty}</TableCell>
        <TableCell align="right">{row.parLevel}</TableCell>
        <TableCell>
          <Box
            sx={{
              border: `2px solid ${getStatusBorderColor(row.status)}`,
              color: getStatusBorderColor(row.status),
              padding: '4px 8px',
              borderRadius: '4px',
              display: 'inline-block',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            {row.status}
          </Box>
        </TableCell>
        <TableCell>{row.unit}</TableCell>
        <TableCell>{row.nearestExpiry}</TableCell>
        <TableCell>{new Date(row.lastUpdated).toLocaleDateString()}</TableCell>
        <TableCell sx={{ width: 80, position: 'relative' }}>
          <IconButton
            size="small"
            onClick={(e) => {
              setAnchorEl(e.currentTarget);
              setMenuOpen(true);
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
          {menuOpen && (
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
              <Button
                fullWidth
                size="small"
                onClick={() => {
                  onAdjustStock();
                  setMenuOpen(false);
                }}
                sx={{ 
                  justifyContent: 'flex-start', 
                  textTransform: 'none',
                  color: 'text.primary',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  }
                }}
              >
                Adjust Stock
              </Button>
              <Button
                fullWidth
                size="small"
                onClick={() => {
                  onTransfer();
                  setMenuOpen(false);
                }}
                sx={{ 
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  color: 'text.primary',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  }
                }}
              >
                Transfer
              </Button>
            </Paper>
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={10}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="h6" gutterBottom component="div">
                Batch Details
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>
                    <TableCell sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>Batch/Lot #</TableCell>
                    <TableCell sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>Received Date</TableCell>
                    <TableCell sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>Expiry Date</TableCell>
                    <TableCell align="right" sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>Qty Remaining</TableCell>
                    <TableCell align="right" sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>Unit Cost</TableCell>
                    <TableCell sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>Source PO #</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {batches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No batch data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    batches.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell>{batch.batchNumber}</TableCell>
                        <TableCell>{batch.receivedDate}</TableCell>
                        <TableCell>{batch.expiryDate}</TableCell>
                        <TableCell align="right">{batch.qtyRemaining}</TableCell>
                        <TableCell align="right">${batch.unitCost.toFixed(2)}</TableCell>
                        <TableCell>{batch.sourcePO}</TableCell>
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

export default function Inventory() {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const theme = useTheme();

  const { branches, branchId, setBranchId } = useBranch();
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [batchesByItem, setBatchesByItem] = useState<{ [key: string]: InventoryBatch[] }>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadInventory = React.useCallback(() => {
    if (branchId == null) return;
    Promise.all([api.get(`/inventory/branch/${branchId}`), api.get('/ingredients/?limit=500'), api.get('/ingredients/categories')])
      .then(([stock, ingredients, categories]: any[]) => {
        const ingredientById = new Map(ingredients.map((i: any) => [i.ingredient_id, i]));
        const categoryById = new Map(categories.map((c: any) => [c.category_id, c.category_name]));
        setInventoryData(
          stock.map((s: any) => {
            const ing = ingredientById.get(s.ingredient_id);
            return {
              id: String(s.branch_ingredient_id),
              ingredientId: s.ingredient_id,
              ingredientName: ing?.ingredient_name ?? `#${s.ingredient_id}`,
              category: ing ? (categoryById.get(ing.category_id) ?? '—') : '—',
              currentQty: s.current_stock,
              parLevel: s.par_level,
              status: deriveStatus(s.current_stock, s.par_level),
              unit: ing?.unit_of_measure ?? '',
              nearestExpiry: s.nearest_expiry_date ?? '—',
              lastUpdated: s.last_updated,
            } as InventoryItem;
          }),
        );
      })
      .catch((e) => setLoadError(e.message));
  }, [branchId, refreshKey]);
  React.useEffect(() => { loadInventory(); }, [loadInventory]);

  const loadBatches = React.useCallback(
    (item: InventoryItem) => {
      if (branchId == null || batchesByItem[item.id]) return;
      api
        .get(`/inventory/batches/branch/${branchId}/ingredient/${item.ingredientId}?only_available=true`)
        .then((rows: any[]) =>
          setBatchesByItem((prev) => ({
            ...prev,
            [item.id]: rows.map((b) => ({
              id: String(b.batch_id),
              batchNumber: b.lot_number || `BATCH-${b.batch_id}`,
              receivedDate: b.received_date,
              expiryDate: b.expiration_date ?? '—',
              qtyRemaining: b.quantity_remaining,
              unitCost: b.unit_cost,
              sourcePO: b.purchase_order_item_id ? `PO item #${b.purchase_order_item_id}` : '—',
            })),
          })),
        )
        .catch(() => {});
    },
    [branchId, batchesByItem],
  );

  // Filtering and pagination state
  const [filteredData, setFilteredData] = useState<InventoryItem[]>([]);
  const [displayData, setDisplayData] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Update displayed data based on filters and pagination
  React.useEffect(() => {
    let filtered = [...inventoryData];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((item) =>
        item.ingredientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    if (sortField) {
      filtered.sort((a, b) => {
        const aVal = a[sortField as keyof InventoryItem];
        const bVal = b[sortField as keyof InventoryItem];

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
  }, [inventoryData, searchTerm, sortField, sortOrder, currentPage, pageSize]);

  const handleOpenAdjustStock = (item: InventoryItem) => {
    navigate(`/inventory_operations/${item.id}/adjust-stock`);
  };

  const handleOpenTransfer = (item: InventoryItem) => {
    navigate(`/inventory_operations/${item.id}/transfer`);
  };

  const handleReceivePO = () => {
    navigate('/inventory_operations/receive-purchase-order');
  };

  const totalPages = Math.ceil(filteredData.length / pageSize);

  return (
    <PageContainer
      title="Inventory Management"
      breadcrumbs={[{ title: 'Inventory' }]}
      showBranchSelector={true}
      actions={
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Tooltip title="Reload data" placement="right" enterDelay={1000}>
            <div>
              <IconButton size="small" onClick={() => setRefreshKey((k) => k + 1)}>
                <RefreshIcon />
              </IconButton>
            </div>
          </Tooltip>
          <Button
            variant="contained"
            onClick={handleReceivePO}
            startIcon={<AddIcon />}
          >
            Receive Purchase Order
          </Button>
        </Stack>
      }
    >
      <Stack spacing={2} sx={{ height: '100%' }}>
        {loadError && (
          <Typography color="error">{loadError}</Typography>
        )}
        {/* Search, Sort, and Filter Controls */}
        <Stack direction="row" spacing={2}>
          <TextField
            label="Search"
            placeholder="Search ingredients..."
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
              <MenuItem value="ingredientName">Name</MenuItem>
              <MenuItem value="category">Category</MenuItem>
              <MenuItem value="currentQty">Current Qty</MenuItem>
              <MenuItem value="status">Status</MenuItem>
              <MenuItem value="nearestExpiry">Nearest Expiry</MenuItem>
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
        </Stack>

        {/* Table */}
        <TableContainer sx={{ boxShadow: 1, flex: 1, overflow: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>
                <TableCell sx={{ width: 60, backgroundColor: (theme.vars || theme).palette.background.paper }} />
                <TableCell sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>Ingredient Name</TableCell>
                <TableCell sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>Category</TableCell>
                <TableCell align="right" sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>Current Qty</TableCell>
                <TableCell align="right" sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>PAR Level</TableCell>
                <TableCell sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>Status</TableCell>
                <TableCell sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>Unit</TableCell>
                <TableCell sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>Nearest Expiry</TableCell>
                <TableCell sx={{ backgroundColor: (theme.vars || theme).palette.background.paper }}>Last Updated</TableCell>
                <TableCell sx={{ width: 80, backgroundColor: (theme.vars || theme).palette.background.paper }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {displayData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    No inventory items found
                  </TableCell>
                </TableRow>
              ) : (
                displayData.map((item) => (
                  <InventoryRow
                    key={item.id}
                    row={item}
                    batches={batchesByItem[item.id] || []}
                    onExpand={() => loadBatches(item)}
                    onAdjustStock={() => handleOpenAdjustStock(item)}
                    onTransfer={() => handleOpenTransfer(item)}
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
    </PageContainer>
  );
}
