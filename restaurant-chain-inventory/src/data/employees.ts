import type { GridFilterModel, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import { api } from '../api/client';

// Mirrors the real backend's Employee model (app/models/employee.py) and
// EmployeeOut schema (app/schemas/employee.py) - see backend/README.md.
export interface Employee {
  id: number; // maps to employee_id
  branch_id: number;
  name: string; // maps to full_name
  position: string | null;
  contact_number: string | null;
  hire_date: string | null; // ISO date
  is_active: boolean;
}

function fromApi(e: any): Employee {
  return {
    id: e.employee_id,
    branch_id: e.branch_id,
    name: e.full_name,
    position: e.position ?? null,
    contact_number: e.contact_number ?? null,
    hire_date: e.hire_date ?? null,
    is_active: e.is_active,
  };
}

function toApi(data: Partial<Omit<Employee, 'id'>>) {
  const payload: Record<string, unknown> = {};
  if (data.branch_id !== undefined) payload.branch_id = data.branch_id;
  if (data.name !== undefined) payload.full_name = data.name;
  if (data.position !== undefined) payload.position = data.position;
  if (data.contact_number !== undefined) payload.contact_number = data.contact_number;
  if (data.hire_date !== undefined) payload.hire_date = data.hire_date ? data.hire_date.slice(0, 10) : null;
  if (data.is_active !== undefined) payload.is_active = data.is_active;
  return payload;
}

export async function getMany({
  paginationModel,
  filterModel,
  sortModel,
}: {
  paginationModel: GridPaginationModel;
  sortModel: GridSortModel;
  filterModel: GridFilterModel;
}): Promise<{ items: Employee[]; itemCount: number }> {
  // The backend doesn't support arbitrary DataGrid filter/sort operators
  // over HTTP yet, so we fetch (up to a reasonable cap) and do that part
  // client-side, same as the page did against localStorage before this.
  const raw = await api.get('/employees/?limit=500');
  let employees = raw.map(fromApi);

  if (filterModel?.items?.length) {
    filterModel.items.forEach(({ field, value, operator }) => {
      if (!field || value == null) return;
      employees = employees.filter((employee) => {
        const employeeValue = (employee as any)[field];
        switch (operator) {
          case 'contains':
            return String(employeeValue).toLowerCase().includes(String(value).toLowerCase());
          case 'equals':
            return employeeValue === value;
          case 'startsWith':
            return String(employeeValue).toLowerCase().startsWith(String(value).toLowerCase());
          case 'endsWith':
            return String(employeeValue).toLowerCase().endsWith(String(value).toLowerCase());
          case '>':
            return employeeValue > value;
          case '<':
            return employeeValue < value;
          default:
            return true;
        }
      });
    });
  }

  if (sortModel?.length) {
    employees.sort((a, b) => {
      for (const { field, sort } of sortModel) {
        const av = (a as any)[field];
        const bv = (b as any)[field];
        if (av < bv) return sort === 'asc' ? -1 : 1;
        if (av > bv) return sort === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  const start = paginationModel.page * paginationModel.pageSize;
  const end = start + paginationModel.pageSize;

  return {
    items: employees.slice(start, end),
    itemCount: employees.length,
  };
}

export async function getOne(employeeId: number): Promise<Employee> {
  const raw = await api.get(`/employees/${employeeId}`);
  return fromApi(raw);
}

export async function createOne(data: Omit<Employee, 'id'>): Promise<Employee> {
  const raw = await api.post('/employees/', toApi(data));
  return fromApi(raw);
}

export async function updateOne(
  employeeId: number,
  data: Partial<Omit<Employee, 'id'>>,
): Promise<Employee> {
  const raw = await api.patch(`/employees/${employeeId}`, toApi(data));
  return fromApi(raw);
}

export async function deleteOne(employeeId: number): Promise<void> {
  await api.delete(`/employees/${employeeId}`);
}

// Validation follows the [Standard Schema](https://standardschema.dev/).
type ValidationResult = { issues: { message: string; path: (keyof Employee)[] }[] };

export function validateEmployee(employee: Partial<Employee>): ValidationResult {
  let issues: ValidationResult['issues'] = [];

  if (!employee.name) {
    issues = [...issues, { message: 'Name is required', path: ['name'] }];
  }

  if (!employee.branch_id) {
    issues = [...issues, { message: 'Branch is required', path: ['branch_id'] }];
  }

  return { issues };
}
