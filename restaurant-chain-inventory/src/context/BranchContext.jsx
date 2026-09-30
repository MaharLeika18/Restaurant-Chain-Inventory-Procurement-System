import * as React from 'react';
import { api } from '../api/client';

const BranchContext = React.createContext(null);

export function BranchProvider({ children }) {
  const [branches, setBranches] = React.useState([]);
  const [branchId, setBranchId] = React.useState(() => {
    const stored = localStorage.getItem('selected_branch_id');
    return stored ? Number(stored) : null;
  });
  const [loading, setLoading] = React.useState(true);

  const refreshBranches = React.useCallback(() => {
    return api
      .listBranches()
      .then((data) => {
        setBranches(data);
        setBranchId((current) => {
          if (current && data.some((b) => b.branch_id === current)) return current;
          return data.length > 0 ? data[0].branch_id : null;
        });
      })
      .catch(() => {
        // Backend not reachable yet - pages using this context should handle
        // an empty branches list gracefully rather than crash.
        setBranches([]);
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    refreshBranches();
  }, [refreshBranches]);

  React.useEffect(() => {
    if (branchId != null) localStorage.setItem('selected_branch_id', String(branchId));
  }, [branchId]);

  return (
    <BranchContext.Provider value={{ branches, branchId, setBranchId, loading, refreshBranches }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const ctx = React.useContext(BranchContext);
  if (!ctx) throw new Error('useBranch must be used within a BranchProvider');
  return ctx;
}
