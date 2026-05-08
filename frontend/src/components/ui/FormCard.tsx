import type { FormEvent, ReactNode } from 'react';
import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { GlassCard } from './Glass';

export interface FormCardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  danger?: boolean;
  compact?: boolean;
  /** Render without a <form> wrapper. Use when the card hosts file uploads or non-form controls. */
  asForm?: boolean;
}

export const FormCard = ({
  title,
  subtitle,
  actions,
  children,
  onSubmit,
  danger = false,
  compact = false,
  asForm = true,
}: FormCardProps) => {
  const body = (
    <Stack spacing={compact ? 1.5 : 2}>
      {(title || subtitle) && (
        <Box>
          {title && (
            <Typography
              variant={compact ? 'subtitle1' : 'h6'}
              sx={{ fontWeight: 700, color: danger ? 'error.main' : 'text.primary' }}
            >
              {title}
            </Typography>
          )}
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      )}

      <Stack spacing={compact ? 1.5 : 2}>{children}</Stack>

      {actions && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
          {actions}
        </Box>
      )}
    </Stack>
  );

  return (
    <GlassCard
      intensity={danger ? 'default' : 'default'}
      sx={{
        p: compact ? 2 : 3,
        ...(danger && {
          borderColor: (theme) => alpha(theme.palette.error.main, 0.5),
          boxShadow: (theme) =>
            `${theme.tokens.elevation.sm}, 0 0 32px ${alpha(theme.palette.error.main, 0.18)}`,
        }),
      }}
    >
      {asForm && onSubmit ? (
        <Box component="form" onSubmit={onSubmit} noValidate>
          {body}
        </Box>
      ) : (
        body
      )}
    </GlassCard>
  );
};
