import React from 'react';
import { Box, Grid, Skeleton, Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useTranslation } from 'react-i18next';
import { useRecommendations } from '../../api/queries/useRecommendations';
import RecommendationCard from './RecommendationCard';

export interface RecommendationsSectionProps {
  /** Gate the query on auth (the dashboard only renders when logged in). */
  enabled: boolean;
}

/**
 * "Tasters like you loved…" — the personalized discovery row. Hidden entirely when
 * the engine returns nothing (e.g. the user has rated everything); a thin profile
 * still yields popularity-fallback picks, so this is rarely empty.
 */
const RecommendationsSection: React.FC<RecommendationsSectionProps> = ({ enabled }) => {
  const { t } = useTranslation();
  const { data, isLoading } = useRecommendations(enabled);

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={240} height={36} sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, lg: 3 }}>
              <Skeleton variant="rounded" height={260} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <AutoAwesomeIcon color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          {t('dashboard.recHeading')}
        </Typography>
      </Stack>
      <Grid container spacing={2}>
        {data.map((rec) => (
          <Grid key={rec.id} size={{ xs: 12, sm: 6, lg: 3 }}>
            <RecommendationCard rec={rec} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default RecommendationsSection;
