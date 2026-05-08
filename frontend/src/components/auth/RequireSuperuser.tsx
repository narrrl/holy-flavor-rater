import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';

export interface RequireSuperuserProps {
  children: ReactNode;
}

export const RequireSuperuser = ({ children }: RequireSuperuserProps) => {
  const { user, loadingUser } = useAuth();
  const location = useLocation();

  if (loadingUser) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!user.is_superuser) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
};

export default RequireSuperuser;
