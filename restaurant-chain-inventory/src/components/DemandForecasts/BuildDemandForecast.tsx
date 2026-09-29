import type {} from '@mui/x-date-pickers/themeAugmentation';
import type {} from '@mui/x-charts/themeAugmentation';
import type {} from '@mui/x-data-grid-pro/themeAugmentation';
import type {} from '@mui/x-tree-view/themeAugmentation';
import { alpha } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import AppTheme from '../../theme/AppTheme.tsx';
import {
  chartsCustomizations,
  dataGridCustomizations,
  datePickersCustomizations,
  treeViewCustomizations,
} from '../../theme/customizations';
import PageContainer from '../PageContainer.tsx'

import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ForecastLineChart from './ForecastLineChart';
import ForecastTable from './ForecastTable'

const xThemeComponents = {
  ...chartsCustomizations,
  ...dataGridCustomizations,
  ...datePickersCustomizations,
  ...treeViewCustomizations,
};

export default function DemandForecastPage(props: { disableCustomTheme?: boolean }) {
  return (
    <AppTheme {...props} themeComponents={xThemeComponents}>
      <CssBaseline enableColorScheme />
      <Box sx={{ display: 'flex' }}>
        {/* Main content */}
        <Box
          component="main"
          sx={(theme) => ({
            flexGrow: 1,
            backgroundColor: theme.vars
              ? `rgba(${theme.vars.palette.background.defaultChannel} / 1)`
              : alpha(theme.palette.background.default, 1),
            overflow: 'auto',
          })}
        >
          <Stack
            spacing={2}
            sx={{
              alignItems: 'center',
              mx: 3,
              pb: 5,
              mt: { xs: 8, md: 0 },
            }}
          >
            {/* Same as MainGrid's root */}
            <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
              <Typography component="h2" variant="h6" sx={{ mb: 2, mt: '20px' }}>
                Demand Forecast
              </Typography>

              <Grid container spacing={2} columns={12}>
                <Grid size={{ xs: 12 }}>
                  <ForecastLineChart />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <ForecastTable />
                </Grid>
              </Grid>
            </Box>
          </Stack>
        </Box>
      </Box>
    </AppTheme>
  );
}