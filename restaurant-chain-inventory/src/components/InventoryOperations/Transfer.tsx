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

export default function Transfer() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const notifications = useNotifications();
  const { branches, branchId } = useBranch();
  const destinationOptions = branches.filter((b: any) => b.branch_id !== branchId);

  const [item, setItem] = useState<InventoryItem | null>(null);
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (branchId == null || !itemId) return;
    Promise.all([api.get(`/inventory/branch/${branchId}`), api.get('/ingredients/?limit=500')])
      .then(([stock, ingredients]: any[]) => {
        const row = stock.find((s: any) => String(s.branch_ingredient_id) === itemId);
        if (!row) { setLoadError('This item is no longer tracked at the current branch.'); return; }
        const ing = ingredients.find((i: any) => i.ingredient_id === row.ingredient_id);
        setItem({
          id: itemId, ingredientId: row.ingredient_id, ingredientName: ing?.ingredient_name ?? `#${row.ingredient_id}`,
          category: '', currentQty: row.current_stock, parLevel: row.par_level, status: 'OK',
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

  const [destinationBranch, setDestinationBranch] = useState('');
  const [quantity, setQuantity] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    // The backend transfers by ingredient + quantity, not by a specific batch
    // (see StockTransferCreate) - the batch dropdown below is just so you can
    // see what lots are available before deciding how much to send.
    if (!item || branchId == null) return;
    if (!destinationBranch || !quantity) {
      notifications.show('Destination branch and quantity are required', { severity: 'error', autoHideDuration: 4000 });
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/stock-transfers/', {
        from_branch_id: branchId, to_branch_id: Number(destinationBranch),
        items: [{ ingredient_id: item.ingredientId, quantity: parseInt(quantity, 10) }],
        notes: notes || null,
      });
      notifications.show('Transfer requested - it still needs approval before stock actually moves.', { severity: 'success', autoHideDuration: 4000 });
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

  if (loadError) return <PageContainer title="Transfer"><Typography color="error">{loadError}</Typography></PageContainer>;
  if (!item) return <PageContainer title="Transfer"><Typography color="text.secondary">Loading…</Typography></PageContainer>;

  return (
    <PageContainer
      title={`Transfer - ${item.ingredientName}`}
      breadcrumbs={[
        { title: 'Inventory', path: '/inventory_operations' },
        { title: 'Transfer' },
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
          <InputLabel>Destination Branch</InputLabel>
          <Select
            value={destinationBranch}
            label="Destination Branch"
            onChange={(e) => setDestinationBranch(e.target.value)}
          >
            {destinationOptions.map((branch: any) => (
              <MenuItem key={branch.branch_id} value={String(branch.branch_id)}>
                {branch.branch_name}
              </MenuItem>
            ))}
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

        <FormControl fullWidth>
          <InputLabel>Batch/Lot # (for reference)</InputLabel>
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
