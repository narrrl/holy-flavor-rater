import { Box, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export interface BrandMarkProps {
  /** Fired on click — e.g. close the mobile drawer. */
  onNavigate?: () => void;
  /** Icon-only (no wordmark) — for tight surfaces like the mobile app bar. */
  compact?: boolean;
}

/**
 * App identity anchor: a gradient "H" monogram + wordmark, linking home. Gives the
 * sidebar and mobile app bar a consistent brand presence (UX audit #3).
 */
export const BrandMark = ({ onNavigate, compact = false }: BrandMarkProps) => {
  const { t } = useTranslation();
  return (
    <Box
      component={Link}
      to="/"
      onClick={onNavigate}
      aria-label={t('brand.name')}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        minWidth: 0,
        color: 'inherit',
        textDecoration: 'none',
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          flexShrink: 0,
          borderRadius: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: (theme) => theme.tokens.accent.gradient,
          boxShadow: (theme) => theme.tokens.elevation.sm,
        }}
      >
        <Typography
          component="span"
          sx={{ fontWeight: 900, fontSize: '1.15rem', lineHeight: 1, color: '#fff' }}
        >
          H
        </Typography>
      </Box>
      {!compact && (
        <Box sx={{ minWidth: 0, display: { xs: 'none', md: 'block' } }}>
          <Typography sx={{ fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.01em' }} noWrap>
            {t('brand.name')}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }} noWrap>
            {t('brand.tagline')}
          </Typography>
        </Box>
      )}
    </Box>
  );
};
