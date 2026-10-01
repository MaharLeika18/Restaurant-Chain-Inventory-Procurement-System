import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { BarChart } from '@mui/x-charts/BarChart';
import { useTheme } from '@mui/material/styles';
import CustomizedTabs from './CustomizedTabs';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useBranch } from '../../context/BranchContext'; // same import your line chart uses
import { useStockCharts } from '../../hooks/useStockCharts';

interface BarPanelProps {
  stat: string;
  delta: string;
  deltaColor: 'success' | 'error' | 'warning' | 'default' | 'info' | 'primary' | 'secondary';
  subtitle: string;
  categories: string[];
  series: any[];
  colorPalette: string[];
  loading?: boolean;
  error?: string | null;

}

function BarPanel({ stat, delta, deltaColor, subtitle, categories, series, colorPalette, loading, error }: BarPanelProps) {
  if (loading) {
    return <Stack sx={{ height: 250, alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Stack>;
  }
  if (error) return <Alert severity="error">{error}</Alert>;
  if (categories.length === 0) {
    return <Stack sx={{ height: 250, alignItems: 'center', justifyContent: 'center' }}>
      <Typography variant="body2" color="text.secondary">No data available</Typography>
    </Stack>;
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
            marginTop: '10px'
          }}
        >
          <Typography variant="h4" component="p">
            {stat}
          </Typography>
          <Chip size="small" color={deltaColor} label={delta} />
        </Stack>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {subtitle}
        </Typography>
      </Stack>
      <BarChart
        borderRadius={8}
        colors={colorPalette}
        xAxis={[
          {
            scaleType: 'band',
            categoryGapRatio: 0.5,
            data: categories,
            height: 24,
          },
        ]}
        yAxis={[{ width: 50 }]}
        series={series}
        height={250}
        margin={{ left: 0, right: 0, top: 20, bottom: 0 }}
        grid={{ horizontal: true }}
        hideLegend
      />
    </>
  );
}

export default function CustomBarChart() {
  const theme = useTheme();
  const { branchId } = useBranch();
  const { low, val } = useStockCharts(branchId);

  const colorPalette = [
    (theme.vars || theme).palette.primary.dark,
    (theme.vars || theme).palette.primary.main,
    (theme.vars || theme).palette.primary.light,
  ];

  return (
    <Card variant="outlined" sx={{ width: '100%' }}>
      <CardContent>
        <CustomizedTabs
          tabs={[
            {
              label: 'Low Stocks',
              content: (
                <BarPanel
                  stat={String(low.belowPar)}
                  delta={low.belowPar > 0 ? 'Below PAR' : 'All stocked'}
                  deltaColor={low.belowPar > 0 ? 'error' : 'success'}
                  subtitle="Current stock vs. PAR level, lowest first"
                  categories={low.categories}
                  series={low.series}
                  colorPalette={colorPalette}
                  loading={low.loading}
                  error={low.error}
                />
              ),
            },
            {
              label: 'Inventory Valuation',
              content: (
                <BarPanel
                  stat={`$${val.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                  delta="Current"
                  deltaColor="default"
                  subtitle="Inventory value by ingredient category"
                  categories={val.categories}
                  series={val.series}
                  colorPalette={colorPalette}
                  loading={val.loading}
                  error={val.error}
                />
              ),
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}