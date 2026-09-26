import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CustomizedPieChart from './CustomizedPieChart';
import CustomizedRadarChart from './CustomizedRadarChart';
import CustomizedDataGrid from './CustomizedDataGrid';
import CustomBarChart from './CustomBarChart';
import CustomLineChart from './CustomLineChart';
import LineCard, { LineCardProps } from './LineCard';

const data: LineCardProps[] = [
  {
    title: 'Low-stock / at-risk item count',
    value: '14k',
    interval: 'Last 30 days (trailing)',
    trend: 'neutral',
    data: [
      500, 400, 510, 530, 520, 600, 530, 520, 510, 730, 520, 510, 530, 620, 510, 530,
      520, 410, 530, 520, 610, 530, 520, 610, 530, 420, 510, 430, 520, 510,
    ],
  },
  {
    title: 'Waste Cost',
    value: '325',
    interval: 'Last 7 days',
    trend: 'down',
    data: [
      1640, 1250, 970, 1130, 1050, 900, 720, 1080, 900, 450, 920, 820, 840, 600, 820,
      780, 800, 760, 380, 740, 660, 620, 840, 500, 520, 480, 400, 360, 300, 220,
    ],
  },
  {
    title: 'Avg. on-time Supplier Deliveries',
    value: '200k',
    interval: 'Rolling 30-day average',
    trend: 'up',
    data: [
      200, 24, 220, 260, 240, 380, 100, 240, 280, 240, 300, 340, 320, 360, 340, 380,
      360, 400, 380, 420, 400, 640, 340, 460, 440, 480, 460, 600, 880, 920,
    ],

  },
  {
    title: 'Inventory turnover rate',
    value: '50k',
    interval: 'Last 30 days',
    trend: 'neutral',
    data: [
      500, 400, 510, 530, 520, 600, 530, 520, 510, 730, 520, 510, 530, 620, 510, 530,
      520, 410, 530, 520, 610, 530, 520, 610, 530, 420, 510, 430, 520, 510,
    ],
  },
];

export default function MainGrid() {
  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      {/* cards */}
      <Typography component="h2" variant="h6" sx={{ mb: 2, mt: '20px' }}>
        Overview Dashboard
      </Typography>
      <Grid
        container
        spacing={2}
        columns={12}
        sx={{ mb: (theme) => theme.spacing(2) }}
      >
        {data.map((card, index) => (
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
