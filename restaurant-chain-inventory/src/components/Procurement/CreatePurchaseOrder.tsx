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
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate, useLocation } from 'react-router';
import useNotifications from '../../hooks/useNotifications/useNotifications';
import PageContainer from '../PageContainer';
import { api } from '../../api/client';

// item.id here is the ingredient_id (as a string) - the Dashboard's Reorder
// Recommendations grid and the reorder-predictions page both hand off rows
// shaped like this via navigate(..., { state: { selectedItems } }).
interface POItem {
  id: string;            // `${branchId}-${ingredientId}`, also the dedupe key
  ingredientId: number;  // new
  branchId: number;      // new
  ingredient: string;
  branch: string;
  currentStock: number;
  parLevel: number;
  recommendedQty: number;
  suggestedSupplier: string;
  suggestedSupplierId: number | null;
  urgency: 'Critical' | 'Low' | 'Normal';
  quantity: number;
  unitCost: number;
  lineTotal: number;
}

// Whatever your recommendations list produces
interface PurchaseOrderData {
  supplier: string; // supplier_id, as a string (kept as string for the Select's value)
  branch: string; // branch_id, as a string
  expectedDeliveryDate: string;
  notes: string;
  items: POItem[];
}

export default function CreatePurchaseOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  const notifications = useNotifications();

  const [availableSuppliers, setAvailableSuppliers] = useState<{ id: number; name: string }[]>([]);
  const [availableBranches, setAvailableBranches] = useState<{ id: number; name: string }[]>([]);
  React.useEffect(() => {
    api.get('/suppliers/?limit=500').then((rows: any[]) => setAvailableSuppliers(rows.map((s) => ({ id: s.supplier_id, name: s.supplier_name }))));
    api.get('/branches/?limit=500').then((rows: any[]) => setAvailableBranches(rows.map((b) => ({ id: b.branch_id, name: b.branch_name }))));
  }, []);

  // Get selected items from navigation state (e.g. the Dashboard's Reorder Recommendations grid)
  const selectedItems = (location.state as any)?.selectedItems || [];

  const [poData, setPoData] = useState<PurchaseOrderData>({
    supplier: '',
    branch: selectedItems.length > 0 ? String(selectedItems[0].branchId ?? '') : '',
    expectedDeliveryDate: new Date().toISOString().split('T')[0],
    notes: '',
    items: selectedItems.length > 0
      ? selectedItems.map((item: any) => ({
          ...item,
          quantity: item.recommendedQty,
          unitCost: item.unitCost ?? 0,
          lineTotal: (item.unitCost ?? 0) * item.recommendedQty,
        }))
      : [],
  });

  // If every selected row shares the same suggested supplier, preselect it.
  React.useEffect(() => {
    if (poData.items.length > 0 && !poData.supplier) {
      const ids = new Set(poData.items.map((it) => it.suggestedSupplierId).filter(Boolean));
      if (ids.size === 1) setPoData((prev) => ({ ...prev, supplier: String([...ids][0]) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);

  const handleSupplierChange = (supplier: string) => {
    setPoData((prev) => ({ ...prev, supplier }));
    // Pull this supplier's price for each already-added ingredient, where they carry it.
    Promise.all(
      poData.items.map((item) =>
        api.get(`/suppliers/ingredient-links/by-ingredient/${item.id}`).then((links: any[]) => {
          const link = links.find((l) => String(l.supplier_id) === supplier);
          return { id: item.id, unitCost: link ? link.unit_cost : null };
        }),
      ),
    ).then((results) => {
      setPoData((prev) => ({
        ...prev,
        items: prev.items.map((item) => {
          const found = results.find((r) => r.id === item.id);
          if (!found || found.unitCost == null) return item;
          return { ...item, unitCost: found.unitCost, lineTotal: item.quantity * found.unitCost };
        }),
      }));
    });
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

  const [addOpen, setAddOpen] = useState(false);
  const [ingredientOptions, setIngredientOptions] = useState<any[]>([]); // /ingredients/
  const [stockByIngredient, setStockByIngredient] = useState<Map<number, any>>(new Map());
  const [newIngredientId, setNewIngredientId] = useState('');
  const [newQty, setNewQty] = useState<number>(1);
  const [newLinks, setNewLinks] = useState<any[]>([]); // supplier links for the chosen ingredient
  const [newUnitCost, setNewUnitCost] = useState<number>(0);

  const handleAddItem = async () => {
    if (!poData.branch) {
      notifications.show('Select a branch before adding items.', { severity: 'warning', autoHideDuration: 4000 });
      return;
    }
    setNewIngredientId('');
    setNewQty(1);
    setNewLinks([]);
    setNewUnitCost(0);
    setAddOpen(true);

    // Load once per open: the catalog, plus this branch's stock and PAR levels
    try {
      const [ingredients, stock] = await Promise.all([
        api.get('/ingredients/?limit=500'),
        api.get(`/inventory/branch/${poData.branch}`),
      ]);
      setIngredientOptions(ingredients);
      setStockByIngredient(new Map(stock.map((s: any) => [s.ingredient_id, s])));
    } catch (e: any) {
      notifications.show(`Could not load ingredients: ${e.message}`, { severity: 'error', autoHideDuration: 4000 });
    }
  };

  // When an ingredient is chosen, look up who supplies it and at what cost
  const handleIngredientPick = async (idStr: string) => {
    setNewIngredientId(idStr);
    setNewLinks([]);
    setNewUnitCost(0);
    if (!idStr) return;

    const links = await api.get(`/suppliers/ingredient-links/by-ingredient/${idStr}`);
    setNewLinks(links);

    // Use the PO's supplier if one is chosen, otherwise the preferred (or first) supplier
    const link = poData.supplier
      ? links.find((l: any) => String(l.supplier_id) === poData.supplier)
      : links.find((l: any) => l.is_preferred) ?? links[0];
    setNewUnitCost(link ? Number(link.unit_cost) : 0);
  };

  const round2 = (n: number) => Math.round(n * 100) / 100;

  const handleConfirmAdd = () => {
    const ingredientId = Number(newIngredientId);
    const ingredient = ingredientOptions.find((i) => i.ingredient_id === ingredientId);
    if (!ingredient) return;

    if (poData.items.some((i) => i.ingredientId === ingredientId)) {
      notifications.show(`${ingredient.ingredient_name} is already in this PO.`, { severity: 'info', autoHideDuration: 4000 });
      return;
    }
    if (newQty <= 0) {
      notifications.show('Quantity must be greater than 0.', { severity: 'warning', autoHideDuration: 4000 });
      return;
    }

    // Pick the supplier link: the PO's supplier, else preferred/first
    const link = poData.supplier
      ? newLinks.find((l) => String(l.supplier_id) === poData.supplier)
      : newLinks.find((l) => l.is_preferred) ?? newLinks[0];

    if (poData.supplier && !link) {
      notifications.show(`${ingredient.ingredient_name} isn't offered by the selected supplier.`, { severity: 'warning', autoHideDuration: 4000 });
      return;
    }

    const stock = stockByIngredient.get(ingredientId);
    const currentStock = Number(stock?.current_stock ?? 0);
    const parLevel = Number(stock?.par_level ?? 0);

    const newItem = {
      id: String(ingredientId),
      ingredientId,
      branchId: Number(poData.branch),
      ingredient: ingredient.ingredient_name,
      branch: poData.branch, // however you display the selected branch; swap in your variable
      currentStock,
      parLevel,
      recommendedQty: Math.max(0, Math.ceil(parLevel - currentStock)),
      suggestedSupplier: link ? poData.supplier : 'None configured',
      suggestedSupplierId: link?.supplier_id ?? null,
      urgency: parLevel > 0 && currentStock / parLevel <= 0.5 ? 'Critical'
            : parLevel > 0 && currentStock <= parLevel ? 'Low' : 'Normal',
      quantity: newQty,
      unitCost: newUnitCost,
      lineTotal: round2(newQty * newUnitCost),
    };

    setPoData((prev) => ({
      ...prev,
      // First item fixes the supplier, so later items must come from the same one
      supplier: prev.supplier || (link ? String(link.supplier_id) : ''),
      items: [...prev.items, newItem as any],
    }));
    setAddOpen(false);
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!poData.supplier) {
      notifications.show('Please select a supplier', { severity: 'error', autoHideDuration: 4000 });
      return;
    }
    if (!poData.branch) {
      notifications.show('Please select a branch', { severity: 'error', autoHideDuration: 4000 });
      return;
    }
    if (poData.items.length === 0) {
      notifications.show('Please add at least one item', { severity: 'error', autoHideDuration: 4000 });
      return;
    }
    const zeroQty = poData.items.find((item) => item.quantity <= 0);
    if (zeroQty) {
      notifications.show(`Set a quantity greater than 0 for ${zeroQty.ingredient} before submitting.`, { severity: 'error', autoHideDuration: 5000 });
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/purchase-orders/', {
        branch_id: Number(poData.branch),
        supplier_id: Number(poData.supplier),
        expected_delivery_date: poData.expectedDeliveryDate || null,
        notes: poData.notes || null,
        items: poData.items.map((item) => ({
          ingredient_id: Number(item.id), ordered_quantity: item.quantity, unit_cost: item.unitCost,
        })),
      });
      notifications.show('Purchase order created successfully', { severity: 'success', autoHideDuration: 3000 });
      navigate('/procurement_management');
    } catch (err) {
      notifications.show((err as Error).message, { severity: 'error', autoHideDuration: 6000 });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/procurement_management');
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
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving…' : 'Submit'}
          </Button>
        </Stack>
      }
    >
      <Stack spacing={3} sx={{ width: '100%', maxWidth: 1200 }}>
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
                  <MenuItem key={supplier.id} value={String(supplier.id)}>
                    {supplier.name}
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
                  <MenuItem key={branch.id} value={String(branch.id)}>
                    {branch.name}
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
            <Button variant="outlined" onClick={handleAddItem} startIcon={<EditIcon />} sx={{ ml: 'auto'}}>
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
        <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle>Add item</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                select
                size="small"
                label="Ingredient"
                value={newIngredientId}
                onChange={(e) => handleIngredientPick(e.target.value)}
              >
                {ingredientOptions
                  .filter((i) => !poData.items.some((it) => it.ingredientId === i.ingredient_id))
                  .map((i) => (
                    <MenuItem key={i.ingredient_id} value={String(i.ingredient_id)}>
                      {i.ingredient_name} ({i.unit_of_measure})
                    </MenuItem>
                  ))}
              </TextField>

              {newIngredientId && newLinks.length === 0 && (
                <Alert severity="warning">No supplier is configured for this ingredient.</Alert>
              )}

              <TextField
                size="small"
                type="number"
                label="Quantity"
                value={newQty}
                onChange={(e) => setNewQty(parseFloat(e.target.value) || 0)}
                inputProps={{ min: 0, step: 'any' }}
              />
              <TextField
                size="small"
                type="number"
                label="Unit cost"
                value={newUnitCost}
                onChange={(e) => setNewUnitCost(parseFloat(e.target.value) || 0)}
                inputProps={{ min: 0, step: 0.01 }}
              />
              <Typography variant="body2" color="text.secondary">
                Line total: {round2(newQty * newUnitCost).toFixed(2)}
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="contained" disabled={!newIngredientId || newQty <= 0} onClick={handleConfirmAdd}>
              Add to PO
            </Button>
          </DialogActions>
        </Dialog>

        {/* <Divider /> */}

        {/* Summary */}
        <Box sx={{ width: '100%', pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ width: '100%' }}>
            <Typography variant="h6">
              Total Cost
            </Typography>
            <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
              ${totalCost.toFixed(2)}
            </Typography>
          </Stack>
        </Box>
      </Stack>
    </PageContainer>
  );
}

