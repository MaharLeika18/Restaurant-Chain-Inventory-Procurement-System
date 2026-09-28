import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { DataGrid, GridActionsCellItem, GridColDef, gridClasses } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import { useDialogs } from '../../hooks/useDialogs/useDialogs';
import useNotifications from '../../hooks/useNotifications/useNotifications';
import { useBranch } from '../../context/BranchContext';
import PageContainer from '../PageContainer';
import type { FieldOption, FormField, ResourceConfig } from '../../resources/types';

type Values = Record<string, any>;

// "Failed to fetch" is what the browser says when it can't reach the backend at all.
// A bare "Internal Server Error" is an unexpected crash on the server.
function friendly(e: Error, action: 'save' | 'delete' | 'load') {
  if (e.message === 'Failed to fetch') {
    return "Can't reach the backend. Check that it is running (http://localhost:8000).";
  }
  if (e.message !== 'Internal Server Error') return e.message;
  return action === 'delete'
    ? 'It is probably still used by other records (for example a branch that has employees).'
    : action === 'save'
      ? 'The server could not save this. A record with the same name may already exist.'
      : 'The server hit an unexpected error while loading this page.';
}

function emptyValues(fields: FormField[]): Values {
  const v: Values = {};
  for (const f of fields) {
    if (f.type === 'boolean') v[f.name] = f.default ?? false;
    else if (f.type === 'recipe') v[f.name] = [{ ingredient_id: '', quantity_required: '' }];
    else v[f.name] = f.default ?? '';
  }
  return v;
}

function valuesFromRow(fields: FormField[], row: any): Values {
  const v = emptyValues(fields);
  for (const f of fields) {
    if (f.type === 'recipe') continue;
    const raw = row[f.name];
    if (raw === null || raw === undefined) continue;
    v[f.name] = f.type === 'boolean' ? Boolean(raw) : f.type === 'select' ? String(raw) : raw;
  }
  return v;
}

// Turns what's typed in the form into what the API expects.
function buildPayload(fields: FormField[], values: Values, options: Record<string, FieldOption[]>) {
  const payload: Values = {};
  for (const f of fields) {
    const raw = values[f.name];
    switch (f.type) {
      case 'boolean':
        payload[f.name] = Boolean(raw);
        break;
      case 'number':
        payload[f.name] = raw === '' || raw === null ? null : Number(raw);
        break;
      case 'select': {
        if (raw === '' || raw === null) payload[f.name] = null;
        else {
          const match = (options[f.name] ?? []).find((o) => String(o.value) === String(raw));
          payload[f.name] = match ? match.value : raw;
        }
        break;
      }
      case 'recipe':
        payload[f.name] = (raw as any[])
          .filter((r) => r.ingredient_id !== '' && r.quantity_required !== '')
          .map((r) => ({ ingredient_id: Number(r.ingredient_id), quantity_required: Number(r.quantity_required) }));
        break;
      default:
        payload[f.name] = typeof raw === 'string' && raw.trim() === '' ? null : raw;
    }
  }
  return payload;
}

function validate(fields: FormField[], values: Values, editing: boolean): string | null {
  for (const f of fields) {
    if (editing && f.createOnly) continue;
    if (f.type === 'recipe') {
      const partial = (values[f.name] as any[]).some(
        (r) => (r.ingredient_id === '') !== (r.quantity_required === ''),
      );
      if (partial) return 'Each recipe line needs both an ingredient and a quantity.';
      const bad = (values[f.name] as any[]).some((r) => r.quantity_required !== '' && Number(r.quantity_required) <= 0);
      if (bad) return 'Recipe quantities must be greater than 0.';
      continue;
    }
    if (f.required) {
      const v = values[f.name];
      if (v === '' || v === null || v === undefined) return `${f.label} is required.`;
    }
  }
  return null;
}

export default function ResourcePage({ config }: { config: ResourceConfig }) {
  const { branches, branchId, setBranchId, refreshBranches } = useBranch();
  const dialogs = useDialogs();
  const notifications = useNotifications();

  const scope = config.branchScope ?? 'none';
  const [optionalBranch, setOptionalBranch] = React.useState<string>('');
  const effectiveBranch: number | null =
    scope === 'required' ? branchId : scope === 'optional' && optionalBranch !== '' ? Number(optionalBranch) : null;

  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (scope === 'required' && effectiveBranch == null) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setRows(await config.load({ branchId: effectiveBranch }));
    } catch (e) {
      setError(friendly(e as Error, 'load'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [config, scope, effectiveBranch]);

  React.useEffect(() => {
    load();
  }, [load]);

  // ---- create / edit dialog ----
  const form = config.form;
  const [dialog, setDialog] = React.useState<{ mode: 'create' | 'edit'; row?: any } | null>(null);
  const [values, setValues] = React.useState<Values>({});
  const [options, setOptions] = React.useState<Record<string, FieldOption[]>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const openDialog = React.useCallback(
    async (mode: 'create' | 'edit', row?: any) => {
      if (!form) return;
      setFormError(null);
      setValues(mode === 'edit' ? valuesFromRow(form.fields, row) : emptyValues(form.fields));
      setDialog({ mode, row });
      // load dropdown choices (categories, ingredients...) when the dialog opens
      const loaded: Record<string, FieldOption[]> = {};
      await Promise.all(
        form.fields
          .filter((f) => f.options)
          .map(async (f) => {
            try {
              loaded[f.name] = await f.options!();
            } catch {
              loaded[f.name] = [];
            }
          }),
      );
      setOptions(loaded);
    },
    [form],
  );

  const handleSave = async () => {
    if (!form || !dialog) return;
    const editing = dialog.mode === 'edit';
    const problem = validate(form.fields, values, editing);
    if (problem) {
      setFormError(problem);
      return;
    }
    const fields = editing ? form.fields.filter((f) => !f.createOnly) : form.fields;
    const payload = buildPayload(fields, values, options);
    setSaving(true);
    setFormError(null);
    try {
      if (editing) await form.update!(dialog.row, payload);
      else await form.create!(payload);
      notifications.show(`${form.noun[0].toUpperCase()}${form.noun.slice(1)} ${editing ? 'updated' : 'created'}.`, {
        severity: 'success',
        autoHideDuration: 3000,
      });
      setDialog(null);
      load();
      if (config.refreshesBranches) refreshBranches();
    } catch (e) {
      setFormError(friendly(e as Error, 'save'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = React.useCallback(
    async (row: any) => {
      if (!form?.remove) return;
      const label = form.rowLabel ? form.rowLabel(row) : `this ${form.noun}`;
      const confirmed = await dialogs.confirm(`Do you wish to delete ${label}?`, {
        title: `Delete ${form.noun}?`,
        severity: 'error',
        okText: 'Delete',
        cancelText: 'Cancel',
      });
      if (!confirmed) return;
      try {
        await form.remove(row);
        notifications.show(`${form.noun[0].toUpperCase()}${form.noun.slice(1)} deleted.`, {
          severity: 'success',
          autoHideDuration: 3000,
        });
        load();
        if (config.refreshesBranches) refreshBranches();
      } catch (e) {
        notifications.show(`Couldn't delete: ${friendly(e as Error, 'delete')}`, { severity: 'error', autoHideDuration: 6000 });
      }
    },
    [form, dialogs, notifications, load, config.refreshesBranches, refreshBranches],
  );

  const columns = React.useMemo<GridColDef[]>(() => {
    if (!form?.update && !form?.remove) return config.columns;
    return [
      ...config.columns,
      {
        field: 'actions',
        type: 'actions',
        align: 'right',
        width: 100,
        getActions: ({ row }) => [
          ...(form.update
            ? [<GridActionsCellItem key="edit" icon={<EditIcon />} label="Edit" onClick={() => openDialog('edit', row)} />]
            : []),
          ...(form.remove
            ? [<GridActionsCellItem key="delete" icon={<DeleteIcon />} label="Delete" onClick={() => handleDelete(row)} />]
            : []),
        ],
      } as GridColDef,
    ];
  }, [config.columns, form, openDialog, handleDelete]);

  const branchPicker =
    scope === 'none' ? null : (
      <TextField
        select
        size="small"
        label="Branch"
        sx={{ minWidth: 180 }}
        // show "All branches" for the empty value instead of a blank box
        slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
        value={scope === 'required' ? (branchId != null ? String(branchId) : '') : optionalBranch}
        onChange={(e) =>
          scope === 'required' ? setBranchId(Number(e.target.value)) : setOptionalBranch(e.target.value)
        }
      >
        {scope === 'optional' && <MenuItem value="">All branches</MenuItem>}
        {branches.map((b: any) => (
          <MenuItem key={b.branch_id} value={String(b.branch_id)}>
            {b.branch_name}
          </MenuItem>
        ))}
      </TextField>
    );

  const editing = dialog?.mode === 'edit';

  return (
    <PageContainer
      title={config.title}
      breadcrumbs={[{ title: config.title }]}
      actions={
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {branchPicker}
          <Tooltip title="Reload data" placement="right" enterDelay={1000}>
            <div>
              <IconButton size="small" aria-label="refresh" onClick={load} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </div>
          </Tooltip>
          {form?.create && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog('create')}>
              Create
            </Button>
          )}
        </Stack>
      }
    >
      {config.notes && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {config.notes}
        </Alert>
      )}
      <Box sx={{ flex: 1, width: '100%' }}>
        {error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(r) => r[config.idField]}
            loading={loading}
            disableRowSelectionOnClick
            showToolbar
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            sx={{
              [`& .${gridClasses.columnHeader}, & .${gridClasses.cell}`]: { outline: 'transparent' },
              [`& .${gridClasses.columnHeader}:focus-within, & .${gridClasses.cell}:focus-within`]: { outline: 'none' },
            }}
            slotProps={{ baseIconButton: { size: 'small' } }}
          />
        )}
      </Box>

      {form && (
        <Dialog open={dialog !== null} onClose={() => !saving && setDialog(null)} fullWidth maxWidth="sm">
          <DialogTitle>
            {editing ? 'Edit' : 'Create'} {form.noun}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
              {form.fields
                .filter((f) => !(editing && f.createOnly))
                .map((f) => (
                  <FieldInput
                    key={f.name}
                    field={f}
                    value={values[f.name]}
                    options={options[f.name] ?? []}
                    onChange={(v) => setValues((prev) => ({ ...prev, [f.name]: v }))}
                  />
                ))}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialog(null)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </PageContainer>
  );
}

function FieldInput(props: {
  field: FormField;
  value: any;
  options: FieldOption[];
  onChange: (v: any) => void;
}) {
  const { field, value, options, onChange } = props;
  const label = `${field.label}${field.required ? ' *' : ''}`;

  if (field.type === 'boolean') {
    return (
      <FormControlLabel
        control={<Checkbox checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />}
        label={field.label}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <TextField select label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value)} fullWidth>
        <MenuItem value="">
          <em>None</em>
        </MenuItem>
        {options.map((o) => (
          <MenuItem key={String(o.value)} value={String(o.value)}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  if (field.type === 'recipe') {
    const lines = value as { ingredient_id: string; quantity_required: string }[];
    const update = (i: number, patch: object) => onChange(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
    return (
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {field.label}
        </Typography>
        <Stack spacing={1}>
          {lines.map((line, i) => (
            <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <TextField
                select
                size="small"
                label="Ingredient"
                sx={{ flex: 2 }}
                value={line.ingredient_id}
                onChange={(e) => update(i, { ingredient_id: e.target.value })}
              >
                {options.map((o) => (
                  <MenuItem key={String(o.value)} value={String(o.value)}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                type="number"
                label="Qty per serving"
                sx={{ flex: 1 }}
                value={line.quantity_required}
                onChange={(e) => update(i, { quantity_required: e.target.value })}
                slotProps={{ htmlInput: { step: 'any', min: 0 } }}
              />
              <IconButton
                aria-label="remove ingredient"
                size="small"
                disabled={lines.length === 1}
                onClick={() => onChange(lines.filter((_, idx) => idx !== i))}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
        </Stack>
        <Button size="small" sx={{ mt: 1 }} onClick={() => onChange([...lines, { ingredient_id: '', quantity_required: '' }])}>
          + Add ingredient
        </Button>
      </Box>
    );
  }

  return (
    <TextField
      label={label}
      type={field.type === 'number' ? 'number' : 'text'}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      multiline={field.multiline}
      minRows={field.multiline ? 2 : undefined}
      slotProps={field.type === 'number' ? { htmlInput: { step: 'any', min: 0 } } : undefined}
      fullWidth
    />
  );
}
