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

// TODO: Define types based on your data structure
interface InventoryItem {
  id: string;
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

// TODO: Replace with actual API call
const mockInventoryData: InventoryItem[] = [
  {
    id: '1',
    ingredientName: 'Tomato Sauce',
    category: 'Sauces',
    currentQty: 45,
    parLevel: 50,
    status: 'Low',
    unit: 'Liters',
    nearestExpiry: '2025-03-15',
    lastUpdated: '2025-09-30T10:30:00Z',
  },
  {
    id: '2',
    ingredientName: 'Mozzarella Cheese',
    category: 'Dairy',
    currentQty: 120,
    parLevel: 100,
    status: 'Overstock',
    unit: 'kg',
    nearestExpiry: '2025-10-20',
    lastUpdated: '2025-09-30T11:00:00Z',
  },
  {
    id: '3',
    ingredientName: 'Olive Oil',
    category: 'Oils',
    currentQty: 12,
    parLevel: 25,
    status: 'Critical',
    unit: 'Liters',
    nearestExpiry: '2026-12-31',
    lastUpdated: '2025-09-30T09:15:00Z',
  },
  {
    id: '4',
    ingredientName: 'Fresh Basil',
    category: 'Herbs',
    currentQty: 2,
    parLevel: 5,
    status: 'Low',
    unit: 'Bunches',
    nearestExpiry: '2025-10-05',
    lastUpdated: '2025-09-30T08:45:00Z',
  },
  {
    id: '5',
    ingredientName: 'Flour (All-Purpose)',
    category: 'Dry Goods',
    currentQty: 150,
    parLevel: 100,
    status: 'OK',
    unit: 'kg',
    nearestExpiry: '2026-06-15',
    lastUpdated: '2025-09-30T10:00:00Z',
  },
];

// TODO: Replace with actual API call
const mockBatchData: { [key: string]: InventoryBatch[] } = {
  '1': [
    { id: 'b1', batchNumber: 'BATCH-001', receivedDate: '2025-09-20', expiryDate: '2025-03-15', qtyRemaining: 45, unitCost: 2.5, sourcePO: 'PO-2025-001' },
  ],
  '2': [
    { id: 'b2', batchNumber: 'BATCH-002', receivedDate: '2025-09-15', expiryDate: '2025-10-20', qtyRemaining: 60, unitCost: 8.0, sourcePO: 'PO-2025-002' },
    { id: 'b3', batchNumber: 'BATCH-003', receivedDate: '2025-09-25', expiryDate: '2025-10-25', qtyRemaining: 60, unitCost: 8.0, sourcePO: 'PO-2025-003' },
  ],
  '3': [
    { id: 'b4', batchNumber: 'BATCH-004', receivedDate: '2025-08-01', expiryDate: '2026-12-31', qtyRemaining: 12, unitCost: 15.0, sourcePO: 'PO-2025-004' },
  ],
  '4': [
    { id: 'b5', batchNumber: 'BATCH-005', receivedDate: '2025-09-28', expiryDate: '2025-10-05', qtyRemaining: 2, unitCost: 0.5, sourcePO: 'PO-2025-005' },
  ],
  '5': [
    { id: 'b6', batchNumber: 'BATCH-006', receivedDate: '2025-08-15', expiryDate: '2026-06-15', qtyRemaining: 150, unitCost: 0.8, sourcePO: 'PO-2025-006' },
  ],
};

// Collapsible Row Component
interface InventoryRowProps {
  row: InventoryItem;
  batches: InventoryBatch[];
  onAdjustStock: () => void;
  onTransfer: () => void;
}

function InventoryRow({ row, batches, onAdjustStock, onTransfer }: InventoryRowProps) {
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
            onClick={() => setOpen(!open)}
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

  // Filtering and pagination state
  const [filteredData, setFilteredData] = useState<InventoryItem[]>(mockInventoryData);
  const [displayData, setDisplayData] = useState<InventoryItem[]>(mockInventoryData);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Update displayed data based on filters and pagination
  React.useEffect(() => {
    let filtered = [...mockInventoryData];

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
  }, [searchTerm, sortField, sortOrder, currentPage, pageSize]);

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
      actions={
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Tooltip title="Reload data" placement="right" enterDelay={1000}>
            <div>
              <IconButton size="small" onClick={() => setDisplayData([...displayData])}>
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
                    batches={mockBatchData[item.id] || []}
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
