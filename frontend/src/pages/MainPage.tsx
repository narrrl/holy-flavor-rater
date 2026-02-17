import React, { useEffect, useState, useRef } from 'react';
import { 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  CircularProgress,
  Button,
  Avatar,
  Paper,
  Chip,
  Container,
  IconButton,
  alpha
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import api from '../api';
import { useTitle } from '../hooks/useTitle';
import { formatDate } from '../utils/date';
import RatingBadge from '../components/RatingBadge';

interface Flavor {
    id: number;
    name: string;
    category_name: string;
    description: string;
    average_rating: number;
    image_url: string | null;
    is_available: boolean;
    is_legacy: boolean;
    ratings: any[];
}

interface Review {
    id: number;
    user: string;
    user_avatar: string | null;
    flavor_name: string;
    flavor_image: string | null;
    score: number;
    comment: string;
    created_at: string;
    flavor: number;
}

const MainPage: React.FC = () => {
  const { t } = useTranslation();
  const [topFlavors, setTopFlavors] = useState<Flavor[]>([]);
  const [newestFlavors, setNewestFlavors] = useState<Flavor[]>([]);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [allFlavors, setAllFlavors] = useState<Flavor[]>([]);
  const [feedRatings, setFeedRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const location = useLocation();
  
  const query = new URLSearchParams(location.search).get('q') || '';
  const isLoggedIn = !!localStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (query) {
            // Perform server-side search to get all matching flavors across pages
            const res = await api.get(`flavors/?search=${encodeURIComponent(query)}`);
            setAllFlavors(Array.isArray(res.data) ? res.data : (res.data.results || []));
        } else {
            const requests: any[] = [
                api.get('flavors/top/'),
                api.get('ratings/recent/'),
                api.get('flavors/newest/')
            ];
            
            if (isLoggedIn) {
                requests.push(api.get('ratings/feed/'));
            }

            const results = await Promise.all(requests);
            
            setTopFlavors(Array.isArray(results[0].data) ? results[0].data : (results[0].data.results || []));
            setRecentReviews(Array.isArray(results[1].data) ? results[1].data : (results[1].data.results || []));
            setNewestFlavors(Array.isArray(results[2].data) ? results[2].data : (results[2].data.results || []));
            
            if (isLoggedIn && results[3]) {
                const feedData = Array.isArray(results[3].data) ? results[3].data : (results[3].data.results || []);
                setFeedRatings(feedData.slice(0, 6)); // Show top 6 on home
            }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [query, isLoggedIn]);

  const startTimer = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
          setActiveIndex(prev => (prev + 1) % topFlavors.length);
      }, 6000);
  };

  // Auto-rotate
  useEffect(() => {
      if (topFlavors.length > 0 && !query) {
          startTimer();
          return () => {
              if (timerRef.current) clearInterval(timerRef.current);
          };
      }
  }, [topFlavors, query]);

  useTitle(query ? `Search: ${query}` : 'Holy Flavors Archive');

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  const handlePrev = () => {
      setActiveIndex(prev => (prev - 1 + topFlavors.length) % topFlavors.length);
      startTimer();
  };
  const handleNext = () => {
      setActiveIndex(prev => (prev + 1) % topFlavors.length);
      startTimer();
  };

  // --- SEARCH VIEW ---
  if (query) {
      const filteredFlavors = allFlavors.filter(f => 
          f.name.toLowerCase().includes(query.toLowerCase()) ||
          f.description.toLowerCase().includes(query.toLowerCase()) ||
          f.category_name.toLowerCase().includes(query.toLowerCase())
      );

      return (
          <Container maxWidth={false} sx={{ px: { xs: 2, sm: 4, md: 6 }, py: 4 }}>
              <Typography variant="h4" gutterBottom sx={{ overflowWrap: 'break-word' }}>Search Results for "{query}"</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                  Found {filteredFlavors.length} items
              </Typography>

              <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(auto-fill, minmax(280px, 1fr))',
                      lg: 'repeat(auto-fill, minmax(240px, 1fr))'
                  },
                  gap: 3 
              }}>
                  {filteredFlavors.map(flavor => (
                      <Box key={flavor.id}>
                          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.02)' } }}>
                              <Box component={Link} to={`/flavor/${flavor.id}`} sx={{ textDecoration: 'none', color: 'inherit', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                  {!flavor.is_available && (
                                      <Box sx={{ 
                                          position: 'absolute', top: 10, right: 10, 
                                          bgcolor: flavor.is_legacy ? 'warning.main' : 'error.main', 
                                          color: 'white', px: 1, borderRadius: 1, fontSize: '0.75rem', zIndex: 1 
                                      }}>
                                          {flavor.is_legacy ? 'Unavailable' : 'Out of Stock'}
                                      </Box>
                                  )}
                                  {flavor.image_url && (
                                      <Box 
                                          sx={{ 
                                              width: '100%', 
                                              aspectRatio: '1/1', 
                                              display: 'flex', 
                                              alignItems: 'center', 
                                              justifyContent: 'center', 
                                              bgcolor: 'background.default',
                                              borderBottom: '1px solid',
                                              borderColor: 'divider',
                                              overflow: 'hidden'
                                          }}
                                      >
                                          <Box 
                                              component="img" 
                                              src={flavor.image_url} 
                                              sx={{ 
                                                  width: '100%', 
                                                  height: '100%', 
                                                  objectFit: 'cover',
                                                  transition: 'transform 0.5s ease',
                                                  '&:hover': { transform: 'scale(1.1)' }
                                              }} 
                                              loading="lazy"
                                          />
                                      </Box>
                                  )}
                                  <CardContent sx={{ flexGrow: 1 }}>
                                      <Typography variant="h6" sx={{ fontSize: '1rem' }}>{flavor.name}</Typography>
                                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{flavor.category_name}</Typography>
                                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                          <RatingBadge score={flavor.average_rating || 0} size="small" />
                                      </Box>
                                  </CardContent>
                              </Box>
                          </Card>
                      </Box>
                  ))}
              </Box>
          </Container>
      );
  }

  // --- HOME VIEW ---
  const currentTop = topFlavors[activeIndex];
  const featuredReview = currentTop?.ratings?.find(r => r.comment) || null;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Hero Section / Activity Feed */}
      {isLoggedIn ? (
        <Box sx={{ 
            py: { xs: 4, md: 8 }, 
            px: { xs: 2, sm: 4, md: 6 },
            background: (theme) => theme.palette.mode === 'dark' 
                ? `linear-gradient(180deg, ${alpha('#000', 0.4)} 0%, ${alpha('#000', 0)} 100%)` 
                : `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0)} 100%)`,
            borderBottom: '1px solid',
            borderColor: 'divider',
            mb: 4
        }}>
            <Container maxWidth={false} sx={{ px: { xs: 0, sm: 2, md: 4 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                        <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1, fontSize: { xs: '2rem', md: '3rem' } }}>{t('home.activity')}</Typography>
                        <Typography variant="body1" color="text.secondary">{t('home.activitySubtitle')}</Typography>
                    </Box>
                    <Button component={Link} to="/community" variant="outlined" sx={{ borderRadius: 2, textTransform: 'none' }}>
                        {t('home.viewFullFeed')}
                    </Button>
                </Box>

                {feedRatings.length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 4, bgcolor: 'action.hover', border: '2px dashed', borderColor: 'divider', elevation: 0 }}>
                        <Typography variant="h6">{t('home.quietFeed')}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('home.followMore')}</Typography>
                        <Button variant="contained" component={Link} to="/" size="small" sx={{ borderRadius: 2 }}>{t('home.exploreFlavors')}</Button>
                    </Paper>
                ) : (
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
                        {feedRatings.map(rating => (
                            <Card 
                                key={rating.id} 
                                component={Link}
                                to={`/flavor/${rating.flavor}`}
                                sx={{ 
                                    borderRadius: 3, 
                                    textDecoration: 'none',
                                    transition: 'all 0.2s ease', 
                                    '&:hover': { transform: 'translateY(-2px)', borderColor: 'primary.main', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' },
                                    bgcolor: (theme) => alpha(theme.palette.background.paper, 0.4),
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    color: 'inherit',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                            >
                                <CardContent sx={{ p: 2, flex: 1, '&:last-child': { pb: 2 } }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1 }}>
                                            <Avatar src={rating.user_avatar || undefined} sx={{ width: 22, height: 22, mr: 1 }}>
                                                {!rating.user_avatar && rating.user.charAt(0).toUpperCase()}
                                            </Avatar>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {rating.user}
                                            </Typography>
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', ml: 1, whiteSpace: 'nowrap' }}>
                                            {t('home.rated')} {formatDate(rating.created_at)}
                                        </Typography>
                                    </Box>
                                    
                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                        <Box 
                                            component="img" 
                                            src={rating.flavor_image || undefined} 
                                            sx={{ width: 44, height: 44, borderRadius: 1.5, objectFit: 'contain', bgcolor: 'action.hover', p: 0.5, border: '1px solid', borderColor: 'divider' }} 
                                        />
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 'bold', lineHeight: 1.2, mb: 0.5, fontSize: '0.85rem', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {rating.flavor_name}
                                            </Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <Typography variant="caption" sx={{ 
                                                    fontWeight: '900', 
                                                    color: 'primary.main', 
                                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                                                    px: 1,
                                                    py: 0.2,
                                                    borderRadius: 1,
                                                    fontSize: '0.75rem'
                                                }}>
                                                    {rating.score} / 10
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        ))}
                    </Box>
                )}
            </Container>
        </Box>
      ) : (
        <Paper 
            elevation={0}
            sx={{ 
                p: { xs: 4, md: 10 }, 
                mb: 4, 
                borderRadius: 0, 
                background: (theme) => theme.palette.mode === 'dark' 
                    ? `radial-gradient(circle at top right, ${alpha(theme.palette.primary.main, 0.15)}, transparent), linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)` 
                    : `radial-gradient(circle at top right, ${alpha(theme.palette.primary.main, 0.1)}, transparent), linear-gradient(135deg, #fdf6f7 0%, #f8e1e5 100%)`,
                textAlign: 'center',
                borderBottom: '1px solid',
                borderColor: 'divider',
                width: '100%',
                boxSizing: 'border-box',
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold', fontSize: { xs: '2.2rem', sm: '3rem', md: '4.5rem' }, overflowWrap: 'break-word', px: 2 }}>
                {t('hero.title')}
            </Typography>
            <Typography variant="h5" color="text.secondary" sx={{ mb: 4, maxWidth: 800, mx: 'auto', px: 2 }}>
                {t('hero.subtitle')}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap', px: 2 }}>
                <Button variant="contained" size="large" component={Link} to="/login" sx={{ px: 4, py: 1.5, borderRadius: 2 }}>
                    {t('hero.join')}
                </Button>
                <Button variant="outlined" size="large" component={Link} to="/about" sx={{ px: 4, py: 1.5, borderRadius: 2 }}>
                    {t('hero.whatIsThis')}
                </Button>
            </Box>
        </Paper>
      )}

      <Container maxWidth={false} sx={{ px: { xs: 2, sm: 4, md: 6 }, pb: 8 }}>
        
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', xl: 'row' }, gap: 6, mb: 10 }}>
            {/* Hall of Fame Carousel - SIDE BY SIDE */}
            {topFlavors.length > 0 && currentTop && (
                <Box sx={{ flex: { xs: '1 1 100%', xl: '1 1 65%' }, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <EmojiEventsIcon color="primary" sx={{ mr: 1, fontSize: '2rem' }} />
                            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{t('home.hallOfFame')}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton onClick={handlePrev} sx={{ border: '1px solid', borderColor: 'divider' }}><ChevronLeftIcon /></IconButton>
                            <IconButton onClick={handleNext} sx={{ border: '1px solid', borderColor: 'divider' }}><ChevronRightIcon /></IconButton>
                        </Box>
                    </Box>

                    <Card sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', md: 'row' }, 
                        height: { xs: 'auto', md: 500 },
                        borderRadius: 4,
                        overflow: 'hidden',
                        position: 'relative'
                    }}>
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
                                                    textDecoration: 'none'
                                                }}
                                            >
                        
                            <Box 
                                component="img"
                                src={currentTop.image_url || ''}
                                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                loading="lazy"
                            />
                        </Box>
                                            <CardContent sx={{ flex: 1, p: { xs: 3, sm: 4, md: 6 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                <Chip label={`${t('common.rank')} #${activeIndex + 1}`} color="primary" size="small" sx={{ width: 'fit-content', mb: 1, fontWeight: 'bold' }} />
                        
                            <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold', fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' } }}>
                                {currentTop.name}
                            </Typography>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 2, md: 3 }, flexWrap: 'wrap', gap: 2 }}>
                                <RatingBadge score={currentTop.average_rating || 0} size="large" />
                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                                    {currentTop.ratings.length} {t('common.reviews')}
                                </Typography>
                            </Box>

                            {featuredReview && (
                                <Box sx={{ 
                                    mt: 1, p: { xs: 2, md: 3 }, 
                                    bgcolor: (theme) => alpha(theme.palette.background.paper, 0.4), 
                                    backdropFilter: 'blur(8px)',
                                    borderRadius: 3, 
                                    border: '1px solid',
                                    borderColor: (theme) => alpha(theme.palette.text.primary, 0.05),
                                    position: 'relative' 
                                }}>
                                    <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1, fontSize: { xs: '0.9rem', md: '1.1rem' }, display: '-webkit-box', overflow: 'hidden', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3 }}>
                                        "{featuredReview.comment}"
                                    </Typography>
                                    <Link to={`/profile/${featuredReview.user}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Avatar src={featuredReview.user_avatar || undefined} sx={{ width: 24, height: 24, fontSize: '0.6rem', '&:hover': { opacity: 0.8 } }}>
                                            {!featuredReview.user_avatar && featuredReview.user.charAt(0)}
                                        </Avatar>
                                        <Typography variant="caption" color="text.secondary" sx={{ '&:hover': { color: 'primary.main' } }}>— {featuredReview.user}</Typography>
                                    </Link>
                                </Box>
                            )}

                            <Button 
                                variant="contained" 
                                component={Link} 
                                to={`/flavor/${currentTop.id}`}
                                sx={{ mt: { xs: 3, md: 4 }, width: { xs: '100%', sm: 'fit-content' }, px: 4, py: 1.5, borderRadius: 2 }}
                            >
                                {t('home.viewAllReviews')}
                            </Button>
                        </CardContent>
                    </Card>
                    
                    {/* Progress Indicators */}
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
                                    transition: 'all 0.3s ease'
                                }} 
                            />
                        ))}
                    </Box>
                </Box>
            )}

            {/* Recent Reviews - SIDE BY SIDE */}
            {recentReviews.length > 0 && (
                <Box sx={{ flex: { xs: '1 1 100%', xl: '1 1 35%' }, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>{t('home.communityVoice')}</Typography>
                    <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: 2, 
                        height: { xl: 500 }, 
                        overflowY: { xl: 'auto' },
                        pr: { xl: 1 },
                        '&::-webkit-scrollbar': { width: '6px' },
                        '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: '3px' }
                    }}>
                        {recentReviews.map(review => (
                            <Paper 
                                key={review.id} 
                                variant="outlined" 
                                sx={{ p: 2, borderRadius: 3, transition: 'border-color 0.2s', '&:hover': { borderColor: 'primary.main' } }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Link to={`/profile/${review.user}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}>
                                        <Avatar src={review.user_avatar || undefined} sx={{ width: 28, height: 28, mr: 1, '&:hover': { opacity: 0.8 } }}>
                                            {!review.user_avatar && review.user.charAt(0).toUpperCase()}
                                        </Avatar>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.8rem', '&:hover': { color: 'primary.main' } }}>{review.user}</Typography>
                                    </Link>
                                    <Box sx={{ flexGrow: 1 }} />
                                    <RatingBadge score={review.score} size="small" />
                                </Box>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                    {formatDate(review.created_at)} • on <Link to={`/flavor/${review.flavor}`} style={{ color: 'inherit', fontWeight: 'bold' }}>{review.flavor_name}</Link>
                                </Typography>
                                <Typography variant="body2" sx={{ fontStyle: 'italic', fontSize: '0.85rem', display: '-webkit-box', overflow: 'hidden', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}>
                                    "{review.comment}"
                                </Typography>
                            </Paper>
                        ))}
                        <Button component={Link} to="/community" variant="text" size="small" sx={{ alignSelf: 'center', mt: 1 }}>
                            {t('home.viewMoreReviews')}
                        </Button>
                    </Box>
                </Box>
            )}
        </Box>

        {/* Newest Arrivals */}
        {newestFlavors.length > 0 && (
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>{t('home.newArrivals')}</Typography>
                <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: {
                        xs: 'repeat(2, 1fr)',
                        sm: 'repeat(3, 1fr)',
                        md: 'repeat(4, 1fr)',
                        lg: 'repeat(5, 1fr)',
                        xl: 'repeat(6, 1fr)'
                    }, 
                    gap: 2 
                }}>
                    {newestFlavors.map(flavor => (
                        <Card key={flavor.id} sx={{ transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' }, borderRadius: 3 }}>
                            <Link to={`/flavor/${flavor.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <Box sx={{ aspectRatio: '1/1', overflow: 'hidden', bgcolor: 'action.hover' }}>
                                    <Box 
                                        component="img" 
                                        src={flavor.image_url || undefined} 
                                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                        loading="lazy"
                                    />
                                </Box>
                                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.85rem', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {flavor.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">{flavor.category_name}</Typography>
                                </CardContent>
                            </Link>
                        </Card>
                    ))}
                </Box>
            </Box>
        )}
      </Container>
    </Box>
  );
};

export default MainPage;
