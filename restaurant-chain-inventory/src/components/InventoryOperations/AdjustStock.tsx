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
import { useParams, useNavigate } from 'react-router';
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

// Backend reason enum (app/models/enums.py WasteReason) only decreases stock,
// so "Stock Out" and "Waste" both post to /inventory/waste under the hood -
// there is no separate decreasing-adjustment endpoint. "Stock In" posts to
// /inventory/adjustments instead, which only ever increases stock.
const REASON_TO_WASTE_ENUM: Record<string, string> = {
  spoilage: 'SPOILED',
  breakage: 'DAMAGED',
  'over-prep': 'PREP_ERROR',
  'count-correction': 'OTHER',
  other: 'OTHER',
};

export default function AdjustStock() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const notifications = useNotifications();
  const { branchId } = useBranch();

  const [item, setItem] = useState<InventoryItem | null>(null);
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  React.useEffect(() => {
    if (branchId == null || !itemId) return;
    Promise.all([api.get(`/inventory/branch/${branchId}`), api.get('/ingredients/?limit=500')])
      .then(([stock, ingredients]: any[]) => {
        const row = stock.find((s: any) => String(s.branch_ingredient_id) === itemId);
        if (!row) { setLoadError('This item is no longer tracked at the current branch.'); return; }
        const ing = ingredients.find((i: any) => i.ingredient_id === row.ingredient_id);
        setItem({
          id: itemId, ingredientId: row.ingredient_id, ingredientName: ing?.ingredient_name ?? `#${row.ingredient_id}`,
          category: '', currentQty: row.current_stock, parLevel: row.par_level,
          status: row.par_level > 0 && row.current_stock <= row.par_level * 0.5 ? 'Critical'
            : row.par_level > 0 && row.current_stock <= row.par_level ? 'Low'
            : row.par_level > 0 && row.current_stock > row.par_level * 1.5 ? 'Overstock' : 'OK',
          unit: ing?.unit_of_measure ?? '', nearestExpiry: row.nearest_expiry_date ?? '—', lastUpdated: row.last_updated,
        });
        return api.get(`/inventory/batches/branch/${branchId}/ingredient/${row.ingredient_id}?only_available=true`)
          .then((rows: any[]) => setBatches(rows.map((b) => ({
            id: String(b.batch_id), batchNumber: b.lot_number || `BATCH-${b.batch_id}`,
            receivedDate: b.received_date, expiryDate: b.expiration_date ?? '—',
            qtyRemaining: b.quantity_remaining, unitCost: b.unit_cost, sourcePO: '—',
          }))));
      })
      .catch((e) => setLoadError(e.message));
  }, [branchId, itemId]);

  const [type, setType] = useState<'in' | 'out' | 'waste'>('in');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!item || branchId == null) return;
    if (!quantity) {
      notifications.show('Quantity is required', { severity: 'error', autoHideDuration: 4000 });
      return;
    }
    if ((type === 'out' || type === 'waste') && !reason) {
      notifications.show('Reason is required for Stock Out/Waste', { severity: 'error', autoHideDuration: 4000 });
      return;
    }
    if ((type === 'out' || type === 'waste') && !selectedBatch) {
      notifications.show('Batch selection is required for Stock Out/Waste', { severity: 'error', autoHideDuration: 4000 });
      return;
    }

    setSubmitting(true);
    try {
      if (type === 'in') {
        await api.post('/inventory/adjustments', {
          branch_id: branchId, ingredient_id: item.ingredientId, quantity: parseInt(quantity, 10), notes: notes || null,
          transaction_type: 'ADJUSTMENT', // required by the schema even though this endpoint always forces it server-side
        });
      } else {
        await api.post('/inventory/waste', {
          branch_id: branchId, ingredient_id: item.ingredientId, batch_id: Number(selectedBatch),
          quantity: parseInt(quantity, 10), reason: REASON_TO_WASTE_ENUM[reason] ?? 'OTHER', notes: notes || null,
        });
      }
      notifications.show('Stock adjustment recorded successfully', { severity: 'success', autoHideDuration: 3000 });
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

  if (loadError) return <PageContainer title="Adjust Stock"><Typography color="error">{loadError}</Typography></PageContainer>;
  if (!item) return <PageContainer title="Adjust Stock"><Typography color="text.secondary">Loading…</Typography></PageContainer>;

  return (
    <PageContainer
      title={`Adjust Stock - ${item.ingredientName}`}
      breadcrumbs={[
        { title: 'Inventory', path: '/inventory_operations' },
        { title: 'Adjust Stock' },
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
      <Stack spacing={3} sx={{ maxWidth: 600 }}>
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Item Details
          </Typography>
          <Stack spacing={1}>
            <Typography variant="body2">Ingredient: {item.ingredientName}</Typography>
            <Typography variant="body2">Current Quantity: {item.currentQty} {item.unit}</Typography>
            <Typography variant="body2">Status: {item.status}</Typography>
          </Stack>
        </Box>

        <FormControl fullWidth>
          <InputLabel>Type</InputLabel>
          <Select
            value={type}
            label="Type"
            onChange={(e) => {
              setType(e.target.value as 'in' | 'out' | 'waste');
              setSelectedBatch('');
            }}
          >
            <MenuItem value="in">Stock In</MenuItem>
            <MenuItem value="out">Stock Out</MenuItem>
            <MenuItem value="waste">Waste</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Quantity"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          fullWidth
          inputProps={{ min: 0 }}
        />

        {(type === 'out' || type === 'waste') && (
          <>
            <FormControl fullWidth>
              <InputLabel>Reason</InputLabel>
              <Select
                value={reason}
                label="Reason"
                onChange={(e) => setReason(e.target.value)}
              >
                <MenuItem value="spoilage">Spoilage</MenuItem>
                <MenuItem value="breakage">Breakage</MenuItem>
                <MenuItem value="over-prep">Over-Prep</MenuItem>
                <MenuItem value="count-correction">Count Correction</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Batch/Lot #</InputLabel>
              <Select
                value={selectedBatch}
                label="Batch/Lot #"
                onChange={(e) => setSelectedBatch(e.target.value)}
              >
                {batches.map((batch) => (
                  <MenuItem key={batch.id} value={batch.id}>
                    {batch.batchNumber} (Exp: {batch.expiryDate}, Qty: {batch.qtyRemaining})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </>
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
