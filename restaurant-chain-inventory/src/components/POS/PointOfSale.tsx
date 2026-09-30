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
} from '@mui/material';
import PageContainer from '../PageContainer';
import React from 'react';
import {
  GridFilterModel,
  GridPaginationModel,
  GridSortModel,
} from '@mui/x-data-grid';

// TODO: Define proper MenuItem type based on your data structure
interface MenuItem {
  id: string;
  name: string;
  price: number;
  // Add other menu item properties as needed
}

// TODO: Define OrderItem type
interface OrderItem extends MenuItem {
  quantity: number;
}

// Mock data for menu items
const mockMenuItems: MenuItem[] = [
  { id: '1', name: 'Burger', price: 12.99 },
  { id: '2', name: 'Pizza', price: 14.99 },
  { id: '3', name: 'Salad', price: 9.99 },
  { id: '4', name: 'Pasta', price: 13.50 },
  { id: '5', name: 'Steak', price: 22.99 },
  { id: '6', name: 'Fish', price: 18.99 },
  { id: '7', name: 'Chicken Wings', price: 11.99 },
  { id: '8', name: 'Soup', price: 8.99 },
  { id: '9', name: 'Dessert', price: 7.99 },
  { id: '10', name: 'Beverage', price: 3.99 },
  { id: '11', name: 'Appetizer', price: 10.99 },
  { id: '12', name: 'Side', price: 5.99 },
  { id: '13', name: 'Sandwich', price: 11.50 },
  { id: '14', name: 'Tacos', price: 10.99 },
  { id: '15', name: 'Ramen', price: 12.50 },
];

export default function PointOfSale() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<OrderItem[]>([]);

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 15,
  });
  const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [] });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>(mockMenuItems);
  const [displayItems, setDisplayItems] = useState<MenuItem[]>(mockMenuItems);

  React.useEffect(() => {
    // Apply filtering
    let filtered = [...mockMenuItems];

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
  }, [filterModel, sortModel, paginationModel]);

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


  const handleFinalizeOrder = () => {
    // TODO: Send order data to backend API
    console.log('Order finalized:', { items: cart, total: totalPrice });
    setCart([]);
    // TODO: Show confirmation message or redirect to order confirmation page
  };

  const totalPages = Math.ceil(filteredItems.length / paginationModel.pageSize);

  return (
    <PageContainer
      title="Point of Sale"
      actions={
        <Button
          variant="contained"
          startIcon={<HistoryIcon />}
          onClick={() => navigate('/order_processing/order_history')}
        >
          Order History
        </Button>
      }
    >
      <Box sx={{ display: 'flex', gap: 3, height: '100%', overflow: 'hidden' }}>
        {/* Menu Items Section - 2/3 of the space */}
        <Box sx={{ flex: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header with Title and Controls */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2 }}>
            <Typography variant="h6">
              Menu Items
            </Typography>

            {/* TODO: Add filter and sort controls here */}
            <Box component="form" sx={{ display: 'flex', gap: 2 }}>
            <TextField
                label="Search by name"
                size="small"
                value={search}
                placeholder="Type to search"
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 220 }}
                onChange={(e) => {
                const value = e.target.value;
                setSearch(value);
                setFilterModel({
                    items: value
                    ? [{ field: 'name', operator: 'contains', value }]
                    : [],
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
                sx={{ minWidth: 160 }}
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

        {/* Order Entry Panel - 1/3 of the space */}
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
                  <Paper key={item.id} sx={{ p: 1.5, bgcolor: 'background.paper' }}>
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
                          onChange={(e) =>
                            handleUpdateQuantity(item.id, Math.max(0, parseInt(e.target.value) || 0))
                          }
                          inputProps={{ min: 0, max: 999, style: { textAlign: 'center', padding: '4px' } }}
                          sx={{ width: '50px', height: '32px', '& input': { height: '32px', padding: 0 } }}
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
            disabled={cart.length === 0}
            sx={{ width: '100%', flexShrink: 0 }}
          >
            Finalize Order
          </Button>
        </Paper>
      </Box>
    </PageContainer>
  );
}
