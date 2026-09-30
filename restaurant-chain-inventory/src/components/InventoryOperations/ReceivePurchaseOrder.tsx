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
} from '@mui/material';
import { useNavigate } from 'react-router';
import useNotifications from '../../hooks/useNotifications/useNotifications';
import PageContainer from '../PageContainer';

// TODO: Define types based on your data structure
interface PurchaseOrderItem {
  id: string;
  ingredientName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitCost: number;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  expectedDeliveryDate: string;
  items: PurchaseOrderItem[];
}

// TODO: Replace with actual API call to fetch purchase orders
const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: '1',
    poNumber: 'PO-2025-001',
    supplier: 'Supplier A',
    expectedDeliveryDate: '2025-10-05',
    items: [
      { id: '1', ingredientName: 'Tomato Sauce', orderedQuantity: 50, receivedQuantity: 0, unitCost: 2.5 },
      { id: '2', ingredientName: 'Mozzarella Cheese', orderedQuantity: 100, receivedQuantity: 0, unitCost: 8.0 },
    ],
  },
  {
    id: '2',
    poNumber: 'PO-2025-002',
    supplier: 'Supplier B',
    expectedDeliveryDate: '2025-10-10',
    items: [
      { id: '3', ingredientName: 'Olive Oil', orderedQuantity: 25, receivedQuantity: 0, unitCost: 15.0 },
    ],
  },
];

export default function ReceivePurchaseOrder() {
  const navigate = useNavigate();
  const notifications = useNotifications();

  const [selectedPO, setSelectedPO] = useState('');
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([]);
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const handlePOChange = (poId: string) => {
    setSelectedPO(poId);
    const po = mockPurchaseOrders.find((p) => p.id === poId);
    if (po) {
      setPoItems(po.items.map((item) => ({ ...item, receivedQuantity: 0 })));
    }
  };

  const handleItemReceivedChange = (itemId: string, value: string) => {
    setPoItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, receivedQuantity: parseInt(value) || 0 } : item
      )
    );
  };

  const handleSubmit = () => {
    if (!selectedPO) {
      notifications.showError('Please select a purchase order');
      return;
    }

    const po = mockPurchaseOrders.find((p) => p.id === selectedPO);
    if (!po) return;

    // TODO: Send to backend API
    console.log('Receive Purchase Order:', {
      poId: selectedPO,
      poNumber: po.poNumber,
      receivedDate,
      items: poItems,
      notes,
    });

    notifications.showSuccess('Purchase order received successfully');
    navigate('/inventory_operations');
  };

  const handleCancel = () => {
    navigate('/inventory_operations');
  };

  return (
    <PageContainer
      title="Receive Purchase Order"
      breadcrumbs={[
        { title: 'Inventory', path: '/inventory_operations' },
        { title: 'Receive Purchase Order' },
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
      <Stack spacing={3} sx={{ maxWidth: 800 }}>
        <FormControl fullWidth>
          <InputLabel>Purchase Order</InputLabel>
          <Select
            value={selectedPO}
            label="Purchase Order"
            onChange={(e) => handlePOChange(e.target.value)}
          >
            {mockPurchaseOrders.map((po) => (
              <MenuItem key={po.id} value={po.id}>
                {po.poNumber} - {po.supplier} (Expected: {po.expectedDeliveryDate})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Received Date"
          type="date"
          value={receivedDate}
          onChange={(e) => setReceivedDate(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />

        {poItems.length > 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Items to Receive
            </Typography>
            <Stack spacing={2}>
              {poItems.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    padding: 2,
                    backgroundColor: '#f9f9f9',
                  }}
                >
                  <Typography variant="subtitle1" gutterBottom>
                    {item.ingredientName}
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="body2" sx={{ minWidth: 150 }}>
                      Ordered: {item.orderedQuantity}
                    </Typography>
                    <TextField
                      label="Received Quantity"
                      type="number"
                      value={item.receivedQuantity}
                      onChange={(e) => handleItemReceivedChange(item.id, e.target.value)}
                      inputProps={{ min: 0, max: item.orderedQuantity }}
                      sx={{ width: 150 }}
                    />
                    <Typography variant="body2" sx={{ minWidth: 100 }}>
                      Unit Cost: ${item.unitCost.toFixed(2)}
                    </Typography>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        <TextField
          label="Notes (Optional)"
          multiline
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          fullWidth
        />
      </Stack>
    </PageContainer>
  );
}
