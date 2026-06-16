import React from 'react';
import { Box, CardContent, Chip, Tooltip, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import GroupsIcon from '@mui/icons-material/Groups';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Recommendation } from '../../api/types';
import RatingBadge from '../../components/RatingBadge';
import StatusBadge from '../../components/StatusBadge';
import { GlassCard } from '../../components/ui';

export interface RecommendationCardProps {
  rec: Recommendation;
}

/**
 * A single recommended flavor. The reason chip is **count-only** (no neighbour
 * names, per product decision): CF → "N tasters like you", popularity → "Popular".
 */
const RecommendationCard: React.FC<RecommendationCardProps> = ({ rec }) => {
  const { t } = useTranslation();

  const reasonLabel =
    rec.reason === 'cf'
      ? t('dashboard.recReasonCf', { count: rec.contributing_neighbours })
      : t('dashboard.recReasonPopular');

  return (
    <GlassCard
      intensity="subtle"
      sx={{
        height: '100%',
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          borderColor: 'primary.main',
          boxShadow: (th) => th.tokens.elevation.md,
        },
        overflow: 'hidden',
      }}
    >
      <Link to={`/flavor/${rec.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <Box
          sx={{
            position: 'relative',
            aspectRatio: '1/1',
            bgcolor: 'background.default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          <Box
            component="img"
            src={rec.image_url || undefined}
            alt={rec.name}
            loading="lazy"
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.5s ease',
              '&:hover': { transform: 'scale(1.1)' },
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              left: 10,
              zIndex: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <Tooltip title={t('dashboard.predictedForYou')}>
              <Box>
                <RatingBadge
                  score={rec.predicted_score}
                  size="small"
                  sx={{ height: 24, bgcolor: 'primary.main' }}
                />
              </Box>
            </Tooltip>
            <StatusBadge isLegacy={rec.is_legacy} isAvailable={rec.is_available} size="small" />
          </Box>
        </Box>
        <CardContent sx={{ p: 2 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              mb: 0.5,
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {rec.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            {t(`categories.${rec.category_slug}`, { defaultValue: rec.category_name })}
          </Typography>
          <Chip
            size="small"
            icon={rec.reason === 'cf' ? <GroupsIcon /> : <AutoAwesomeIcon />}
            label={reasonLabel}
            color={rec.reason === 'cf' ? 'primary' : 'default'}
            variant="outlined"
            sx={{ fontWeight: 700, maxWidth: '100%' }}
          />
        </CardContent>
      </Link>
    </GlassCard>
  );
};

export default RecommendationCard;
