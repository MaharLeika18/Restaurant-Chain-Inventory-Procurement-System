import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { BarChart } from '@mui/x-charts/BarChart';
import { useTheme } from '@mui/material/styles';
import CustomizedTabs from './CustomizedTabs';

interface BarPanelProps {
  stat: string;
  delta: string;
  deltaColor: 'success' | 'error' | 'warning' | 'default' | 'info' | 'primary' | 'secondary';
  subtitle: string;
  categories: string[];
  series: any[];
  colorPalette: string[];
}

function BarPanel({ stat, delta, deltaColor, subtitle, categories, series, colorPalette }: BarPanelProps) {
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
  const colorPalette = [
    (theme.vars || theme).palette.primary.dark,
    (theme.vars || theme).palette.primary.main,
    (theme.vars || theme).palette.primary.light,
  ];

  const categories = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];

  // TODO: REPLACE THIS WITH SQLALCHEMY + POSTGRESQL
  const lowStocksSeries = [
    {
      id: 'page-views',
      label: 'Page views',
      data: [2234, 3872, 2998, 4125, 3357, 2789, 2998],
      stack: 'A',
    },
    {
      id: 'downloads',
      label: 'Downloads',
      data: [3098, 4215, 2384, 2101, 4752, 3593, 2384],
      stack: 'A',
    },
    {
      id: 'conversions',
      label: 'Conversions',
      data: [4051, 2275, 3129, 4693, 3904, 2038, 2275],
      stack: 'A',
    },
  ];

  const chart2Series = lowStocksSeries;

  return (
    <Card variant="outlined" sx={{ width: '100%' }}>
      <CardContent>
        <CustomizedTabs
          tabs={[
            {
              label: 'Low Stocks',
              content: (
                <BarPanel
                  stat="1.3M"
                  delta="-8%"
                  deltaColor="error"
                  subtitle="current stock vs. PAR level, one bar per ingredient"
                  categories={categories}
                  series={lowStocksSeries}
                  colorPalette={colorPalette}
                  
                />
              ),
            },
            {
              label: 'Inventory Valuation',
              content: (
                <BarPanel
                  stat="0"
                  delta="+0%"
                  deltaColor="success"
                  subtitle="valuation by category, over time or by branch"
                  categories={categories}
                  series={chart2Series}
                  colorPalette={colorPalette}

                />
              ),
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}