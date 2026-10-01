import * as React from 'react';
import { useTheme, type SxProps, type Theme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { type Dayjs } from 'dayjs';
import * as d3Shape from 'd3-shape';
import {
  ChartsContainer,
  ChartsXAxis,
  ChartsYAxis,
  ChartsTooltip,
  ChartsGrid,
  ChartsClipPath,
  LinePlot,
  MarkPlot,
  AnimatedLine,
  type AnimatedLineProps,
  useDrawingArea,
  useXScale,
  useYScale,
  useXAxis,
  useLineSeries,
  useChartId,
} from '@mui/x-charts';
import type { GridFilterModel } from '@mui/x-data-grid';
import { api } from '../../api/client';
import { useBranch } from '../../context/BranchContext';

function AreaGradient({ color, id }: { color: string; id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stopColor={color} stopOpacity={0.5} />
        <stop offset="100%" stopColor={color} stopOpacity={0} />
      </linearGradient>
    </defs>
  );
}

function getDaysInMonth(month: number, year: number) {
  const date = new Date(year, month, 0);
  const monthName = date.toLocaleDateString('en-US', { month: 'short' });
  const daysInMonth = date.getDate();
  const days = [];
  let i = 1;
  while (days.length < daysInMonth) {
    days.push(`${monthName} ${i}`);
    i += 1;
  }
  return days;
}

interface CustomAnimatedLineProps extends AnimatedLineProps {
  limit?: number;
  sxBefore?: SxProps<Theme>;
  sxAfter?: SxProps<Theme>;
}

function CustomAnimatedLine(props: CustomAnimatedLineProps) {
  const { limit, sxBefore, sxAfter, ...other } = props;
  const { top, bottom, height, left, width } = useDrawingArea();
  const scale = useXScale();
  const chartId = useChartId();

  if (limit === undefined) {
    return <AnimatedLine {...other} />;
  }

  const limitPosition = scale(limit);
  if (limitPosition === undefined) {
    return <AnimatedLine {...other} />;
  }

  const clipIdleft = `${chartId}-${props.ownerState.seriesId}-line-limit-${limit}-1`;
  const clipIdRight = `${chartId}-${props.ownerState.seriesId}-line-limit-${limit}-2`;
  return (
    <React.Fragment>
      <clipPath id={clipIdleft}>
        <rect x={left} y={0} width={limitPosition - left} height={top + height + bottom} />
      </clipPath>
      <clipPath id={clipIdRight}>
        <rect x={limitPosition} y={0} width={left + width - limitPosition} height={top + height + bottom} />
      </clipPath>
      <g clipPath={`url(#${clipIdleft})`} className="line-before">
        <AnimatedLine {...other} />
      </g>
      <g clipPath={`url(#${clipIdRight})`} className="line-after">
        <AnimatedLine {...other} />
      </g>
    </React.Fragment>
  );
}

function ForecastArea({ limit, forecast }: { limit: number; forecast: { y0: number; y1: number }[] }) {
  const xAxis = useXAxis();
  const xScale = useXScale();
  const yScale = useYScale('yAxisId');

  const xAxisData = (xAxis.data?.slice(limit) as (string | number)[]) ?? [];
  if (!yScale || xAxisData.length === 0) return null;

  const data = xAxisData.map((x, i) => ({ x, y0: forecast[i]?.y0, y1: forecast[i]?.y1 }))
    .filter((d) => d.y0 !== undefined && d.y1 !== undefined);

  const path = d3Shape
    .area<(typeof data)[number]>()
    .x((d) => xScale(d.x as any)!)
    .y0((d) => yScale(d.y0!)!)
    .y1((d) => yScale(d.y1!)!)(data)!;

  return <path d={path} fill="#0000ff44" />;
}

function ShadedBackground({ limit }: { limit: number }) {
  const { top, bottom, height, left, width } = useDrawingArea();
  const scale = useXScale();
  const limitPosition = scale(limit)!;
  const theme = useTheme();
  const fill = theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[400];

  return (
    <rect
      x={limitPosition}
      y={0}
      width={left + width - limitPosition}
      height={top + height + bottom}
      fill={fill}
      opacity={0.4}
    />
  );
}

function ForecastFilters({
  ingredientId,
  onIngredientChange,
  dateRange,
  onDateRangeChange,
  ingredientOptions,
}: {
  ingredientId: string;
  onIngredientChange: (id: string) => void;
  dateRange: { start: Dayjs | null; end: Dayjs | null };
  onDateRangeChange: (range: { start: Dayjs | null; end: Dayjs | null }) => void;
  ingredientOptions: { label: string; value: string }[];
}) {
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel id="forecast-filter-label">Ingredient</InputLabel>
        <Select
          labelId="forecast-filter-label"
          label="Ingredient"
          value={ingredientId}
          onChange={(e) => onIngredientChange(e.target.value)}
        >
          {ingredientOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          label="Start date"
          value={dateRange.start}
          onChange={(value) => onDateRangeChange({ ...dateRange, start: value })}
          slotProps={{ textField: { size: 'small' } }}
        />
        <DatePicker
          label="End date"
          value={dateRange.end}
          onChange={(value) => onDateRangeChange({ ...dateRange, end: value })}
          minDate={dateRange.start ?? undefined}
          slotProps={{ textField: { size: 'small' } }}
        />
      </LocalizationProvider>
    </Stack>
  );
}

interface ChartPanelProps {
  stat: string;
  delta: string;
  subtitle: string;
  data: string[];
  actualSeries: (number | null)[];
  forecastSeries: (number | null)[];
  forecastLimit: number; 
  forecastBand: { y0: number; y1: number }[]; 
  colorPalette: string[];
}

function ChartPanel({
  stat,
  delta,
  subtitle,
  data,
  actualSeries,
  forecastSeries,
  forecastLimit,
  forecastBand,
  colorPalette,
}: ChartPanelProps) {
  const theme = useTheme();
  const id = React.useId();
  const clipPathId = `${id}-clip-path`;
  const allValues = [
    ...actualSeries.filter((v): v is number => v !== null),
    ...forecastSeries.filter((v): v is number => v !== null),
    ...forecastBand.flatMap((b) => [b.y0, b.y1]),
  ];
  const yMin = Math.floor(Math.min(...allValues) - 2);
  const yMax = Math.ceil(Math.max(...allValues) + 2);

  return (
    <>
      <Stack sx={{ justifyContent: 'space-between' }}>
        <Stack
          direction="row"
          sx={{ alignContent: { xs: 'center', sm: 'flex-start' }, alignItems: 'center', gap: 1, marginTop: '10px' }}
        >
          <Typography variant="h4" component="p">
            {stat}
          </Typography>
          <Chip size="small" color="info" label={delta} />
        </Stack>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {subtitle}
        </Typography>
      </Stack>

      <Box sx={{ width: '100%', height: 250 }}>
        <ChartsContainer
          series={[
            {
              type: 'line',
              id: 'forecast',
              yAxisId: 'yAxisId',
              data: forecastSeries,
              color: colorPalette[2],
              valueFormatter: (v, i) => `${v}${i.dataIndex >= forecastLimit ? ' (predicted)' : ''}`,
              showMark: true,
            },
            {
              type: 'line',
              id: 'actual',
              yAxisId: 'yAxisId',
              data: actualSeries,
              color: colorPalette[1],
              showMark: true,
            },
          ]}
          xAxis={[
            {
              scaleType: 'point',
              data,
              tickInterval: (index, i) => (i + 1) % 5 === 0,
              height: 24,
            },
          ]}
          yAxis={[{ id: 'yAxisId', width: 50, min: yMin, max: yMax }]}
          margin={{ left: 0, right: 20, top: 20, bottom: 0 }}
          sx={{
            '& .MuiAreaElement-series-organic': { fill: "url('#organic')" },
            '& .MuiAreaElement-series-referral': { fill: "url('#referral')" },
            '& .MuiAreaElement-series-direct': { fill: "url('#direct')" },
            '& .line-after path': { strokeDasharray: '10 5' },
          }}
        >
          <ChartsXAxis />
          <ChartsYAxis axisId="yAxisId" />
          <ChartsGrid horizontal />

          <g clipPath={`url(#${clipPathId})`}>
            <ShadedBackground limit={forecastLimit} />
            <LinePlot
              slots={{ line: CustomAnimatedLine }}
              slotProps={{ line: { limit: forecastLimit } as any }}
            />
            <ForecastArea limit={forecastLimit} forecast={forecastBand} />
          </g>
          <g data-drawing-container>
            <MarkPlot />
          </g>
          <ChartsTooltip />
          <ChartsClipPath id={clipPathId} />

          <AreaGradient color={theme.palette.primary.dark} id="organic" />
          <AreaGradient color={theme.palette.primary.main} id="referral" />
          <AreaGradient color={theme.palette.primary.light} id="direct" />
        </ChartsContainer>
      </Box>
    </>
  );
}

export default function ForecastLineChart() {
  const theme = useTheme();
  const { branchId } = useBranch();
  const colorPalette = [theme.palette.primary.light, theme.palette.primary.main, theme.palette.primary.dark];

  const [ingredients, setIngredients] = React.useState<any[]>([]);
  const [ingredientId, setIngredientId] = React.useState('');
  const [dateRange, setDateRange] = React.useState<{ start: Dayjs | null; end: Dayjs | null }>({
    start: dayjs().subtract(30, 'day'),
    end: dayjs().add(7, 'day'),
  });

  const [chartData, setChartData] = React.useState<{
    labels: string[]; actual: (number | null)[]; forecast: (number | null)[];
    band: { y0: number; y1: number }[]; limit: number; total: number;
  } | null>(null);

  React.useEffect(() => {
    if (branchId == null) return;
    api.get(`/inventory/branch/${branchId}`).then(async (stock: any[]) => {
      const ingredientRows = await api.get('/ingredients/?limit=500');
      const nameById = new Map(ingredientRows.map((i: any) => [i.ingredient_id, i.ingredient_name]));
      const tracked = stock.map((s: any) => ({ ingredient_id: s.ingredient_id, name: nameById.get(s.ingredient_id) ?? `#${s.ingredient_id}` }));
      setIngredients(tracked);
      if (tracked.length > 0 && !ingredientId) setIngredientId(String(tracked[0].ingredient_id));
    });
  }, [branchId]);

  // The date pickers drive how much history/forecast is fetched, rather than
  // slicing an already-fetched, specially-shaped array after the fact -
  // forecastBand below is intentionally shorter than labels (it's a suffix
  // starting at the last actual day, which is what ForecastArea expects), so
  // re-slicing it by arbitrary date range afterwards doesn't line up safely.
  const historyDays = Math.max(1, dayjs().diff(dateRange.start ?? dayjs().subtract(30, 'day'), 'day'));
  const forecastDays = Math.max(1, (dateRange.end ?? dayjs().add(7, 'day')).diff(dayjs(), 'day'));

  React.useEffect(() => {
    if (branchId == null || !ingredientId) return;

    Promise.all([
      api.get(`/inventory/transactions/branch/${branchId}?ingredient_id=${ingredientId}&limit=1000`),
      api.get(`/forecast/branch/${branchId}/ingredient/${ingredientId}?lookback_days=${historyDays}&forecast_period_days=${forecastDays}`),
    ]).then(([transactions, forecast]: any[]) => {
      // Actual: real daily consumption, summed per day, for the last `historyDays` days.
      const today = new Date();
      const byDay = new Map<string, number>();
      for (let i = historyDays - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        byDay.set(d.toISOString().slice(0, 10), 0);
      }
      transactions
        .filter((t: any) => t.transaction_type === 'CONSUMPTION')
        .forEach((t: any) => {
          const day = String(t.transaction_date).slice(0, 10);
          if (byDay.has(day)) byDay.set(day, (byDay.get(day) ?? 0) + t.quantity);
        });
      const pastDays = [...byDay.keys()];
      const actualPast: (number | null)[] = [...byDay.values()];

      // Forecast: the backend gives one number (average demand per day over the
      // forecast window) rather than a day-by-day statistical prediction, so the
      // "forecast" line repeats that value forward, and the shaded band is a
      // simple +/-20% heuristic - not a real confidence interval, since the
      // backend doesn't compute one.
      const dailyDemand = forecast.forecast_daily_demand;
      const futureDays: string[] = [];
      const forecastFuture: (number | null)[] = [];
      const bandFuture: { y0: number; y1: number }[] = [];
      for (let i = 1; i <= forecastDays; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        futureDays.push(d.toISOString().slice(0, 10));
        forecastFuture.push(dailyDemand);
        bandFuture.push({ y0: Math.max(0, dailyDemand * 0.8), y1: dailyDemand * 1.2 });
      }

      const labels = [...pastDays, ...futureDays];
      const actual: (number | null)[] = [...actualPast, ...futureDays.map(() => null)];
      const lastActual = actualPast.length > 0 ? actualPast[actualPast.length - 1] : dailyDemand;
      const forecastSeries: (number | null)[] = [
        ...pastDays.map(() => null),
        lastActual, // connects the two lines at the seam
        ...forecastFuture.slice(1),
      ];
      // ForecastArea slices xAxis.data with `.slice(limit)` (limit = pastDays.length - 1)
      // and indexes this band array positionally against THAT slice - so band must be
      // exactly (labels.length - limit) = forecastDays + 1 entries long, not full-length.
      const band: { y0: number; y1: number }[] = [
        { y0: lastActual ?? 0, y1: lastActual ?? 0 }, // the seam day itself
        ...bandFuture, // every future day, NOT sliced
      ];

      setChartData({ labels, actual, forecast: forecastSeries, band, limit: pastDays.length - 1, total: forecast.forecast_total_demand });
    });
  }, [branchId, ingredientId, historyDays, forecastDays]);

  const ingredientOptions = ingredients.map((i) => ({ label: i.name, value: String(i.ingredient_id) }));

  if (!chartData) {
    return (
      <Card variant="outlined" sx={{ width: '100%' }}>
        <CardContent><Typography color="text.secondary">Loading forecast…</Typography></CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined" sx={{ width: '100%' }}>
      <CardContent sx={{ padding: 0 }}>
        <Stack direction="row" sx={{ justifyContent: 'flex-end', px: 2, pt: 2 }}>
          <ForecastFilters
            ingredientId={ingredientId}
            onIngredientChange={setIngredientId}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            ingredientOptions={ingredientOptions}
          />
        </Stack>

        <ChartPanel
          stat={String(Math.round(chartData.total))}
          delta="forecasted total"
          subtitle="actual consumption vs. forecast, per ingredient (shaded band is a +/-20% heuristic, not a statistical confidence interval)"
          data={chartData.labels}
          actualSeries={chartData.actual}
          forecastSeries={chartData.forecast}
          forecastLimit={chartData.limit}
          forecastBand={chartData.band}
          colorPalette={colorPalette}
        />
      </CardContent>
    </Card>
  );
}