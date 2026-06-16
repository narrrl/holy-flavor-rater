import React from 'react';
import { Box, Skeleton, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../api/queries/useDashboard';
import { useTitle } from '../hooks/useTitle';
import { useToast } from '../hooks/useToast';
import { PageShell } from '../components/ui';
import DashboardHeader from './dashboard/DashboardHeader';
import MyReviewsTab from './dashboard/MyReviewsTab';
import RecommendationsSection from './dashboard/RecommendationsSection';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  useTitle(t('dashboard.title'));
  const { data, isLoading: loading } = useDashboard();
  const { notify } = useToast();

  const handleCopyLink = () => {
    if (!data) return;
    navigator.clipboard.writeText(`${window.location.origin}/profile/${data.user.username}`);
    notify({ message: t('dashboard.copySuccess'), severity: 'success' });
  };

  const handleGoBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  if (loading)
    return (
      <PageShell>
        <Stack spacing={3}>
          <Skeleton variant="rounded" height={isXs ? 140 : 220} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rounded" height={48} />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={160} sx={{ borderRadius: 2 }} />
          ))}
        </Stack>
      </PageShell>
    );
  if (!data)
    return (
      <PageShell>
        <Typography>{t('dashboard.loginRequired')}</Typography>
      </PageShell>
    );

  return (
    <PageShell>
      <DashboardHeader
        user={data.user}
        ratedCount={data.rated_count}
        missingCount={data.missing_count}
        stats={data.stats}
        onBack={handleGoBack}
        onShare={handleCopyLink}
      />

      <RecommendationsSection enabled={!!data} />

      <Box>
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
          {t('dashboard.myReviews')}
        </Typography>
        <MyReviewsTab
          ratings={data.my_ratings}
          currentUsername={data.user.username}
          onExplore={() => navigate('/')}
        />
      </Box>
    </PageShell>
  );
};

export default Dashboard;
