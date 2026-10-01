import { useEffect, useState } from 'react';
import { api } from '../api/client';

interface PanelData {
  categories: string[];
  series: any[];
  loading: boolean;
  error: string | null;
}

const empty: PanelData = { categories: [], series: [], loading: true, error: null };

export function useStockCharts(branchId: number | null) {
  const [low, setLow] = useState<PanelData & { belowPar: number }>({ ...empty, belowPar: 0 });
  const [val, setVal] = useState<PanelData & { total: number }>({ ...empty, total: 0 });

  useEffect(() => {
    if (branchId == null) return;
    let cancelled = false;
    setLow((p) => ({ ...p, loading: true, error: null }));
    setVal((p) => ({ ...p, loading: true, error: null }));

    api.get(`/cruddashboard/branch/${branchId}/low-stock`)
      .then((r: any) => {
        if (cancelled) return;
        setLow({
          categories: r.categories,
          belowPar: r.below_par_count,
          series: [
            { id: 'current', label: 'Current stock', data: r.current },
            { id: 'par', label: 'PAR level', data: r.par },
          ],
          loading: false,
          error: null,
        });
      })
      .catch((e: any) => !cancelled && setLow((p) => ({ ...p, loading: false, error: e.message })));

    api.get(`/cruddashboard/branch/${branchId}/inventory-valuation`)
      .then((r: any) => {
        if (cancelled) return;
        setVal({
          categories: r.categories,
          total: r.total,
          series: [{ id: 'value', label: 'Value', data: r.values }],
          loading: false,
          error: null,
        });
      })
      .catch((e: any) => !cancelled && setVal((p) => ({ ...p, loading: false, error: e.message })));

    return () => { cancelled = true; };
  }, [branchId]);

  return { low, val };
}