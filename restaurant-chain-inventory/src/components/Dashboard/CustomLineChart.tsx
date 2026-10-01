import { useTheme } from '@mui/material/styles';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { LineChart } from '@mui/x-charts/LineChart';
import CustomizedTabs from './CustomizedTabs';
import { useConsumptionChart, useDemandForecast } from '../../hooks/useChartData';
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

interface ChartPanelProps {
  stat: string;
  delta: string;
  subtitle: string;
  data: string[];
  series: any[];
  colorPalette: string[];
  loading: boolean;
  error: string | null;
}

function ChartPanel({
  stat,
  delta,
  subtitle,
  data,
  series,
  colorPalette,
  loading,
  error,
}: ChartPanelProps) {
  const theme = useTheme();

  if (loading) {
    return (
      <Stack sx={{ justifyContent: 'center', alignItems: 'center', height: 250 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack sx={{ padding: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Stack>
    );
  }

  if (!data || data.length === 0 || !series || series.length === 0) {
    return (
      <Stack sx={{ justifyContent: 'center', alignItems: 'center', height: 250 }}>
        <Typography variant="body2" color="text.secondary">
          No data available
        </Typography>
      </Stack>
    );
  }

  return (
    <>
      <Stack sx={{ justifyContent: 'space-between' }}>
        <Stack
          direction="row"
          sx={{
            alignContent: { xs: 'center', sm: 'flex-start' },
            alignItems: 'center',
            gap: 1,
            marginTop: '10px',
          }}
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
      <LineChart
        colors={colorPalette}
        xAxis={[
          {
            scaleType: 'point',
            data,
            tickInterval: (index, i) => (i + 1) % 5 === 0,
            height: 24,
          },
        ]}
        yAxis={[{ width: 50 }]}
        series={series}
        height={250}
        margin={{ left: 0, right: 20, top: 20, bottom: 0 }}
        grid={{ horizontal: true }}
        sx={{
          '& .MuiAreaElement-series-organic': { fill: "url('#organic')" },
          '& .MuiAreaElement-series-referral': { fill: "url('#referral')" },
          '& .MuiAreaElement-series-direct': { fill: "url('#direct')" },
        }}
        hideLegend
      >
        <AreaGradient color={theme.palette.primary.dark} id="organic" />
        <AreaGradient color={theme.palette.primary.main} id="referral" />
        <AreaGradient color={theme.palette.primary.light} id="direct" />
      </LineChart>
    </>
  );
}

export default function CustomLineChart() {
  const theme = useTheme();
  const { branchId } = useBranch();

  // Fetch real data from the database
  const consumptionData = useConsumptionChart(branchId || 0, 30);
  const forecastData = useDemandForecast(branchId || 0, 1); // Default to first ingredient

  const colorPalette = [
    theme.palette.primary.light,
    theme.palette.primary.main,
    theme.palette.primary.dark,
  ];

  // Format consumption total and calculate percentage change
  const consumptionStat = consumptionData.totalConsumption.toLocaleString();
  const consumptionDelta = '+15%'; // This could be calculated from historical data if needed

  return (
    <Card variant="outlined" sx={{ width: '100%' }}>
      <CardContent sx={{ padding: 0 }}>
        <CustomizedTabs
          tabs={[
            {
              label: 'Ingredient Consumption',
              content: (
                <ChartPanel
                  stat={consumptionStat}
                  delta={consumptionDelta}
                  subtitle="Total consumption over time by ingredient"
                  data={consumptionData.dates}
                  series={consumptionData.series}
                  colorPalette={colorPalette}
                  loading={consumptionData.loading}
                  error={consumptionData.error}
                />
              ),
            },
            {
              label: 'Demand Forecast',
              content: (
                <ChartPanel
                  stat="Forecast"
                  delta="+0%"
                  subtitle="Predicted vs. actual consumption over time"
                  data={forecastData.dates}
                  series={forecastData.series}
                  colorPalette={colorPalette}
                  loading={forecastData.loading}
                  error={forecastData.error}
                />
              ),
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}
