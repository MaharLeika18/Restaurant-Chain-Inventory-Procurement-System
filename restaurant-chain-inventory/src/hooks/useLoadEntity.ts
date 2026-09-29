import * as React from 'react';

export function useLoadEntity<T, P extends unknown[]>(
  fetchFn: (...args: P) => Promise<T>,
  args: P,
) {
  const [data, setData] = React.useState<T | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const argsKey = JSON.stringify(args);

  const loadData = React.useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      setData(await fetchFn(...args));
    } catch (e) {
      setError(e as Error);
    }
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, setData, isLoading, error, reload: loadData };
}