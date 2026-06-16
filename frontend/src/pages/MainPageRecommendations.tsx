import React from 'react';
import { Box, Skeleton } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useTranslation } from 'react-i18next';
import { useRecommendations, usePopularRecommendations } from '../api/queries/useRecommendations';
import RecommendationCard from './dashboard/RecommendationCard';
import { SectionHeader } from '../components/ui';

export interface MainPageRecommendationsProps {
  /** Logged-in → personalized CF recs; logged-out → public popularity picks. */
  isLoggedIn: boolean;
}

const GRID_SX = {
  display: 'grid',
  gridTemplateColumns: {
    xs: 'repeat(2, minmax(0, 1fr))',
    sm: 'repeat(3, minmax(0, 1fr))',
    md: 'repeat(4, minmax(0, 1fr))',
    lg: 'repeat(6, minmax(0, 1fr))',
  },
  gap: 2,
  width: '100%',
  minWidth: 0,
} as const;

/**
 * Algorithmic discovery row for the front page. Members get "Recommended for you"
 * (collaborative filtering); visitors get "Popular Picks" (Bayesian-popularity
 * ranking over the whole catalog). Both reuse {@link RecommendationCard}. The
 * section hides itself entirely when the engine returns nothing.
 */
const MainPageRecommendations: React.FC<MainPageRecommendationsProps> = ({ isLoggedIn }) => {
  const { t } = useTranslation();

  const personalized = useRecommendations(isLoggedIn);
  const popular = usePopularRecommendations(!isLoggedIn);
  const { data, isLoading } = isLoggedIn ? personalized : popular;

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={260} height={36} sx={{ mb: 2 }} />
        <Box sx={GRID_SX}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={240} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      </Box>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <Box>
      <SectionHeader
        title={
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesomeIcon color="primary" sx={{ fontSize: '1.75rem' }} />
            <span>{isLoggedIn ? t('home.recForYou') : t('home.popularPicks')}</span>
          </Box>
        }
        subtitle={isLoggedIn ? t('home.recForYouSubtitle') : t('home.popularPicksSubtitle')}
      />
      <Box sx={GRID_SX}>
        {data.map((rec) => (
          <RecommendationCard key={rec.id} rec={rec} />
        ))}
      </Box>
    </Box>
  );
};

export default MainPageRecommendations;
