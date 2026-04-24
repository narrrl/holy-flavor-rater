import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { GlassSurface } from './Glass';

export interface EmptyStateProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}

export const EmptyState = ({ title, subtitle, icon, action, compact = false }: EmptyStateProps) => (
  <GlassSurface
    intensity="subtle"
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      gap: 1.25,
      p: compact ? 3 : 5,
      minHeight: compact ? 160 : 220,
    }}
  >
    {icon && (
      <Box
        sx={{
          color: 'text.secondary',
          fontSize: compact ? 36 : 48,
          display: 'inline-flex',
          '& svg': { fontSize: 'inherit' },
        }}
      >
        {icon}
      </Box>
    )}
    <Typography variant={compact ? 'subtitle1' : 'h6'} sx={{ fontWeight: 700 }}>
      {title}
    </Typography>
    {subtitle && (
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '50ch' }}>
        {subtitle}
      </Typography>
    )}
    {action && <Box sx={{ mt: 1 }}>{action}</Box>}
  </GlassSurface>
);
