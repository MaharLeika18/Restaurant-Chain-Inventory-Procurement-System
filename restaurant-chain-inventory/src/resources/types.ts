import type { GridColDef } from '@mui/x-data-grid';

export type FieldOption = { value: string | number; label: string };

export type FormField = {
  name: string;
  label: string;
  // 'recipe' = a repeating "ingredient + quantity" list (used by Menu)
  type?: 'text' | 'number' | 'boolean' | 'select' | 'recipe';
  required?: boolean;
  multiline?: boolean;
  default?: unknown;
  createOnly?: boolean; // hidden when editing (the API can't change it after creation)
  options?: () => Promise<FieldOption[]>; // for 'select' and 'recipe'
};

export type ResourceConfig = {
  path: string; // must match the sidebar link
  title: string;
  idField: string; // which row field is unique (DataGrid needs one)
  columns: GridColDef[];
  // 'required' = shows the branch picker and loads that branch only
  // 'optional' = branch picker with an "All branches" choice
  branchScope?: 'none' | 'required' | 'optional';
  load: (ctx: { branchId: number | null }) => Promise<any[]>;
  notes?: string; // small hint shown above the table
  refreshesBranches?: boolean; // reload the global branch list after a change (Branches page)
  form?: {
    noun: string; // "branch", "ingredient" ... used in dialog titles
    fields: FormField[];
    create?: (payload: Record<string, any>) => Promise<unknown>;
    update?: (row: any, payload: Record<string, any>) => Promise<unknown>;
    remove?: (row: any) => Promise<unknown>;
    rowLabel?: (row: any) => string; // shown in the delete confirmation
  };
};
