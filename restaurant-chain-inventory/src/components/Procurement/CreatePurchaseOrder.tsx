import * as React from 'react';
import { useState } from 'react';
import {
  Box,
  Button,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate, useLocation } from 'react-router';
import useNotifications from '../../hooks/useNotifications/useNotifications';
import PageContainer from '../PageContainer';

// TODO: Define types based on your data structure
interface POItem {
  id: string;
  ingredient: string;
  branch: string;
  currentStock: number;
  parLevel: number;
  recommendedQty: number;
  suggestedSupplier: string;
  urgency: 'Critical' | 'Low' | 'Normal';
  quantity: number;
  unitCost: number;
  lineTotal: number;
}

interface PurchaseOrderData {
  supplier: string;
  branch: string;
  expectedDeliveryDate: string;
  notes: string;
  items: POItem[];
}

// TODO: Replace with actual API call to fetch available suppliers
const availableSuppliers = ['Supplier A', 'Supplier B', 'Supplier C', 'Supplier D', 'Supplier E'];

// TODO: Replace with actual API call to fetch available branches
const availableBranches = ['Branch A', 'Branch B', 'Branch C', 'Branch D', 'Branch E'];

export default function CreatePurchaseOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  const notifications = useNotifications();

  // Get selected items from navigation state
  const selectedItems = (location.state as any)?.selectedItems || [];

  const [poData, setPoData] = useState<PurchaseOrderData>({
    supplier: '',
    branch: '',
    expectedDeliveryDate: new Date().toISOString().split('T')[0],
    notes: '',
    items: selectedItems.length > 0
      ? selectedItems.map((item: any) => ({
          ...item,
          quantity: item.recommendedQty,
          unitCost: 0, // TODO: Fetch from supplier pricing
          lineTotal: 0,
        }))
      : [],
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);

  const handleSupplierChange = (supplier: string) => {
    setPoData((prev) => ({ ...prev, supplier }));
    // TODO: Fetch unit costs from supplier pricing when supplier changes
  };

  const handleBranchChange = (branch: string) => {
    setPoData((prev) => ({ ...prev, branch }));
  };

  const handleItemDelete = (itemId: string) => {
    setPoData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId),
    }));
  };

  const handleEditClick = (item: POItem) => {
    setEditingId(item.id);
    setEditQuantity(item.quantity);
  };

  const handleEditSave = (itemId: string) => {
    setPoData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: editQuantity,
              lineTotal: editQuantity * item.unitCost,
            }
          : item
      ),
    }));
    setEditingId(null);
  };

  const handleEditCancel = () => {
    setEditingId(null);
  };

  const handleUnitCostChange = (itemId: string, unitCost: number) => {
    setPoData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              unitCost,
              lineTotal: item.quantity * unitCost,
            }
          : item
      ),
    }));
  };

  const handleAddItem = () => {
    // TODO: Add functionality to add new items manually
    notifications.showInfo('Add item functionality coming soon');
  };

  const handleSubmit = () => {
    if (!poData.supplier) {
      notifications.showError('Please select a supplier');
      return;
    }
    if (!poData.branch) {
      notifications.showError('Please select a branch');
      return;
    }
    if (poData.items.length === 0) {
      notifications.showError('Please add at least one item');
      return;
    }

    // TODO: Send to backend API
    console.log('Create Purchase Order:', poData);
    notifications.showSuccess('Purchase order created successfully');
    navigate('/procurement_management/purchase-orders');
  };

  const handleCancel = () => {
    navigate('/procurement_management/purchase-orders');
  };

  const totalCost = poData.items.reduce((sum, item) => sum + item.lineTotal, 0);

  return (
    <PageContainer
      title="Create Purchase Order"
      breadcrumbs={[
        { title: 'Procurement', path: '/procurement_management/purchase-orders' },
        { title: 'Purchase Orders', path: '/procurement_management/purchase-orders' },
        { title: 'Create' },
      ]}
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit}>
            Submit
          </Button>
        </Stack>
      }
    >
      <Stack spacing={3} sx={{ maxWidth: 1200 }}>
        {/* PO Details */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Purchase Order Details
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ minWidth: 200 }}>
              <InputLabel>Supplier</InputLabel>
              <Select
                value={poData.supplier}
                label="Supplier"
                onChange={(e) => handleSupplierChange(e.target.value)}
              >
                {availableSuppliers.map((supplier) => (
                  <MenuItem key={supplier} value={supplier}>
                    {supplier}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ minWidth: 200 }}>
              <InputLabel>Branch</InputLabel>
              <Select
                value={poData.branch}
                label="Branch"
                onChange={(e) => handleBranchChange(e.target.value)}
              >
                {availableBranches.map((branch) => (
                  <MenuItem key={branch} value={branch}>
                    {branch}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Expected Delivery Date"
              type="date"
              value={poData.expectedDeliveryDate}
              onChange={(e) => setPoData((prev) => ({ ...prev, expectedDeliveryDate: e.target.value }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 200 }}
            />
          </Stack>

          <TextField
            label="Notes (Optional)"
            multiline
            rows={2}
            value={poData.notes}
            onChange={(e) => setPoData((prev) => ({ ...prev, notes: e.target.value }))}
            fullWidth
            sx={{ mt: 2 }}
          />
        </Box>

        <Divider />

        {/* PO Items */}
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">
              PO Items ({poData.items.length})
            </Typography>
            <Button variant="outlined" onClick={handleAddItem} startIcon={<EditIcon />}>
              Add Item
            </Button>
          </Stack>

          {poData.items.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                No items added. Select items from Reorder Recommendations or add manually.
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Ingredient</TableCell>
                    <TableCell>Branch</TableCell>
                    <TableCell align="right">Current Stock</TableCell>
                    <TableCell align="right">PAR Level</TableCell>
                    <TableCell align="right">Recommended Qty</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Unit Cost</TableCell>
                    <TableCell align="right">Line Total</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {poData.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.ingredient}</TableCell>
                      <TableCell>{item.branch}</TableCell>
                      <TableCell align="right">{item.currentStock}</TableCell>
                      <TableCell align="right">{item.parLevel}</TableCell>
                      <TableCell align="right">{item.recommendedQty}</TableCell>
                      <TableCell align="right" sx={{ minWidth: 120 }}>
                        {editingId === item.id ? (
                          <TextField
                            type="number"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(parseInt(e.target.value) || 0)}
                            size="small"
                            inputProps={{ min: 0, style: { width: '80px' } }}
                          />
                        ) : (
                          item.quantity
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ minWidth: 120 }}>
                        <TextField
                          type="number"
                          value={item.unitCost}
                          onChange={(e) => handleUnitCostChange(item.id, parseFloat(e.target.value) || 0)}
                          size="small"
                          inputProps={{ min: 0, step: 0.01, style: { width: '80px' } }}
                        />
                      </TableCell>
                      <TableCell align="right">${item.lineTotal.toFixed(2)}</TableCell>
                      <TableCell align="center">
                        {editingId === item.id ? (
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <IconButton size="small" onClick={() => handleEditSave(item.id)} color="primary">
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={handleEditCancel}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        ) : (
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <IconButton size="small" onClick={() => handleEditClick(item)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleItemDelete(item.id)} color="error">
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>

        <Divider />

        {/* Summary */}
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Total Cost
            </Typography>
            <Typography variant="h4" color="primary">
              ${totalCost.toFixed(2)}
            </Typography>
          </Stack>
        </Box>
      </Stack>
    </PageContainer>
  );
}
