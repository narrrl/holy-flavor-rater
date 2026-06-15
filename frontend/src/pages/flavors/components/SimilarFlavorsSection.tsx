import React from 'react';
import { Box, CardContent, Chip, Grid, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import RecommendIcon from '@mui/icons-material/Recommend';
import GroupsIcon from '@mui/icons-material/Groups';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSimilarFlavors } from '../../../api/queries/useSimilarFlavors';
import type { SimilarFlavor } from '../../../api/types';
import RatingBadge from '../../../components/RatingBadge';
import StatusBadge from '../../../components/StatusBadge';
import { GlassCard } from '../../../components/ui';

export interface SimilarFlavorsSectionProps {
  flavorId: number | undefined;
}

/** One compact "similar flavor" card: image, score badge, name, co-rater count. */
const SimilarCard: React.FC<{ item: SimilarFlavor }> = ({ item }) => {
  const { t } = useTranslation();
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
      <Link to={`/flavor/${item.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <Box
          sx={{
            position: 'relative',
            aspectRatio: '1/1',
            bgcolor: 'background.default',
            borderBottom: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          <Box
            component="img"
            src={item.image_url || undefined}
            alt={item.name}
            loading="lazy"
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.5s ease',
              '&:hover': { transform: 'scale(1.1)' },
            }}
          />
          {item.average_rating != null && (
            <Box sx={{ position: 'absolute', top: 10, left: 10, zIndex: 2 }}>
              <RatingBadge score={item.average_rating} size="small" sx={{ height: 24 }} />
            </Box>
          )}
          <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}>
            <StatusBadge isLegacy={item.is_legacy} isAvailable={item.is_available} size="small" />
          </Box>
        </Box>
        <CardContent sx={{ p: 2 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 'bold',
              mb: 0.5,
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {item.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            {t(`categories.${item.category_slug}`, { defaultValue: item.category_name })}
          </Typography>
          <Tooltip title={t('flavorDetail.similarTooltip')}>
            <Chip
              size="small"
              icon={<GroupsIcon />}
              label={t('flavorDetail.similarCoRaters', { count: item.co_raters })}
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 'bold', maxWidth: '100%' }}
            />
          </Tooltip>
        </CardContent>
      </Link>
    </GlassCard>
  );
};

/**
 * "People who liked this also liked…" — item-based collaborative filtering on the
 * flavor detail page. Hidden entirely when the catalog has too few co-ratings to
 * compute a confident neighbourhood (cold flavors return an empty list).
 */
const SimilarFlavorsSection: React.FC<SimilarFlavorsSectionProps> = ({ flavorId }) => {
  const { t } = useTranslation();
  const { data, isLoading } = useSimilarFlavors(flavorId);

  if (isLoading) {
    return (
      <Box sx={{ mt: 4 }}>
        <Skeleton variant="text" width={280} height={36} sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Grid key={i} size={{ xs: 6, sm: 4, md: 3 }}>
              <Skeleton variant="rounded" height={240} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <Box sx={{ mt: 4 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <RecommendIcon color="primary" />
        <Typography variant="h6" sx={{ fontWeight: '900' }}>
          {t('flavorDetail.similarHeading')}
        </Typography>
      </Stack>
      <Grid container spacing={2}>
        {data.map((item) => (
          <Grid key={item.id} size={{ xs: 6, sm: 4, md: 3 }}>
            <SimilarCard item={item} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default SimilarFlavorsSection;
