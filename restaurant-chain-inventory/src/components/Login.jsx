import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(username, password);
      const dest = location.state?.from?.pathname ?? '/dashboard';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? "Can't reach the backend. Check that it is running (http://localhost:8000)."
          : 'Incorrect username or password.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100svh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        bgcolor: 'background.default',
      }}
    >
      <Paper component="form" onSubmit={handleSubmit} elevation={3} sx={{ p: 4, width: '100%', maxWidth: 380 }}>
        <Stack spacing={0.5} sx={{ mb: 3, alignItems: 'center', textAlign: 'center' }}>
          <RestaurantIcon color="primary" fontSize="large" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Resto Stock Chain
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sign in to manage your branch
          </Typography>
        </Stack>

        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
          />
          <Button type="submit" variant="contained" size="large" disabled={submitting} fullWidth>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
