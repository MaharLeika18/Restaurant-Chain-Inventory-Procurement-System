import * as React from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';

// Wraps the whole dashboard route tree. Bounces to /login when signed out,
// and sends the user back to wherever they were trying to go afterwards.
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (status === 'signed-out') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
