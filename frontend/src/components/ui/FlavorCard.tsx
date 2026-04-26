import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { GlassCard } from './Glass';
import RatingBadge from '../RatingBadge';
import StatusBadge from '../StatusBadge';

export interface FlavorCardData {
  id: number;
  name: string;
  image_url?: string | null;
  average_rating?: number;
  is_legacy?: boolean;
  is_available?: boolean;
  category_name?: string;
}

export interface FlavorCardProps {
  flavor: FlavorCardData;
  caption?: string;
  showCategory?: boolean;
  compact?: boolean;
}

export const FlavorCard = ({
  flavor,
  caption,
  showCategory = true,
  compact = false,
}: FlavorCardProps) => {
  const theme = useTheme();
  const hasRating = typeof flavor.average_rating === 'number' && flavor.average_rating > 0;

  return (
    <Link
      to={`/flavor/${flavor.id}`}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
    >
      <GlassCard
        intensity="subtle"
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          transition: 'border-color 200ms ease, box-shadow 200ms ease, background-color 200ms ease',
          '&:hover': {
            borderColor: alpha(theme.palette.primary.main, 0.5),
            boxShadow: theme.tokens.elevation.md,
            '& .flavor-card-image': { transform: 'scale(1.04)' },
          },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1 / 1',
            bgcolor: 'background.default',
            borderBottom: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          {flavor.image_url ? (
            <Box
              component="img"
              className="flavor-card-image"
              src={flavor.image_url}
              loading="lazy"
              alt={flavor.name}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 600ms ease',
              }}
            />
          ) : (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: alpha(theme.palette.primary.main, 0.04),
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {flavor.name.charAt(0).toUpperCase()}
              </Typography>
            </Box>
          )}

          {/* Bottom fade for legibility of overlays */}
          <Box
            sx={{
              position: 'absolute',
              inset: 'auto 0 0 0',
              height: '40%',
              pointerEvents: 'none',
              background: `linear-gradient(to top, ${alpha(theme.palette.background.paper, 0.55)} 0%, transparent 100%)`,
            }}
          />

          {/* Status badge — top-right */}
          <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
            <StatusBadge
              isLegacy={flavor.is_legacy}
              isAvailable={flavor.is_available}
              size="small"
            />
          </Box>

          {/* Category chip — bottom-left */}
          {showCategory && flavor.category_name && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                zIndex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                px: 0.85,
                py: 0.35,
                borderRadius: theme.tokens.radius.pill + 'px',
                bgcolor: alpha(theme.palette.background.paper, 0.85),
                backdropFilter: theme.tokens.glass.blur,
                WebkitBackdropFilter: theme.tokens.glass.blur,
                border: '1px solid',
                borderColor: alpha(theme.palette.text.primary, 0.08),
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.6rem',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                  lineHeight: 1,
                }}
                noWrap
              >
                {flavor.category_name}
              </Typography>
            </Box>
          )}
        </Box>

        <CardContent
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: compact ? 0.5 : 0.75,
            p: compact ? 1.5 : 2,
            '&:last-child': { pb: compact ? 1.5 : 2 },
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              fontSize: compact ? '0.9rem' : '1rem',
              lineHeight: 1.25,
              letterSpacing: '-0.01em',
            }}
            noWrap
          >
            {flavor.name}
          </Typography>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              mt: 'auto',
              minHeight: 24,
            }}
          >
            {hasRating && <RatingBadge score={flavor.average_rating || 0} size="small" />}
            {caption && (
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                sx={{ fontWeight: 600, fontSize: '0.7rem', ml: 'auto' }}
              >
                {caption}
              </Typography>
            )}
          </Box>
        </CardContent>
      </GlassCard>
    </Link>
  );
};
