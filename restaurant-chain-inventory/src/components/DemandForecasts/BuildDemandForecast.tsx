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
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import ForecastLineChart from './ForecastLineChart';
import ForecastTable from './ForecastTable'
import { useBranch } from '../../context/BranchContext';

const xThemeComponents = {
  ...chartsCustomizations,
  ...dataGridCustomizations,
  ...datePickersCustomizations,
  ...treeViewCustomizations,
};

export default function DemandForecastPage(props: { disableCustomTheme?: boolean }) {
  const { branches, branchId, setBranchId, loading } = useBranch();

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
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, mt: '20px' }}>
                <Typography component="h2" variant="h6">
                  Demand Forecast
                </Typography>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Branch</InputLabel>
                  <Select
                    value={branchId || ''}
                    label="Branch"
                    onChange={(e) => setBranchId(Number(e.target.value))}
                    disabled={loading || branches.length === 0}
                  >
                    {branches.map((branch: any) => (
                      <MenuItem key={branch.branch_id} value={branch.branch_id}>
                        {branch.branch_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

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