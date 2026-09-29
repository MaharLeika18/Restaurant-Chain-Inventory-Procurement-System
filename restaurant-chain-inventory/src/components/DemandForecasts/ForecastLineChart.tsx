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

type IngredientOrBranchFilter = { type: 'ingredient' | 'branch'; value: string };

function ForecastFilters({
  filterModel,
  onFilterModelChange,
  dateRange,
  onDateRangeChange,
  ingredientOrBranchOptions,
}: {
  filterModel: GridFilterModel;
  onFilterModelChange: (model: GridFilterModel) => void;
  dateRange: { start: Dayjs | null; end: Dayjs | null };
  onDateRangeChange: (range: { start: Dayjs | null; end: Dayjs | null }) => void;
  ingredientOrBranchOptions: { field: 'ingredient' | 'branch'; label: string; value: string }[];
}) {
  const selectedValue = (filterModel.items[0]?.value as string) ?? '';

  const handleFilterChange = React.useCallback(
    (event: SelectChangeEvent) => {
      const raw = event.target.value;
      if (!raw) {
        onFilterModelChange({ items: [] });
        return;
      }
      const [field, value] = raw.split('::') as ['ingredient' | 'branch', string];
      onFilterModelChange({ items: [{ field, operator: 'equals', value }] });
    },
    [onFilterModelChange],
  );

  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel id="forecast-filter-label">Ingredient / Branch</InputLabel>
        <Select
          labelId="forecast-filter-label"
          label="Ingredient / Branch"
          value={selectedValue ? `${filterModel.items[0]?.field}::${selectedValue}` : ''}
          onChange={handleFilterChange}
        >
          <MenuItem value="">All</MenuItem>
          {ingredientOrBranchOptions.map((opt) => (
            <MenuItem key={`${opt.field}::${opt.value}`} value={`${opt.field}::${opt.value}`}>
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
          <Chip size="small" color="success" label={delta} />
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

// TODO: remove this before prod. sample backend data for reference.
const sampleRow = {
  date: '2024-05-14',
  ingredient: 'Tomato',
  branch: 'Downtown',
  actual_qty: 42,
  predicted_qty: 39,
  predicted_lower: 35,
  predicted_upper: 44,
};

export default function ForecastLineChart() {
  const theme = useTheme();
  const data = getDaysInMonth(5, 2024);

  const colorPalette = [theme.palette.primary.light, theme.palette.primary.main, theme.palette.primary.dark];

  const [filterModel, setFilterModel] = React.useState<GridFilterModel>({ items: [] });
  const [dateRange, setDateRange] = React.useState<{ start: Dayjs | null; end: Dayjs | null }>({
    start: dayjs('2024-05-01'),
    end: dayjs('2024-05-31'),
  });

  // TODO: REPLACE WITH SQLALCHEMY + POSTGRESQL, fetch actual vs forecast series
  const actualSeries: (number | null)[] = [
    38, 40, 37, 39, 42, 41, 43,
    40, 44, 46, 45, 43, 41,
    42, // May 14: last known actual / forecast starting point
    null, null, null, null, null, null,
    null, null, null, null, null, null,
    null, null, null, null, null,
  ];

  const forecastSeries: (number | null)[] = [
    null, null, null, null, null, null, null,
    null, null, null, null, null, null,
    39, // May 14: backtest prediction
    40, // May 15
    41, // May 16
    43, // May 17
    44, // May 18
    45, // May 19
    46, // May 20
    44, // May 21
    47, // May 22
    48, // May 23
    49, // May 24
    51, // May 25
    50, // May 26
    52, // May 27
    53, // May 28
    55, // May 29
    54, // May 30
    56, // May 31
  ];

  const forecastBand: { y0: number; y1: number }[] = [
    { y0: 35, y1: 44 }, // May 14
    { y0: 35, y1: 46 }, // May 15
    { y0: 36, y1: 47 }, // May 16
    { y0: 37, y1: 49 }, // May 17
    { y0: 37, y1: 51 }, // May 18
    { y0: 38, y1: 52 }, // May 19
    { y0: 39, y1: 53 }, // May 20
    { y0: 38, y1: 54 }, // May 21
    { y0: 40, y1: 55 }, // May 22
    { y0: 41, y1: 56 }, // May 23
    { y0: 42, y1: 57 }, // May 24
    { y0: 43, y1: 59 }, // May 25
    { y0: 42, y1: 59 }, // May 26
    { y0: 44, y1: 60 }, // May 27
    { y0: 44, y1: 62 }, // May 28
    { y0: 45, y1: 63 }, // May 29
    { y0: 46, y1: 64 }, // May 30
    { y0: 47, y1: 65 }, // May 31
  ];

  // index of the last actual / first forecast point (May 14)
  const forecastLimit = actualSeries.findLastIndex((v) => v !== null); // 13

  // TODO: REPLACE WITH SQLALCHEMY + POSTGRESQL, populate from distinct ingredients/branches
  const ingredientOrBranchOptions: { field: 'ingredient' | 'branch'; label: string; value: string }[] = [];

  return (
    <Card variant="outlined" sx={{ width: '100%' }}>
      <CardContent sx={{ padding: 0 }}>
        <Stack direction="row" sx={{ justifyContent: 'flex-end', px: 2, pt: 2 }}>
          <ForecastFilters
            filterModel={filterModel}
            onFilterModelChange={setFilterModel}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            ingredientOrBranchOptions={ingredientOrBranchOptions}
          />
        </Stack>

        <ChartPanel
          stat="0"
          delta="+0%"
          subtitle="predicted vs. actual demand, per ingredient or branch"
          data={data}
          actualSeries={actualSeries}
          forecastSeries={forecastSeries}
          forecastLimit={forecastLimit}
          forecastBand={forecastBand}
          colorPalette={colorPalette}
        />
      </CardContent>
    </Card>
  );
}