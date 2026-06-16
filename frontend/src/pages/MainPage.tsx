import React, { useEffect, useRef, useState } from 'react';
import {
  Typography,
  Box,
  CardContent,
  Button,
  Avatar,
  Chip,
  IconButton,
  Skeleton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import {
  useFlavorSearch,
  useNewestFlavors,
  useTopFlavors,
} from '../api/queries/useMainPageQueries';
import { useTitle } from '../hooks/useTitle';
import { useAuth } from '../hooks/useAuth';
import RatingBadge from '../components/RatingBadge';
import StatusBadge from '../components/StatusBadge';
import {
  GlassCard,
  PageShell,
  SectionHeader,
  HeroBackdrop,
  FlavorCard,
  FlavorGrid,
  EmptyState,
} from '../components/ui';
import MainPageRecommendations from './MainPageRecommendations';
import { CategoryBrowseGrid } from '../components/home/DesktopHomeSections';
import { useCategories } from '../api/queries/useCategories';

const TOP_LIMIT = 5;
const AUTO_ADVANCE_MS = 6000;
const SWIPE_THRESHOLD = 50;

const FlavorCardSkeleton: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <Box sx={{ height: '100%' }}>
    <Skeleton
      variant="rectangular"
      sx={{
        width: '100%',
        aspectRatio: '1 / 1',
        borderRadius: 2,
      }}
    />
    <Skeleton variant="text" sx={{ mt: 1, fontSize: compact ? '0.95rem' : '1rem' }} />
    <Skeleton variant="text" width="60%" sx={{ fontSize: '0.75rem' }} />
  </Box>
);

const HeroCarouselSkeleton: React.FC = () => (
  <GlassCard
    intensity="strong"
    sx={{
      display: 'flex',
      flexDirection: { xs: 'column', md: 'row' },
      height: { xs: 'auto', md: 480 },
      overflow: 'hidden',
    }}
  >
    <Skeleton
      variant="rectangular"
      sx={{
        width: { xs: '100%', md: '45%' },
        height: { xs: 240, md: '100%' },
      }}
    />
    <Box sx={{ flex: 1, p: { xs: 3, md: 6 } }}>
      <Skeleton variant="text" width="40%" sx={{ fontSize: '0.85rem' }} />
      <Skeleton variant="text" width="80%" sx={{ fontSize: '2.5rem', mb: 1 }} />
      <Skeleton variant="text" width="50%" />
      <Skeleton variant="text" width="100%" sx={{ mt: 3 }} />
      <Skeleton variant="text" width="90%" />
      <Skeleton variant="rectangular" width={140} height={42} sx={{ mt: 3, borderRadius: 1 }} />
    </Box>
  </GlassCard>
);

const MainPage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [activeIndex, setActiveIndex] = useState(0);
  // Auto-advance stops for good once the user takes manual control; hover only
  // pauses temporarily. Reduced-motion users never get auto-advance.
  const [autoPlay, setAutoPlay] = useState(true);
  const [hovered, setHovered] = useState(false);
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const muiTheme = useTheme();
  const isDesktop = useMediaQuery(muiTheme.breakpoints.up('md'));
  const touchStartX = useRef<number | null>(null);

  const query = new URLSearchParams(location.search).get('q') || '';
  const { user } = useAuth();
  const isLoggedIn = !!user;

  const { data: searchResults = [], isLoading: searchLoading } = useFlavorSearch(query);
  const { data: topFlavorsAll = [], isLoading: topLoading } = useTopFlavors(null);
  const { data: newestFlavors = [], isLoading: newestLoading } = useNewestFlavors();
  const { data: categories = [] } = useCategories();

  const topFlavors = topFlavorsAll
    .filter((f) => f.category_slug !== 'packs-and-other')
    .slice(0, TOP_LIMIT);
  const safeIndex = topFlavors.length > 0 ? activeIndex % topFlavors.length : 0;
  const currentTop = topFlavors[safeIndex];
  // Feature the highest-scored review with a comment, not just the first one —
  // a Hall-of-Fame quote should be the most glowing, not whatever loaded first.
  const featuredReview = (currentTop?.ratings ?? [])
    .filter((r) => r.comment)
    .reduce<
      (typeof currentTop)['ratings'][number] | null
    >((best, r) => (best === null || r.score > best.score ? r : best), null);

  useTitle(query ? `Search: ${query}` : 'Holy Flavors Archive');

  const handlePrev = () => {
    if (topFlavors.length === 0) return;
    setAutoPlay(false);
    setActiveIndex((prev) => (prev - 1 + topFlavors.length) % topFlavors.length);
  };
  const handleNext = () => {
    if (topFlavors.length === 0) return;
    setAutoPlay(false);
    setActiveIndex((prev) => (prev + 1) % topFlavors.length);
  };
  const goTo = (i: number) => {
    setAutoPlay(false);
    setActiveIndex(i);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    if (delta < 0) handleNext();
    else handlePrev();
  };

  useEffect(() => {
    if (topFlavors.length <= 1 || !autoPlay || hovered || prefersReducedMotion) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % topFlavors.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [topFlavors.length, autoPlay, hovered, prefersReducedMotion]);

  // --- SEARCH VIEW ---
  if (query) {
    return (
      <PageShell>
        <SectionHeader
          title={t('home.searchResultsTitle', { query })}
          subtitle={
            searchLoading
              ? t('common.loading')
              : t('home.searchResultsCount', { count: searchResults.length })
          }
        />
        {searchLoading ? (
          <FlavorGrid>
            {Array.from({ length: 8 }).map((_, i) => (
              <FlavorCardSkeleton key={i} />
            ))}
          </FlavorGrid>
        ) : searchResults.length === 0 ? (
          <EmptyState title={t('home.noSearchResults', { query })} />
        ) : (
          <FlavorGrid>
            {searchResults.map((flavor) => (
              <FlavorCard key={flavor.id} flavor={flavor} />
            ))}
          </FlavorGrid>
        )}
      </PageShell>
    );
  }

  // --- HOME VIEW ---
  return (
    <PageShell hero={<HeroBackdrop variant={isLoggedIn ? 'minimal' : 'mesh'} />}>
      {/* Hero */}
      {isLoggedIn ? (
        <Box sx={{ mb: 1 }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.02em',
              fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.75rem' },
              background: (theme) => theme.tokens.accent.gradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              mb: 1,
            }}
          >
            {t('home.archiveTitle')}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 640, lineHeight: 1.6 }}
          >
            {t('home.archiveSubtitle')}
          </Typography>
        </Box>
      ) : (
        <GlassCard
          intensity="strong"
          sx={{
            p: { xs: 4, md: 8 },
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
              fontWeight: 800,
              fontSize: { xs: '2.2rem', sm: '3rem', md: '4rem' },
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
            variant="h6"
            color="text.secondary"
            sx={{ mb: 4, maxWidth: 720, mx: 'auto', px: 2, lineHeight: 1.5 }}
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

      {/* Hall of Fame */}
      <Box>
        <SectionHeader
          title={
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
              <EmojiEventsIcon color="primary" sx={{ fontSize: '1.75rem' }} />
              <span>{t('home.hallOfFame')}</span>
            </Box>
          }
          subtitle={t('home.hallOfFameSubtitle')}
          action={
            topFlavors.length > 1 ? (
              <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
                <IconButton
                  onClick={handlePrev}
                  aria-label={t('home.previousFlavor')}
                  sx={{ border: '1px solid', borderColor: 'divider' }}
                >
                  <ChevronLeftIcon />
                </IconButton>
                <IconButton
                  onClick={handleNext}
                  aria-label={t('home.nextFlavor')}
                  sx={{ border: '1px solid', borderColor: 'divider' }}
                >
                  <ChevronRightIcon />
                </IconButton>
              </Box>
            ) : undefined
          }
        />

        {topLoading ? (
          <HeroCarouselSkeleton />
        ) : currentTop ? (
          <>
            <GlassCard
              intensity="strong"
              role="region"
              aria-roledescription="carousel"
              aria-label={t('home.hallOfFame')}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                height: { xs: 'auto', md: 480 },
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {topFlavors.length > 1 && (
                <>
                  <IconButton
                    onClick={handlePrev}
                    aria-label={t('home.previousFlavor')}
                    sx={{
                      display: { xs: 'flex', md: 'none' },
                      position: 'absolute',
                      top: '50%',
                      left: 8,
                      transform: 'translateY(-50%)',
                      zIndex: 2,
                      bgcolor: 'background.paper',
                      boxShadow: 2,
                      '&:hover': { bgcolor: 'background.paper' },
                    }}
                  >
                    <ChevronLeftIcon />
                  </IconButton>
                  <IconButton
                    onClick={handleNext}
                    aria-label={t('home.nextFlavor')}
                    sx={{
                      display: { xs: 'flex', md: 'none' },
                      position: 'absolute',
                      top: '50%',
                      right: 8,
                      transform: 'translateY(-50%)',
                      zIndex: 2,
                      bgcolor: 'background.paper',
                      boxShadow: 2,
                      '&:hover': { bgcolor: 'background.paper' },
                    }}
                  >
                    <ChevronRightIcon />
                  </IconButton>
                </>
              )}
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
                  position: 'relative',
                }}
              >
                <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1 }}>
                  <StatusBadge
                    isLegacy={currentTop.is_legacy}
                    isAvailable={currentTop.is_available}
                  />
                </Box>
                {currentTop.image_url && (
                  <Box
                    component="img"
                    src={currentTop.image_url}
                    alt={currentTop.name}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />
                )}
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
                  label={`${t('common.rank')} #${safeIndex + 1}`}
                  color="primary"
                  size="small"
                  sx={{ width: 'fit-content', mb: 1, fontWeight: 700 }}
                />
                <Typography
                  variant="h3"
                  gutterBottom
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.75rem' },
                    lineHeight: 1.1,
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
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {currentTop.ratings.length} {t('common.reviews')}
                  </Typography>
                </Box>

                {featuredReview && (
                  <GlassCard
                    intensity="subtle"
                    sx={{ mt: 1, p: { xs: 2, md: 2.5 }, boxShadow: 'none' }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontStyle: 'italic',
                        mb: 1,
                        fontSize: { xs: '0.9rem', md: '1rem' },
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        overflow: 'hidden',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 3,
                      }}
                    >
                      &quot;{featuredReview.comment}&quot;
                    </Typography>
                    <Box
                      component={Link}
                      to={`/profile/${featuredReview.user}`}
                      sx={{
                        textDecoration: 'none',
                        color: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Avatar
                        src={featuredReview.user_avatar || undefined}
                        sx={{ width: 22, height: 22, fontSize: '0.6rem' }}
                      >
                        {!featuredReview.user_avatar && featuredReview.user.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography variant="caption" color="text.secondary">
                        — {featuredReview.user}
                      </Typography>
                    </Box>
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
                    py: 1.25,
                    borderRadius: 2,
                  }}
                >
                  {t('home.viewAllReviews')}
                </Button>
              </CardContent>
            </GlassCard>

            {topFlavors.length > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 1 }}>
                {topFlavors.map((_, i) => (
                  <Box
                    key={i}
                    component="button"
                    onClick={() => goTo(i)}
                    aria-label={t('home.goToFlavor', { n: i + 1 })}
                    aria-current={safeIndex === i ? 'true' : undefined}
                    sx={{
                      width: safeIndex === i ? 24 : 8,
                      height: 8,
                      p: 0,
                      border: 'none',
                      borderRadius: 4,
                      bgcolor: safeIndex === i ? 'primary.main' : 'divider',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: 2,
                      },
                    }}
                  />
                ))}
              </Box>
            )}
          </>
        ) : (
          <EmptyState title={t('home.noTopFlavors')} />
        )}
      </Box>

      {/* Desktop-only category browser */}
      {isDesktop && <CategoryBrowseGrid categories={categories} />}

      {/* Algorithmic discovery: personalized (members) or popular picks (visitors) */}
      <MainPageRecommendations isLoggedIn={isLoggedIn} />

      {/* Newest Arrivals */}
      <Box>
        <SectionHeader title={t('home.newArrivals')} subtitle={t('home.newArrivalsSubtitle')} />
        {newestLoading ? (
          <FlavorGrid compact>
            {Array.from({ length: 6 }).map((_, i) => (
              <FlavorCardSkeleton key={i} compact />
            ))}
          </FlavorGrid>
        ) : newestFlavors.length === 0 ? (
          <EmptyState title={t('home.noNewest')} />
        ) : (
          <FlavorGrid compact>
            {newestFlavors.map((flavor) => (
              <FlavorCard key={flavor.id} flavor={flavor} compact />
            ))}
          </FlavorGrid>
        )}
      </Box>
    </PageShell>
  );
};

export default MainPage;
