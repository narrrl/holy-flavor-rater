import React, { useEffect, useState } from 'react';
import { 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  CircularProgress,
  Button,
  Avatar,
  Rating as MuiRating,
  Paper,
  Chip,
  Container,
  IconButton,
  useMediaQuery
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import StarIcon from '@mui/icons-material/Star';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import api from '../api';
import { useTitle } from '../hooks/useTitle';

interface Category {
  id: number;
  name: string;
  slug: string;
}

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

const CategoryList: React.FC = () => {
  const isMobileSize = useMediaQuery('(max-width:600px)');
  const [categories, setCategories] = useState<Category[]>([]);
  const [topFlavors, setTopFlavors] = useState<Flavor[]>([]);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [allFlavors, setAllFlavors] = useState<Flavor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const location = useLocation();
  
  const query = new URLSearchParams(location.search).get('q') || '';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (query) {
            const res = await api.get(`flavors/`);
            setAllFlavors(res.data);
        } else {
            const [catRes, topRes, recentRes] = await Promise.all([
                api.get('categories/'),
                api.get('flavors/top/'),
                api.get('ratings/recent/')
            ]);
            setCategories(catRes.data);
            setTopFlavors(topRes.data);
            setRecentReviews(recentRes.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [query]);

  // Auto-rotate
  useEffect(() => {
      if (topFlavors.length > 0 && !query) {
          const timer = setInterval(() => {
              setActiveIndex(prev => (prev + 1) % topFlavors.length);
          }, 6000);
          return () => clearInterval(timer);
      }
  }, [topFlavors, query]);

  useTitle(query ? `Search: ${query}` : 'Holy Flavors Archive');

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  const handlePrev = () => setActiveIndex(prev => (prev - 1 + topFlavors.length) % topFlavors.length);
  const handleNext = () => setActiveIndex(prev => (prev + 1) % topFlavors.length);

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

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {filteredFlavors.map(flavor => (
                      <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 30%', lg: '1 1 23%', xl: '1 1 18%' }, minWidth: 280 }} key={flavor.id}>
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
                                          <MuiRating value={flavor.average_rating || 0} readOnly precision={0.5} max={10} size="small" />
                                          <Typography variant="caption" sx={{ ml: 1 }}>({(flavor.average_rating || 0).toFixed(1)})</Typography>
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
      {/* Hero Section */}
      <Paper 
        elevation={0}
        sx={{ 
            p: { xs: 4, md: 10 }, 
            mb: 8, 
            borderRadius: 0, 
            background: (theme) => theme.palette.mode === 'dark' 
                ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' 
                : 'linear-gradient(135deg, #fdf6f7 0%, #f8e1e5 100%)',
            textAlign: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            width: '100%',
            boxSizing: 'border-box',
            overflow: 'hidden'
        }}
      >
        <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold', fontSize: { xs: '2.2rem', sm: '3rem', md: '4.5rem' }, overflowWrap: 'break-word', px: 2 }}>
            The Ultimate Holy Archive
        </Typography>
        <Typography variant="h5" color="text.secondary" sx={{ mb: 4, maxWidth: 800, mx: 'auto', px: 2 }}>
            Browse every flavor ever released, discover new favorites, and share your ratings with the community.
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap', px: 2 }}>
            <Button variant="contained" size="large" component={Link} to="/login" sx={{ px: 4, py: 1.5, borderRadius: 2 }}>
                Join Community
            </Button>
            <Button variant="outlined" size="large" onClick={() => document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' })} sx={{ px: 4, py: 1.5, borderRadius: 2 }}>
                Explore Categories
            </Button>
        </Box>
      </Paper>

      <Container maxWidth={false} sx={{ px: { xs: 2, sm: 4, md: 6 }, pb: 8 }}>
        
        {/* Hall of Fame Carousel */}
        {topFlavors.length > 0 && currentTop && (
            <Box sx={{ mb: 12 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <StarIcon color="primary" sx={{ mr: 1, fontSize: '2rem' }} />
                        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Hall of Fame</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton onClick={handlePrev} sx={{ border: '1px solid', borderColor: 'divider' }}><ChevronLeftIcon /></IconButton>
                        <IconButton onClick={handleNext} sx={{ border: '1px solid', borderColor: 'divider' }}><ChevronRightIcon /></IconButton>
                    </Box>
                </Box>

                <Card sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', md: 'row' }, 
                    minHeight: { xs: 'auto', md: 400 },
                    borderRadius: 4,
                    overflow: 'hidden',
                    position: 'relative'
                }}>
                    <Box 
                        component={Link}
                        to={`/flavor/${currentTop.id}`}
                        sx={{ 
                            width: { xs: '100%', md: '45%' }, 
                            aspectRatio: { xs: '16/9', md: '1/1' },
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
                        <Chip label={`Rank #${activeIndex + 1}`} color="primary" size="small" sx={{ width: 'fit-content', mb: 1, fontWeight: 'bold' }} />
                        <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold', fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' } }}>
                            {currentTop.name}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 2, md: 3 }, flexWrap: 'wrap' }}>
                            <MuiRating value={currentTop.average_rating || 0} readOnly precision={0.5} max={10} size={isMobileSize ? "medium" : "large"} />
                            <Typography variant="h5" sx={{ ml: { xs: 0, sm: 2 }, mt: { xs: 1, sm: 0 }, fontWeight: 'bold', fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
                                {(currentTop.average_rating || 0).toFixed(1)} / 10
                            </Typography>
                        </Box>

                        {featuredReview && (
                            <Box sx={{ mt: 1, p: { xs: 2, md: 3 }, bgcolor: 'action.hover', borderRadius: 3, position: 'relative' }}>
                                <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1, fontSize: { xs: '0.9rem', md: '1.1rem' }, display: '-webkit-box', overflow: 'hidden', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3 }}>
                                    "{featuredReview.comment}"
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Avatar src={featuredReview.user_avatar || undefined} sx={{ width: 20, height: 24, fontSize: '0.6rem' }}>
                                        {!featuredReview.user_avatar && featuredReview.user.charAt(0)}
                                    </Avatar>
                                    <Typography variant="caption" color="text.secondary">— {featuredReview.user}</Typography>
                                </Box>
                            </Box>
                        )}

                        <Button 
                            variant="contained" 
                            component={Link} 
                            to={`/flavor/${currentTop.id}`}
                            sx={{ mt: { xs: 3, md: 4 }, width: { xs: '100%', sm: 'fit-content' }, px: 4, py: 1.5, borderRadius: 2 }}
                        >
                            View All Reviews
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

        {/* Categories Grid */}
        <Box id="categories" sx={{ mb: 10 }}>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>Browse by Category</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {categories.map(category => (
                <Box key={category.id} sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', lg: '1 1 23%' }, minWidth: 280 }}>
                    <Link to={`/category/${category.slug}`} style={{ textDecoration: 'none' }}>
                    <Card sx={{ 
                        height: 120, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        transition: 'all 0.3s',
                        '&:hover': { transform: 'scale(1.02)', bgcolor: 'primary.main', '& .cat-name': { color: 'white' } }
                    }}>
                        <CardContent>
                            <Typography variant="h5" className="cat-name" color="primary" sx={{ fontWeight: 'bold' }}>{category.name}</Typography>
                        </CardContent>
                    </Card>
                    </Link>
                </Box>
                ))}
            </Box>
        </Box>

        {/* Recent Reviews */}
        {recentReviews.length > 0 && (
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>Community Voice</Typography>
                <Box sx={{ columns: { xs: 1, sm: 2, md: 3 }, columnGap: 3 }}>
                    {recentReviews.map(review => (
                        <Paper 
                            key={review.id} 
                            variant="outlined" 
                            sx={{ p: 3, mb: 3, breakInside: 'avoid', borderRadius: 3, transition: 'border-color 0.2s', '&:hover': { borderColor: 'primary.main' } }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Avatar src={review.user_avatar || undefined} sx={{ width: 32, height: 32, mr: 1 }}>
                                    {!review.user_avatar && review.user.charAt(0).toUpperCase()}
                                </Avatar>
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{review.user}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        on <Link to={`/flavor/${review.flavor}`} style={{ color: 'inherit' }}>{review.flavor_name}</Link>
                                    </Typography>
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <MuiRating value={review.score} readOnly size="small" max={10} />
                                <Typography variant="caption" sx={{ ml: 1, fontWeight: 'bold' }}>{review.score}/10</Typography>
                            </Box>
                            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>"{review.comment}"</Typography>
                        </Paper>
                    ))}
                </Box>
            </Box>
        )}
      </Container>
    </Box>
  );
};

export default CategoryList;
