import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';

export interface FlavorGridProps {
  children: ReactNode;
  /**
   * `false` (default) — roomy auto-fill grid for primary browse surfaces (1 col on
   * phones, ~240px tracks above). `true` — dense fixed 2→6 column grid for secondary
   * strips (newest, similar).
   */
  compact?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * The single source of truth for flavor-card grids. Replaces the three divergent
 * inline `display: grid` definitions that had drifted across the browse surfaces
 * (CategoryFlavors, MainPage search/newest, SimilarFlavors).
 */
export const FlavorGrid = ({ children, compact = false, sx }: FlavorGridProps) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: compact
        ? {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(3, minmax(0, 1fr))',
            md: 'repeat(4, minmax(0, 1fr))',
            lg: 'repeat(5, minmax(0, 1fr))',
            xl: 'repeat(6, minmax(0, 1fr))',
          }
        : { xs: '1fr', sm: 'repeat(auto-fill, minmax(240px, 1fr))' },
      gap: compact ? 2 : 3,
      width: '100%',
      minWidth: 0,
      ...sx,
    }}
  >
    {children}
  </Box>
);
