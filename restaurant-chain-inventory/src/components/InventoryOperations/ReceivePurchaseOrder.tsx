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
import { api } from '../../api/client';

// TODO: Define types based on your data structure
interface PurchaseOrderItem {
  id: string;
  ingredientName: string;
  orderedQuantity: number;
  alreadyReceived: number;
  receivedQuantity: number;
  unitCost: number;
  lotNumber: string;
  expirationDate: string;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  expectedDeliveryDate: string;
  items: PurchaseOrderItem[];
}

export default function ReceivePurchaseOrder() {
  const navigate = useNavigate();
  const notifications = useNotifications();

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  React.useEffect(() => {
    // Only orders that can still receive a shipment.
    Promise.all([
      api.get('/purchase-orders/?status=ORDERED&limit=200'),
      api.get('/purchase-orders/?status=PARTIALLY_RECEIVED&limit=200'),
      api.get('/suppliers/?limit=500'),
      api.get('/ingredients/?limit=500'),
    ])
      .then(([ordered, partial, suppliers, ingredients]: any[]) => {
        const supplierById = new Map(suppliers.map((s: any) => [s.supplier_id, s.supplier_name]));
        const ingredientById = new Map(ingredients.map((i: any) => [i.ingredient_id, i.ingredient_name]));
        const mapped = [...ordered, ...partial].map((po: any) => ({
          id: String(po.po_id),
          poNumber: `PO-${po.po_id}`,
          supplier: supplierById.get(po.supplier_id) ?? `Supplier #${po.supplier_id}`,
          expectedDeliveryDate: po.expected_delivery_date ?? '—',
          items: po.items.map((it: any) => ({
            id: String(it.po_item_id),
            ingredientName: ingredientById.get(it.ingredient_id) ?? `#${it.ingredient_id}`,
            orderedQuantity: it.ordered_quantity,
            alreadyReceived: it.fulfilled_quantity,
            receivedQuantity: Math.max(0, it.ordered_quantity - it.fulfilled_quantity),
            unitCost: it.unit_cost,
            lotNumber: '',
            expirationDate: '',
          })),
        }));
        setPurchaseOrders(mapped);
      })
      .catch((e) => setLoadError(e.message));
  }, []);

  const [selectedPO, setSelectedPO] = useState('');
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([]);
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handlePOChange = (poId: string) => {
    setSelectedPO(poId);
    const po = purchaseOrders.find((p) => p.id === poId);
    if (po) {
      setPoItems(po.items.map((item) => ({ ...item })));
    }
  };

  const handleItemReceivedChange = (itemId: string, value: string) => {
    setPoItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, receivedQuantity: parseInt(value) || 0 } : item
      )
    );
  };

  const handleItemFieldChange = (itemId: string, field: 'lotNumber' | 'expirationDate', value: string) => {
    setPoItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)));
  };

  const handleSubmit = async () => {
    if (!selectedPO) {
      notifications.show('Please select a purchase order', { severity: 'error', autoHideDuration: 4000 });
      return;
    }
    const items = poItems.filter((it) => it.receivedQuantity > 0).map((it) => ({
      po_item_id: Number(it.id), quantity_received: it.receivedQuantity,
      lot_number: it.lotNumber || null, expiration_date: it.expirationDate || null,
    }));
    if (items.length === 0) {
      notifications.show('Enter at least one received quantity', { severity: 'error', autoHideDuration: 4000 });
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/purchase-orders/${selectedPO}/receive`, { items, actual_delivery_date: receivedDate });
      notifications.show('Purchase order received successfully', { severity: 'success', autoHideDuration: 3000 });
      navigate('/inventory_operations');
    } catch (err) {
      notifications.show((err as Error).message, { severity: 'error', autoHideDuration: 6000 });
    } finally {
      setSubmitting(false);
    }
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
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving…' : 'Submit'}
          </Button>
        </Stack>
      }
    >
      <Stack spacing={3} sx={{ maxWidth: 800 }}>
        {loadError && <Typography color="error">{loadError}</Typography>}
        <FormControl fullWidth>
          <InputLabel>Purchase Order</InputLabel>
          <Select
            value={selectedPO}
            label="Purchase Order"
            onChange={(e) => handlePOChange(e.target.value)}
          >
            {purchaseOrders.length === 0 && <MenuItem value="" disabled>No purchase orders are waiting to be received</MenuItem>}
            {purchaseOrders.map((po) => (
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
                    // border: '1px solid #ccc',
                    borderRadius: '4px',
                    padding: 2,
                    // backgroundColor: '#f9f9f9',
                  }}
                >
                  <Typography variant="subtitle1" gutterBottom>
                    {item.ingredientName}
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="body2" sx={{ minWidth: 150 }}>
                      Ordered: {item.orderedQuantity}{item.alreadyReceived > 0 ? ` (${item.alreadyReceived} already received)` : ''}
                    </Typography>
                    <TextField
                      label="Received Quantity"
                      type="number"
                      value={item.receivedQuantity}
                      onChange={(e) => handleItemReceivedChange(item.id, e.target.value)}
                      inputProps={{ min: 0, max: item.orderedQuantity - item.alreadyReceived }}
                      sx={{ width: 150 }}
                    />
                    <Typography variant="body2" sx={{ minWidth: 100 }}>
                      Unit Cost: ${item.unitCost.toFixed(2)}
                    </Typography>
                    <TextField
                      label="Lot # (optional)"
                      value={item.lotNumber}
                      onChange={(e) => handleItemFieldChange(item.id, 'lotNumber', e.target.value)}
                      sx={{ width: 160 }}
                    />
                    <TextField
                      label="Expires (optional)"
                      type="date"
                      value={item.expirationDate}
                      onChange={(e) => handleItemFieldChange(item.id, 'expirationDate', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ width: 160 }}
                    />
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
