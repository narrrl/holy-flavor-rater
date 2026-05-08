import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export interface SectionHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}

export const SectionHeader = ({ title, subtitle, action, compact }: SectionHeaderProps) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      flexWrap: 'wrap',
      gap: 2,
      mb: compact ? 2 : 3,
    }}
  >
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant={compact ? 'h5' : 'h4'}
        component="h2"
        sx={{
          fontWeight: 700,
          lineHeight: 1.15,
          background: (theme) => theme.tokens.accent.gradient,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          display: 'inline-block',
        }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: '60ch' }}>
          {subtitle}
        </Typography>
      )}
    </Box>
    {action}
  </Box>
);
