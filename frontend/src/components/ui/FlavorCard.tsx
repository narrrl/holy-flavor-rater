import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
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
}: FlavorCardProps) => (
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
        transition: 'transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          borderColor: 'primary.main',
          boxShadow: (theme) => theme.tokens.elevation.md,
        },
      }}
    >
      <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}>
        <StatusBadge isLegacy={flavor.is_legacy} isAvailable={flavor.is_available} size="small" />
      </Box>

      {flavor.image_url && (
        <Box
          sx={{
            width: '100%',
            aspectRatio: '1 / 1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default',
            borderBottom: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          <Box
            component="img"
            src={flavor.image_url}
            loading="lazy"
            alt={flavor.name}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 500ms ease',
              '&:hover': { transform: 'scale(1.05)' },
            }}
          />
        </Box>
      )}

      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Typography
          variant="h6"
          sx={{ fontSize: compact ? '0.95rem' : '1rem', lineHeight: 1.25 }}
          noWrap
        >
          {flavor.name}
        </Typography>

        {showCategory && flavor.category_name && (
          <Typography variant="caption" color="text.secondary" noWrap>
            {flavor.category_name}
          </Typography>
        )}

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mt: 'auto',
          }}
        >
          <RatingBadge score={flavor.average_rating || 0} size="small" />
          {caption && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {caption}
            </Typography>
          )}
        </Box>
      </CardContent>
    </GlassCard>
  </Link>
);
