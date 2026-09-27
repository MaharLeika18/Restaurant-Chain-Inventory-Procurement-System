import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import {
  DataGrid,
  GridColDef,
  GridFilterModel,
  GridPaginationModel,
  GridSortModel,
  GridEventListener,
  GridRowId,
  gridClasses,
} from '@mui/x-data-grid';
import { useLocation, useNavigate, useSearchParams } from 'react-router';

export interface FetchRowsParams {
  paginationModel: GridPaginationModel;
  sortModel: GridSortModel;
  filterModel: GridFilterModel;
}

export interface FetchRowsResult<T> {
  items: T[];
  itemCount: number;
}

export interface ServerDataGridHandle {
  reload: () => void;
}

export interface ServerDataGridProps<T extends { id: GridRowId }> {
  columns: GridColDef[];
  // Server-side fetch function — receives the current pagination/sort/filter state.
  getRows: (params: FetchRowsParams) => Promise<FetchRowsResult<T>>;
  // Called when a row is clicked. Omit to disable row navigation.
  onRowClick?: (row: T) => void;
  initialPageSize?: number;
  // Whether pagination/sort/filter state should sync to the URL query string.
  syncWithUrl?: boolean;
}

function ServerDataGridInner<T extends { id: GridRowId }>(
  {
    columns,
    getRows,
    onRowClick,
    initialPageSize = 10,
    syncWithUrl = true,
  }: ServerDataGridProps<T>,
  ref: React.ForwardedRef<ServerDataGridHandle>,
) {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({
    page: syncWithUrl && searchParams.get('page') ? Number(searchParams.get('page')) : 0,
    pageSize:
      syncWithUrl && searchParams.get('pageSize')
        ? Number(searchParams.get('pageSize'))
        : initialPageSize,
  });
  const [filterModel, setFilterModel] = React.useState<GridFilterModel>(
    syncWithUrl && searchParams.get('filter')
      ? JSON.parse(searchParams.get('filter') ?? '')
      : { items: [] },
  );
  const [sortModel, setSortModel] = React.useState<GridSortModel>(
    syncWithUrl && searchParams.get('sort') ? JSON.parse(searchParams.get('sort') ?? '') : [],
  );

  const [rowsState, setRowsState] = React.useState<{ rows: T[]; rowCount: number }>({
    rows: [],
    rowCount: 0,
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const updateUrl = React.useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      if (!syncWithUrl) return;
      mutate(searchParams);
      const newSearchParamsString = searchParams.toString();
      navigate(`${pathname}${newSearchParamsString ? '?' : ''}${newSearchParamsString}`);
    },
    [navigate, pathname, searchParams, syncWithUrl],
  );

  const handlePaginationModelChange = React.useCallback(
    (model: GridPaginationModel) => {
      setPaginationModel(model);
      updateUrl((params) => {
        params.set('page', String(model.page));
        params.set('pageSize', String(model.pageSize));
      });
    },
    [updateUrl],
  );

  const handleFilterModelChange = React.useCallback(
    (model: GridFilterModel) => {
      setFilterModel(model);
      updateUrl((params) => {
        if (
          model.items.length > 0 ||
          (model.quickFilterValues && model.quickFilterValues.length > 0)
        ) {
          params.set('filter', JSON.stringify(model));
        } else {
          params.delete('filter');
        }
      });
    },
    [updateUrl],
  );

  const handleSortModelChange = React.useCallback(
    (model: GridSortModel) => {
      setSortModel(model);
      updateUrl((params) => {
        if (model.length > 0) {
          params.set('sort', JSON.stringify(model));
        } else {
          params.delete('sort');
        }
      });
    },
    [updateUrl],
  );

  const loadData = React.useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const listData = await getRows({ paginationModel, sortModel, filterModel });
      setRowsState({ rows: listData.items, rowCount: listData.itemCount });
    } catch (listDataError) {
      setError(listDataError as Error);
    }

    setIsLoading(false);
  }, [getRows, paginationModel, sortModel, filterModel]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useImperativeHandle(ref, () => ({ reload: loadData }), [loadData]);

  const handleRowClick = React.useCallback<GridEventListener<'rowClick'>>(
    ({ row }) => {
      onRowClick?.(row as T);
    },
    [onRowClick],
  );

  const initialState = React.useMemo(
    () => ({ pagination: { paginationModel: { pageSize: initialPageSize } } }),
    [initialPageSize],
  );

  if (error) {
    return (
      <Box sx={{ flexGrow: 1 }}>
        <Alert severity="error">{error.message}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, width: '100%' }}>
      <DataGrid
        rows={rowsState.rows}
        rowCount={rowsState.rowCount}
        columns={columns}
        pagination
        sortingMode="server"
        filterMode="server"
        paginationMode="server"
        paginationModel={paginationModel}
        onPaginationModelChange={handlePaginationModelChange}
        sortModel={sortModel}
        onSortModelChange={handleSortModelChange}
        filterModel={filterModel}
        onFilterModelChange={handleFilterModelChange}
        disableRowSelectionOnClick
        onRowClick={onRowClick ? handleRowClick : undefined}
        loading={isLoading}
        initialState={initialState}
        showToolbar
        pageSizeOptions={[5, initialPageSize, 25]}
        sx={{
          [`& .${gridClasses.columnHeader}, & .${gridClasses.cell}`]: {
            outline: 'transparent',
          },
          [`& .${gridClasses.columnHeader}:focus-within, & .${gridClasses.cell}:focus-within`]: {
            outline: 'none',
          },
          ...(onRowClick && {
            [`& .${gridClasses.row}:hover`]: { cursor: 'pointer' },
          }),
        }}
        slotProps={{
          loadingOverlay: {
            variant: 'circular-progress',
            noRowsVariant: 'circular-progress',
          },
          baseIconButton: { size: 'small' },
        }}
      />
    </Box>
  );
}

const ServerDataGrid = React.forwardRef(ServerDataGridInner) as <T extends { id: GridRowId }>(
  props: ServerDataGridProps<T> & { ref?: React.ForwardedRef<ServerDataGridHandle> },
) => ReturnType<typeof ServerDataGridInner>;

export default ServerDataGrid;