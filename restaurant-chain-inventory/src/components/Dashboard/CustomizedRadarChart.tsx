import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { RadarChart } from '@mui/x-charts/RadarChart';

interface SupplierPerformance {
  id: string;
  name: string;
  data: number[]; // one value per metric, same order as `metrics` below
}

const metrics = ['Quality', 'Cost', 'Delivery', 'Reliability', 'Flexibility', 'Support'];

// TODO: REPLACE WITH DB DATA
const suppliers: SupplierPerformance[] = [
  { id: '1', name: 'Supplier A', data: [90, 70, 85, 95, 60, 80] },
  { id: '2', name: 'Supplier B', data: [75, 88, 70, 65, 90, 72] },
  { id: '3', name: 'Supplier C', data: [60, 95, 92, 80, 55, 68] },
];

export default function CustomizedRadarChart() {
  const [supplierId, setSupplierId] = React.useState(suppliers[0].id);

  const handleChange = (event: SelectChangeEvent) => {
    setSupplierId(event.target.value);
  };

  const selectedSupplier =
    suppliers.find((s) => s.id === supplierId) ?? suppliers[0];

  return (
    <Card variant="outlined" sx={{ width: '100%' }}>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            mb: 2,
          }}
        >
          <Typography component="h2" variant="subtitle2" gutterBottom sx={{ mb: 0 }}>
            Supplier Performance
          </Typography>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="supplier-select-label">Supplier</InputLabel>
            <Select
              labelId="supplier-select-label"
              id="supplier-select"
              value={supplierId}
              label="Supplier"
              onChange={handleChange}
            >
              {suppliers.map((supplier) => (
                <MenuItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <RadarChart
          height={300}
          series={[{ data: selectedSupplier.data }]}
          radar={{
            max: 100,
            metrics,
          }}
        />
      </CardContent>
    </Card>
  );
}