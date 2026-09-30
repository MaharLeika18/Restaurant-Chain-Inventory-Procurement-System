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

// TODO: Replace with actual API call to fetch inventory item and batches
const mockInventoryItem: InventoryItem = {
  id: '1',
  ingredientName: 'Tomato Sauce',
  category: 'Sauces',
  currentQty: 45,
  parLevel: 50,
  status: 'Low',
  unit: 'Liters',
  nearestExpiry: '2025-03-15',
  lastUpdated: '2025-09-30T10:30:00Z',
};

const mockBatches: InventoryBatch[] = [
  { id: 'b1', batchNumber: 'BATCH-001', receivedDate: '2025-09-20', expiryDate: '2025-03-15', qtyRemaining: 45, unitCost: 2.5, sourcePO: 'PO-2025-001' },
];

// TODO: Replace with actual API call to fetch available branches
const availableBranches = ['Branch A', 'Branch B', 'Branch C', 'Branch D'];

export default function Transfer() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const notifications = useNotifications();

  const [destinationBranch, setDestinationBranch] = useState('');
  const [quantity, setQuantity] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!destinationBranch || !quantity || !selectedBatch) {
      notifications.showError('All fields are required');
      return;
    }

    // TODO: Send to backend API
    console.log('Transfer:', {
      itemId,
      destinationBranch,
      quantity: parseInt(quantity),
      batchId: selectedBatch,
      notes,
    });

    notifications.showSuccess('Transfer recorded successfully');
    navigate('/inventory_operations');
  };

  const handleCancel = () => {
    navigate('/inventory_operations');
  };

  return (
    <PageContainer
      title={`Transfer - ${mockInventoryItem.ingredientName}`}
      breadcrumbs={[
        { title: 'Inventory', path: '/inventory_operations' },
        { title: 'Transfer' },
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
      <Stack spacing={3} sx={{ maxWidth: 600 }}>
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Item Details
          </Typography>
          <Stack spacing={1}>
            <Typography variant="body2">Ingredient: {mockInventoryItem.ingredientName}</Typography>
            <Typography variant="body2">Current Quantity: {mockInventoryItem.currentQty} {mockInventoryItem.unit}</Typography>
            <Typography variant="body2">Status: {mockInventoryItem.status}</Typography>
          </Stack>
        </Box>

        <FormControl fullWidth>
          <InputLabel>Destination Branch</InputLabel>
          <Select
            value={destinationBranch}
            label="Destination Branch"
            onChange={(e) => setDestinationBranch(e.target.value)}
          >
            {availableBranches.map((branch) => (
              <MenuItem key={branch} value={branch}>
                {branch}
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
          <InputLabel>Batch/Lot #</InputLabel>
          <Select
            value={selectedBatch}
            label="Batch/Lot #"
            onChange={(e) => setSelectedBatch(e.target.value)}
          >
            {mockBatches.map((batch) => (
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
