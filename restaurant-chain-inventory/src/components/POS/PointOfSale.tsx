import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import HistoryIcon from '@mui/icons-material/History';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  useTheme,
} from '@mui/material';
import PageContainer from '../PageContainer';
import React from 'react';
import { api } from '../../api/client';
import { useBranch } from '../../context/BranchContext';
import useNotifications from '../../hooks/useNotifications/useNotifications';
import {
  GridFilterModel,
  GridPaginationModel,
  GridSortModel,
} from '@mui/x-data-grid';

// Matches app/schemas/menu.py's MenuItemOut - see GET /menu/
interface MenuItem {
  id: string; // menu_item_id, as a string (the cart/table code below key off it)
  name: string;
  price: number;
}

interface OrderItem extends MenuItem {
  quantity: number;
}

const LABEL_TRANSFORM = 'translate(10px, 4px) scale(1)';

const getLabelSx = (theme: any) => ({
  '& .MuiInputBase-root': {
    marginTop: '15px',
  },
  '& .MuiInputLabel-root': {
    transform: LABEL_TRANSFORM,
    px: '4px',
    zIndex: 1,
    background: `linear-gradient(
      to bottom,
      transparent calc(50% - 2px),
      ${(theme.vars || theme).palette.background.default} calc(50% - 2px),
      ${(theme.vars || theme).palette.background.default} calc(50% + 2px),
      transparent calc(50% + 2px)
    )`,
    '&.MuiInputLabel-shrink, &.Mui-focused, &.MuiInputLabel-shrink.Mui-focused': {
      transform: LABEL_TRANSFORM,
    },
    '&.Mui-focused': {
      zIndex: 10,
    },
  },
});

export default function PointOfSale() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [cart, setCart] = useState<OrderItem[]>([]);
  const { branchId } = useBranch();
  const notifications = useNotifications();
  const [submitting, setSubmitting] = useState(false);

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 15,
  });
  const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [] });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [displayItems, setDisplayItems] = useState<MenuItem[]>([]);

  React.useEffect(() => {
    api
      .get('/menu/?limit=500')
      .then((rows: any[]) =>
        setMenuItems(
          rows
            .filter((m) => m.is_active)
            .map((m) => ({ id: String(m.menu_item_id), name: m.dish_name, price: m.price })),
        ),
      )
      .catch((e) => setMenuError(e.message));
  }, []);

  React.useEffect(() => {
    // Apply filtering
    let filtered = [...menuItems];

    if (filterModel.items.length > 0) {
      filterModel.items.forEach((filter: any) => {
        if (filter.field === 'name' && filter.value) {
          filtered = filtered.filter((item) =>
            item.name.toLowerCase().includes(filter.value.toLowerCase())
          );
        } else if (filter.field === 'price' && filter.value) {
          const price = parseFloat(filter.value);
          if (filter.operator === '>' || filter.operator === 'greaterThan') {
            filtered = filtered.filter((item) => item.price > price);
          } else if (filter.operator === '<' || filter.operator === 'lessThan') {
            filtered = filtered.filter((item) => item.price < price);
          } else if (filter.operator === '=' || filter.operator === 'equals') {
            filtered = filtered.filter((item) => item.price === price);
          }
        }
      });
    }

    // Apply sorting
    if (sortModel.length > 0) {
      const sort = sortModel[0];
      filtered.sort((a, b) => {
        const aVal = a[sort.field as keyof MenuItem];
        const bVal = b[sort.field as keyof MenuItem];

        if (aVal < bVal) return sort.sort === 'asc' ? -1 : 1;
        if (aVal > bVal) return sort.sort === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredItems(filtered);

    // Apply pagination
    const start = paginationModel.page * paginationModel.pageSize;
    const end = start + paginationModel.pageSize;
    setDisplayItems(filtered.slice(start, end));
  }, [menuItems, filterModel, sortModel, paginationModel]);

  const handleAddToCart = (item: MenuItem) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem.id === item.id);
      if (existingItem) {
        return prevCart.map((cartItem) =>
          cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
        );
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prevCart) => prevCart.filter((item) => item.id !== itemId));
    } else {
      setCart((prevCart) =>
        prevCart.map((item) => (item.id === itemId ? { ...item, quantity } : item))
      );
    }
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== itemId));
  };

  const handleIncrement = (itemId: string) => {
    const item = cart.find((cartItem) => cartItem.id === itemId);
    if (item) {
      handleUpdateQuantity(itemId, item.quantity + 1);
    }
  };

  const handleDecrement = (itemId: string) => {
    const item = cart.find((cartItem) => cartItem.id === itemId);
    if (item) {
      handleUpdateQuantity(itemId, Math.max(0, item.quantity - 1));
    }
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState(''); // '' = None, or use 'name' as a real default
  const [searchFocused, setSearchFocused] = useState(false);
  const [sortFocused, setSortFocused] = useState(false);

  const handleFinalizeOrder = async () => {
    if (branchId == null || cart.length === 0) return;
    setSubmitting(true);
    try {
      const order = await api.post('/orders/', {
        branch_id: branchId,
        items: cart.map((item) => ({ menu_item_id: Number(item.id), quantity: item.quantity })),
      });
      // A POS ring-up is a completed sale, not a tab left open - finalize it
      // right away so the ingredients actually get deducted.
      await api.post(`/orders/${order.order_id}/finalize`);
      notifications.show(`Order #${order.order_id} rung up.`, { severity: 'success', autoHideDuration: 3000 });
      setCart([]);
    } catch (err) {
      notifications.show(`Couldn't finalize the order: ${(err as Error).message}`, { severity: 'error', autoHideDuration: 6000 });
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(filteredItems.length / paginationModel.pageSize);

  return (
    <PageContainer
      title="Point of Sale"
      showBranchSelector={true}
      actions={
        <Button
          variant="contained"
          startIcon={<HistoryIcon />}
          onClick={() => navigate('/sales/order_log')}
        >
          Order History
        </Button>
      }
    >
      <Box sx={{ display: 'flex', gap: 3, height: '100%', overflow: 'hidden' }}>
        {/* Menu Items Section - 2/3 of the space */}
        <Box sx={{ flex: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header with Title and Controls */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, position: 'relative', zIndex: 1 }}>
            <Typography variant="h6">
              Menu Items
            </Typography>

            {/* TODO: Add filter and sort controls here */}
            <Box component="form" sx={{ display: 'flex', gap: 2, position: 'relative', zIndex: 10 }}>
                <TextField
                    label="Search by name"
                    size="small"
                    value={search}
                    placeholder="Type to search"
                    InputLabelProps={{ shrink: true }}
                    sx={{ ...getLabelSx(theme), minWidth: 220 }}
                    onChange={(e) => {
                        const value = e.target.value;
                        setSearch(value);
                        setFilterModel({
                        items: value ? [{ field: 'name', operator: 'contains', value }] : [],
                        });
                        setPaginationModel({ ...paginationModel, page: 0 });
                    }}
                />
                <TextField
                    label="Sort by"
                    size="small"
                    select
                    value={sortField}
                    InputLabelProps={{ shrink: true }}
                    SelectProps={{ native: true }}
                    sx={{ ...getLabelSx(theme), minWidth: 160 }}
                    onChange={(e) => {
                        const value = e.target.value;
                        setSortField(value);
                        setSortModel(value ? [{ field: value, sort: 'asc' }] : []);
                    }}
                    >
                    <option value="">None</option>
                    <option value="name">Name</option>
                    <option value="price">Price</option>
                </TextField>
            </Box>
        </Box>

            <TableContainer
                sx={{
                    height: 'calc(100vh - 300px)',
                    overflow: 'hidden',
                    p: 0.75,
                    m: -0.5,
                }}
                >
                <Table component="div" sx={{ display: 'block', height: '100%' }}>
                    <TableBody
                    component="div"
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                        gridTemplateRows: 'repeat(3, minmax(0, 1fr))',
                        gap: 2,
                        height: '100%',
                    }}
                    >
                    {menuError && (
                      <Typography color="error" sx={{ gridColumn: '1 / -1', p: 2 }}>{menuError}</Typography>
                    )}
                    {displayItems.map((item) => (
                        <TableRow
                        key={item.id}
                        component={Card}
                        hover={false}
                        onClick={() => handleAddToCart(item)}
                        sx={{
                            cursor: 'pointer',
                            transition: 'outline 0.2s',
                            outline: '2px solid transparent',
                            '&:hover': {
                            outline: '2px solid',
                            outlineColor: 'primary.main',
                            },
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: 2,
                            overflow: 'hidden',
                        }}
                        >
                        <TableCell
                            component="div"
                            sx={{
                            display: 'block',
                            border: 'none',
                            p: 0,
                            textAlign: 'center',
                            }}
                        >
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {item.name}
                            </Typography>
                            <Typography variant="h6" color="primary">
                            ${item.price.toFixed(2)}
                            </Typography>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            </TableContainer>

          {/* Pagination Controls */}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              onClick={() => setPaginationModel({ ...paginationModel, page: Math.max(0, paginationModel.page - 1) })}
              disabled={paginationModel.page === 0}
            >
              Previous
            </Button>
            <Typography variant="body2">
              Page {paginationModel.page + 1} of {totalPages || 1}
            </Typography>
            <Button
              onClick={() => setPaginationModel({ ...paginationModel, page: Math.min(totalPages - 1, paginationModel.page + 1) })}
              disabled={paginationModel.page >= totalPages - 1}
            >
              Next
            </Button>
          </Box>
        </Box>

        <Divider orientation="vertical" flexItem />

        {/* Order Entry Panel */}
        <Paper
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            p: 2,
            bgcolor: 'background.default',
            overflow: 'hidden',
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            Running Cart
          </Typography>

          {/* Cart Items - Scrollable Container */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              mb: 2,
              pr: 1,
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: '#f1f1f1',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#888',
                borderRadius: '4px',
              },
            }}
          >
            {cart.length === 0 ? (
              <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
                No items in cart
              </Typography>
            ) : (
              <Stack spacing={1}>
                {cart.map((item) => (
                  <Paper key={item.id} 
                    sx={{
                        flex: 1,
                        minHeight: 0,      
                        display: 'flex',
                        flexDirection: 'column',
                        p: 2,
                        bgcolor: 'background.default',
                        overflow: 'hidden',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                      {/* Left Side - Item Name and Unit Price */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {item.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          ${item.price.toFixed(2)} each
                        </Typography>
                      </Box>

                      {/* Right Side - Quantity Controls */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleDecrement(item.id)}
                          sx={{ p: 0.5, height: '32px', width: '32px' }}
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <TextField
                          type="number"
                          size="small"
                          value={item.quantity}
                        //   onChange={(e) =>
                        //     handleUpdateQuantity(item.id, Math.max(0, parseInt(e.target.value) || 0))
                        //   }
                        //   inputProps={{ min: 0, max: 999, style: { textAlign: 'center', padding: '4px' } }}
                          sx={{ width: '50px', height: '32px', mb: '15px','& input': { height: '32px', padding: 0 } }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleIncrement(item.id)}
                          sx={{ p: 0.5, height: '32px', width: '32px' }}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveFromCart(item.id)}
                          sx={{ p: 0.5, ml: 0.5, height: '32px', width: '32px' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Summary Section - Fixed at Bottom */}
          <Stack spacing={1.5} sx={{ mb: 2, flexShrink: 0 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Items:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {totalItems}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6">Total:</Typography>
              <Typography variant="h6" color="primary" sx={{ fontWeight: 700 }}>
                ${totalPrice.toFixed(2)}
              </Typography>
            </Box>
          </Stack>

          {/* Finalize Order Button */}
          <Button
            variant="contained"
            color="success"
            size="large"
            onClick={handleFinalizeOrder}
            disabled={cart.length === 0 || submitting || branchId == null}
            sx={{ width: '100%', flexShrink: 0 }}
          >
            {submitting ? 'Finalizing…' : 'Finalize Order'}
          </Button>
        </Paper>
      </Box>
    </PageContainer>
  );
}
