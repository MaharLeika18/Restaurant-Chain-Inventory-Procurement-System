import * as React from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CustomizedPieChart from './CustomizedPieChart';
import CustomizedRadarChart from './CustomizedRadarChart';
import CustomizedDataGrid from './CustomizedDataGrid';
import CustomBarChart from './CustomBarChart';
import CustomLineChart from './CustomLineChart';
import LineCard, { LineCardProps } from './LineCard';
import { useBranch } from '../../context/BranchContext';
import { api } from '../../api/client';

// LineCard's internal sparkline expects a fixed-length series (see
// getDaysInMonth(4, 2024) inside LineCard.tsx). We don't have a real
// day-by-day history endpoint yet, so each card shows a flat line at its
// real current value rather than fabricating a trend - see backend
// /dashboard/branch/{id}/summary and /dashboard/supplier-performance for
// where these numbers actually come from.
const SPARKLINE_LENGTH = 30; // LineCard's x-axis is April 2024 = 30 days
const flatSeries = (value: number) => new Array(SPARKLINE_LENGTH).fill(value);

export default function MainGrid() {
  const { branchId } = useBranch();
  const [cards, setCards] = React.useState<LineCardProps[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (branchId == null) return;
    let cancelled = false;

    Promise.all([
      api.get(`/dashboard/branch/${branchId}/summary`),
      api.get('/dashboard/supplier-performance'),
    ])
      .then(([summary, supplierPerf]) => {
        if (cancelled) return;

        const measurable = supplierPerf.filter(
          (s: any) => s.total_delivered_on_time + s.total_delivered_late > 0,
        );
        const avgOnTimeRate =
          measurable.length > 0
            ? (measurable.reduce((sum: number, s: any) => sum + s.on_time_delivery_rate, 0) /
                measurable.length) *
              100
            : null;

        setCards([
          {
            title: 'Low-stock / at-risk items',
            value: String(summary.low_stock_count),
            interval: `As of ${summary.as_of}`,
            trend: 'neutral',
            data: flatSeries(summary.low_stock_count),
          },
          {
            title: 'Waste cost',
            value: `$${summary.waste_cost_last_7_days.toFixed(2)}`,
            interval: 'Last 7 days',
            trend: 'neutral',
            data: flatSeries(summary.waste_cost_last_7_days),
          },
          {
            title: 'Avg. on-time supplier deliveries',
            value: avgOnTimeRate != null ? `${avgOnTimeRate.toFixed(0)}%` : 'N/A',
            interval: 'Across all suppliers, all-time',
            trend: 'neutral',
            data: flatSeries(avgOnTimeRate ?? 0),
          },
          {
            title: 'Total inventory value',
            value: `$${summary.total_inventory_value.toFixed(2)}`,
            interval: `As of ${summary.as_of}`,
            trend: 'neutral',
            data: flatSeries(summary.total_inventory_value),
          },
        ]);
      })
      .catch((err) => !cancelled && setError(err.message));

    return () => {
      cancelled = true;
    };
  }, [branchId]);

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      {/* cards */}
      <Typography component="h2" variant="h6" sx={{ mb: 2, mt: '20px' }}>
        Overview Dashboard
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Couldn't load dashboard data: {error}
        </Alert>
      )}
      <Grid
        container
        spacing={2}
        columns={12}
        sx={{ mb: (theme) => theme.spacing(2) }}
      >
        {(cards ?? []).map((card, index) => (
          <Grid key={index} size={{ xs: 12, sm: 6, lg: 3 }}>
            <LineCard {...card} />
          </Grid>
        ))}
        <Grid size={{ xs: 12, md: 6 }}>
          <CustomLineChart />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <CustomBarChart />
        </Grid>
      </Grid>
      <Grid container spacing={2} columns={12}>
        <Grid size={{ xs: 12, lg: 9 }}>
          <CustomizedDataGrid />
        </Grid>
        <Grid size={{ xs: 12, lg: 3 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row', lg: 'column' }}
            sx={{ gap: 2 }}
          >
            <CustomizedRadarChart />
            <CustomizedPieChart />
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
