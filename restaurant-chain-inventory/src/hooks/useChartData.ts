import { useState, useEffect } from 'react';
import { api } from '../api/client';

interface ConsumptionDataPoint {
  date: string;
  consumption: number;
}

interface ConsumptionSeries {
  id: string;
  label: string;
  data: number[];
  showMark: boolean;
  curve: string;
  stack: string;
  area: boolean;
  stackOrder: string;
}

interface ChartData {
  dates: string[];
  series: ConsumptionSeries[];
  totalConsumption: number;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch ingredient consumption data from the backend.
 * Transforms database records into chart-ready format.
 */
export function useConsumptionChart(branchId: number, days: number = 30): ChartData {
  const [chartData, setChartData] = useState<ChartData>({
    dates: [],
    series: [],
    totalConsumption: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!branchId) {
      setChartData((prev) => ({ ...prev, loading: false }));
      return;
    }

    const fetchData = async () => {
      try {
        setChartData((prev) => ({ ...prev, loading: true, error: null }));
        
        const response = await api.getIngredientConsumption(branchId, days);
        
        // Expected response format:
        // {
        //   "by_date": [
        //     { "date": "2024-04-01", "total": 50.5, "by_ingredient": {...} },
        //     ...
        //   ],
        //   "by_ingredient": {
        //     "Chicken Breast": [10, 12, 15, ...],
        //     "Rice": [20, 18, 22, ...],
        //     ...
        //   }
        // }

        if (!response || !response.by_date || !response.by_ingredient) {
          throw new Error('Invalid response format from backend');
        }

        const dates = response.by_date.map((d: any) => d.date);
        const totalConsumption = response.by_date.reduce(
          (sum: number, d: any) => sum + (d.total || 0),
          0
        );

        // Transform ingredient data into series format
        const series: ConsumptionSeries[] = Object.entries(
          response.by_ingredient
        ).map(([ingredientName, data], index) => ({
          id: `ingredient-${index}`,
          label: ingredientName,
          data: data as number[],
          showMark: false,
          curve: 'linear',
          stack: 'total',
          area: true,
          stackOrder: 'ascending',
        }));

        setChartData({
          dates,
          series,
          totalConsumption: Math.round(totalConsumption),
          loading: false,
          error: null,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch consumption data';
        setChartData((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
      }
    };

    fetchData();
  }, [branchId, days]);

  return chartData;
}

/**
 * Hook to fetch demand forecast data from the backend.
 */
export function useDemandForecast(branchId: number, ingredientId: number) {
  const [forecastData, setForecastData] = useState<ChartData>({
    dates: [],
    series: [],
    totalConsumption: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!branchId || !ingredientId) {
      setForecastData((prev) => ({ ...prev, loading: false }));
      return;
    }

    const fetchData = async () => {
      try {
        setForecastData((prev) => ({ ...prev, loading: true, error: null }));
        
        const response = await api.getDemandForecast(branchId, ingredientId);

        // Expected response format:
        // {
        //   "dates": ["2024-04-01", ...],
        //   "predicted": [100, 105, 110, ...],
        //   "actual": [95, 102, 115, ...]
        // }

        if (!response || !response.dates) {
          throw new Error('Invalid forecast response format');
        }

        const series: ConsumptionSeries[] = [
          {
            id: 'predicted',
            label: 'Predicted',
            data: response.predicted || [],
            showMark: false,
            curve: 'linear',
            stack: undefined as any,
            area: false,
            stackOrder: 'none' as any,
          },
          ...(response.actual
            ? [
                {
                  id: 'actual',
                  label: 'Actual',
                  data: response.actual,
                  showMark: false,
                  curve: 'linear',
                  stack: undefined as any,
                  area: false,
                  stackOrder: 'none' as any,
                },
              ]
            : []),
        ];

        setForecastData({
          dates: response.dates,
          series,
          totalConsumption: 0,
          loading: false,
          error: null,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch forecast data';
        setForecastData((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
      }
    };

    fetchData();
  }, [branchId, ingredientId]);

  return forecastData;
}
