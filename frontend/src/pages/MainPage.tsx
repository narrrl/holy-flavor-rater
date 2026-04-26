import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Typography,
  Box,
  CardContent,
  CircularProgress,
  Button,
  Avatar,
  Chip,
  IconButton,
  Tabs,
  Tab,
} from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useCategories } from '../api/queries/useFlavorsList';
import {
  useFlavorSearch,
  useFollowingFeedTop,
  useNewestFlavors,
  useRecentReviews,
  useTopFlavors,
} from '../api/queries/useMainPageQueries';
import { useTitle } from '../hooks/useTitle';
import RatingBadge from '../components/RatingBadge';
import StatusBadge from '../components/StatusBadge';
import {
  GlassCard,
  PageShell,
  SectionHeader,
  HeroBackdrop,
  ReviewRow,
  FlavorCard,
} from '../components/ui';

interface MainPageProps {
  adminMode?: boolean;
}

const MainPage: React.FC<MainPageProps> = ({ adminMode }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>('');
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const location = useLocation();

  const query = new URLSearchParams(location.search).get('q') || '';
  const isLoggedIn = !!localStorage.getItem('access');

  const { data: searchResults = [], isLoading: searchLoading } = useFlavorSearch(query);
  const {
    data: topFlavors = [],
    isLoading: topLoading,
    isFetching: topFetching,
  } = useTopFlavors(selectedCategorySlug || null);
  const { data: newestFlavors = [], isLoading: newestLoading } = useNewestFlavors();
  const { data: recentReviews = [], isLoading: recentLoading } = useRecentReviews();
  const { data: categories = [], isLoading: catLoading } = useCategories();
  const { data: feedRatings = [] } = useFollowingFeedTop(isLoggedIn && !query);

  const allFlavors = searchResults;
  const loading = query
    ? searchLoading
    : topLoading || newestLoading || recentLoading || catLoading;
  const categoryLoading = topFetching && !topLoading;

  useEffect(() => {
    setActiveIndex(0);
  }, [selectedCategorySlug]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setSelectedCategorySlug(newValue);
  };

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % topFlavors.length);
    }, 6000);
  }, [topFlavors.length]);

  useEffect(() => {
    if (topFlavors.length > 0 && !query) {
      startTimer();
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [topFlavors, query, startTimer]);

  useTitle(query ? `Search: ${query}` : 'Holy Flavors Archive');

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + topFlavors.length) % topFlavors.length);
    startTimer();
  };
  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % topFlavors.length);
    startTimer();
  };

  // --- SEARCH VIEW ---
  if (query) {
    const filteredFlavors = allFlavors.filter(
      (f) =>
        f.name.toLowerCase().includes(query.toLowerCase()) ||
        f.description.toLowerCase().includes(query.toLowerCase()) ||
        f.category_name.toLowerCase().includes(query.toLowerCase()),
    );

    return (
      <PageShell>
        <SectionHeader
          title={`Search Results for "${query}"`}
          subtitle={`Found ${filteredFlavors.length} items`}
        />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(auto-fill, minmax(280px, 1fr))',
              lg: 'repeat(auto-fill, minmax(240px, 1fr))',
            },
            gap: 3,
          }}
        >
          {filteredFlavors.map((flavor) => (
            <FlavorCard key={flavor.id} flavor={flavor} />
          ))}
        </Box>
      </PageShell>
    );
  }

  // --- HOME VIEW ---
  const currentTop = topFlavors[activeIndex];
  const featuredReview = currentTop?.ratings?.find((r) => r.comment) || null;

  return (
    <PageShell hero={<HeroBackdrop variant={isLoggedIn ? 'minimal' : 'mesh'} />}>
      {/* Hero / Activity Feed */}
      {isLoggedIn ? (
        <Box>
          <SectionHeader
            title={t('home.activity')}
            subtitle={t('home.activitySubtitle')}
            action={
              <Button
                component={Link}
                to="/community"
                variant="outlined"
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                {t('home.viewFullFeed')}
              </Button>
            }
          />

          {feedRatings.length === 0 ? (
            <GlassCard
              intensity="subtle"
              sx={{
                p: 4,
                textAlign: 'center',
                border: '2px dashed',
                borderColor: 'divider',
              }}
            >
              <Typography variant="h6">{t('home.quietFeed')}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('home.followMore')}
              </Typography>
              <Button
                variant="contained"
                component={Link}
                to="/"
                size="small"
                sx={{ borderRadius: 2 }}
              >
                {t('home.exploreFlavors')}
              </Button>
            </GlassCard>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                gap: 2,
              }}
            >
              {feedRatings.map((rating) => (
                <Box key={rating.id} sx={{ position: 'relative' }}>
                  <ReviewRow review={rating} compact />
                  {adminMode && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate(`/admin-panel/rating/${rating.id}`);
                      }}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        borderRadius: 1,
                        fontSize: '0.6rem',
                        py: 0,
                        textTransform: 'none',
                        zIndex: 2,
                      }}
                    >
                      {t('admin.manageRating')}
                    </Button>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      ) : (
        <GlassCard
          intensity="strong"
          sx={{
            p: { xs: 4, md: 10 },
            textAlign: 'center',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <Typography
            variant="h2"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 'bold',
              fontSize: { xs: '2.2rem', sm: '3rem', md: '4.5rem' },
              overflowWrap: 'break-word',
              background: (theme) => theme.tokens.accent.gradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {t('hero.title')}
          </Typography>
          <Typography
            variant="h5"
            color="text.secondary"
            sx={{ mb: 4, maxWidth: 800, mx: 'auto', px: 2 }}
          >
            {t('hero.subtitle')}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap', px: 2 }}>
            <Button
              variant="contained"
              size="large"
              component={Link}
              to="/login"
              sx={{ px: 4, py: 1.5, borderRadius: 2 }}
            >
              {t('hero.join')}
            </Button>
            <Button
              variant="outlined"
              size="large"
              component={Link}
              to="/about"
              sx={{ px: 4, py: 1.5, borderRadius: 2 }}
            >
              {t('hero.whatIsThis')}
            </Button>
          </Box>
        </GlassCard>
      )}

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', xl: 'row' }, gap: 6 }}>
        {/* Hall of Fame Carousel */}
        {topFlavors.length > 0 && currentTop && (
          <Box sx={{ flex: { xs: '1 1 100%', xl: '1 1 65%' }, minWidth: 0 }}>
            <SectionHeader
              title={
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                  <EmojiEventsIcon color="primary" sx={{ fontSize: '2rem' }} />
                  <span>{t('home.hallOfFame')}</span>
                </Box>
              }
              action={
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton
                    onClick={handlePrev}
                    sx={{ border: '1px solid', borderColor: 'divider' }}
                  >
                    <ChevronLeftIcon />
                  </IconButton>
                  <IconButton
                    onClick={handleNext}
                    sx={{ border: '1px solid', borderColor: 'divider' }}
                  >
                    <ChevronRightIcon />
                  </IconButton>
                </Box>
              }
            />

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
              <Tabs
                value={selectedCategorySlug}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                aria-label="hall of fame categories"
                sx={{ '& .MuiTab-root': { fontWeight: 'bold', minWidth: 100 } }}
              >
                <Tab label="All Flavors" value="" />
                {categories.map((cat) => (
                  <Tab key={cat.id} label={cat.name} value={cat.slug} />
                ))}
              </Tabs>
            </Box>

            <Box sx={{ position: 'relative', minHeight: { xs: 400, md: 500 } }}>
              {categoryLoading && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    bgcolor: (theme) => theme.tokens.glass.tint,
                    backdropFilter: (theme) => theme.tokens.glass.blur,
                    zIndex: 2,
                    borderRadius: 4,
                  }}
                >
                  <CircularProgress />
                </Box>
              )}
              <GlassCard
                intensity="strong"
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  height: { xs: 'auto', md: 500 },
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <Box
                  component={Link}
                  to={`/flavor/${currentTop.id}`}
                  sx={{
                    width: { xs: '100%', md: '45%' },
                    height: { md: '100%' },
                    aspectRatio: { xs: '16/9', md: 'auto' },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'action.hover',
                    overflow: 'hidden',
                    textDecoration: 'none',
                  }}
                >
                  <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1 }}>
                    <StatusBadge
                      isLegacy={currentTop.is_legacy}
                      isAvailable={currentTop.is_available}
                    />
                  </Box>
                  <Box
                    component="img"
                    src={currentTop.image_url || ''}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />
                </Box>
                <CardContent
                  sx={{
                    flex: 1,
                    p: { xs: 3, sm: 4, md: 6 },
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  <Chip
                    label={`${t('common.rank')} #${activeIndex + 1}`}
                    color="primary"
                    size="small"
                    sx={{ width: 'fit-content', mb: 1, fontWeight: 'bold' }}
                  />
                  <Typography
                    variant="h3"
                    gutterBottom
                    sx={{
                      fontWeight: 'bold',
                      fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' },
                    }}
                  >
                    {currentTop.name}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mb: { xs: 2, md: 3 },
                      flexWrap: 'wrap',
                      gap: 2,
                    }}
                  >
                    <RatingBadge score={currentTop.average_rating || 0} size="large" />
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                      {currentTop.ratings.length} {t('common.reviews')}
                    </Typography>
                  </Box>

                  {featuredReview && (
                    <GlassCard
                      intensity="subtle"
                      sx={{ mt: 1, p: { xs: 2, md: 3 }, boxShadow: 'none' }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontStyle: 'italic',
                          mb: 1,
                          fontSize: { xs: '0.9rem', md: '1.1rem' },
                          display: '-webkit-box',
                          overflow: 'hidden',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: 3,
                        }}
                      >
                        "{featuredReview.comment}"
                      </Typography>
                      <Link
                        to={`/profile/${featuredReview.user}`}
                        style={{
                          textDecoration: 'none',
                          color: 'inherit',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <Avatar
                          src={featuredReview.user_avatar || undefined}
                          sx={{ width: 24, height: 24, fontSize: '0.6rem' }}
                        >
                          {!featuredReview.user_avatar && featuredReview.user.charAt(0)}
                        </Avatar>
                        <Typography variant="caption" color="text.secondary">
                          — {featuredReview.user}
                        </Typography>
                      </Link>
                    </GlassCard>
                  )}

                  <Button
                    variant="contained"
                    component={Link}
                    to={`/flavor/${currentTop.id}`}
                    sx={{
                      mt: { xs: 3, md: 4 },
                      width: { xs: '100%', sm: 'fit-content' },
                      px: 4,
                      py: 1.5,
                      borderRadius: 2,
                    }}
                  >
                    {t('home.viewAllReviews')}
                  </Button>
                </CardContent>
              </GlassCard>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 1 }}>
              {topFlavors.map((_, i) => (
                <Box
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  sx={{
                    width: activeIndex === i ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    bgcolor: activeIndex === i ? 'primary.main' : 'divider',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Recent Reviews */}
        {recentReviews.length > 0 && (
          <Box
            sx={{
              flex: { xs: '1 1 100%', xl: '1 1 35%' },
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <SectionHeader title={t('home.communityVoice')} />
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                height: { xl: 500 },
                overflowY: { xl: 'auto' },
                pr: { xl: 1 },
                '&::-webkit-scrollbar': { width: '6px' },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: '3px' },
              }}
            >
              {recentReviews.map((review) => (
                <Box key={review.id} sx={{ position: 'relative' }}>
                  <ReviewRow review={review} compact />
                  {adminMode && (
                    <Button
                      size="small"
                      variant="text"
                      color="secondary"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate(`/admin-panel/rating/${review.id}`);
                      }}
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        fontSize: '0.65rem',
                        py: 0,
                        textTransform: 'none',
                        fontWeight: 'bold',
                        zIndex: 2,
                      }}
                    >
                      {t('admin.manageRating')}
                    </Button>
                  )}
                </Box>
              ))}
              <Button
                component={Link}
                to="/community"
                variant="text"
                size="small"
                sx={{ alignSelf: 'center', mt: 1 }}
              >
                {t('home.viewMoreReviews')}
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      {/* Newest Arrivals */}
      {newestFlavors.length > 0 && (
        <Box>
          <SectionHeader title={t('home.newArrivals')} />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'repeat(3, minmax(0, 1fr))',
                md: 'repeat(4, minmax(0, 1fr))',
                lg: 'repeat(5, minmax(0, 1fr))',
                xl: 'repeat(6, minmax(0, 1fr))',
              },
              gap: 2,
              width: '100%',
              minWidth: 0,
            }}
          >
            {newestFlavors.map((flavor) => (
              <FlavorCard key={flavor.id} flavor={flavor} compact />
            ))}
          </Box>
        </Box>
      )}
    </PageShell>
  );
};

export default MainPage;
