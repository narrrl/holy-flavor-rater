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
  Chip
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import StarIcon from '@mui/icons-material/Star';
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
}

interface Review {
    id: number;
    user: string;
    flavor_name: string;
    flavor_image: string | null;
    score: number;
    comment: string;
    created_at: string;
    flavor: number;
}

const CategoryList: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [topFlavors, setTopFlavors] = useState<Flavor[]>([]);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [allFlavors, setAllFlavors] = useState<Flavor[]>([]);
  const [loading, setLoading] = useState(true);
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

  useTitle(query ? `Search: ${query}` : 'Holy Flavors Archive');

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  // --- SEARCH VIEW ---
  if (query) {
      const filteredFlavors = allFlavors.filter(f => 
          f.name.toLowerCase().includes(query.toLowerCase()) ||
          f.description.toLowerCase().includes(query.toLowerCase()) ||
          f.category_name.toLowerCase().includes(query.toLowerCase())
      );

      return (
          <Box>
              <Typography variant="h4" gutterBottom>Search Results for "{query}"</Typography>
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
                                      <Box component="img" src={flavor.image_url} sx={{ width: '100%', height: 200, objectFit: 'contain', p: 2, bgcolor: 'rgba(255,255,255,0.05)' }} />
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
          </Box>
      );
  }

  // --- HOME VIEW ---
  return (
    <Box sx={{ mx: { xs: -2, sm: -4, md: -6 } }}>
      {/* Hero Section */}
      <Paper 
        elevation={0}
        sx={{ 
            p: { xs: 4, md: 8 }, 
            mb: 8, 
            borderRadius: 0, 
            background: (theme) => theme.palette.mode === 'dark' 
                ? 'linear-gradient(45deg, #1a1a2e 30%, #16213e 90%)' 
                : 'linear-gradient(45deg, #fdf6f7 30%, #f8e1e5 90%)',
            textAlign: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            width: '100%',
        }}
      >
        <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold', fontSize: { xs: '2.5rem', md: '4rem' } }}>
            The Ultimate Holy Archive
        </Typography>
        <Typography variant="h5" color="text.secondary" sx={{ mb: 4, maxWidth: 800, mx: 'auto' }}>
            Browse every flavor ever released, discover new favorites, and share your ratings with the community.
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Button variant="contained" size="large" component={Link} to="/login" sx={{ px: 4, py: 1.5, borderRadius: 2 }}>
                Join the Community
            </Button>
            <Button variant="outlined" size="large" onClick={() => {
                const element = document.getElementById('categories');
                element?.scrollIntoView({ behavior: 'smooth' });
            }} sx={{ px: 4, py: 1.5, borderRadius: 2 }}>
                Explore Categories
            </Button>
        </Box>
      </Paper>

      <Box sx={{ px: { xs: 2, sm: 4, md: 6 } }}>
        {/* Top Rated Flavors */}
        {topFlavors.length > 0 && (
          <Box sx={{ mb: 8 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                  <StarIcon color="primary" sx={{ mr: 1, fontSize: '2rem' }} />
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Hall of Fame</Typography>
                  <Chip label="Top 10" color="primary" sx={{ ml: 2 }} size="small" />
              </Box>
              <Box sx={{ display: 'flex', gap: 3, overflowX: 'auto', pb: 2, px: 1, '&::-webkit-scrollbar': { height: 8 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 4 } }}>
                  {topFlavors.map(flavor => (
                      <Box key={flavor.id} sx={{ flex: '0 0 280px' }}>
                          <Card sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-8px)' } }}>
                              <Box component={Link} to={`/flavor/${flavor.id}`} sx={{ textDecoration: 'none', color: 'inherit' }}>
                                  {flavor.image_url && (
                                      <Box component="img" src={flavor.image_url} sx={{ width: '100%', height: 180, objectFit: 'contain', p: 2, bgcolor: 'rgba(255,255,255,0.03)' }} />
                                  )}
                                  <CardContent>
                                      <Typography variant="h6" noWrap>{flavor.name}</Typography>
                                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                          <MuiRating value={flavor.average_rating || 0} readOnly precision={0.5} max={10} size="small" />
                                          <Typography variant="body2" sx={{ ml: 1, fontWeight: 'bold' }}>
                                              {(flavor.average_rating || 0).toFixed(1)}
                                          </Typography>
                                      </Box>
                                  </CardContent>
                              </Box>
                          </Card>
                      </Box>
                  ))}
              </Box>
          </Box>
      )}

      {/* Categories Grid */}
      <Box id="categories" sx={{ mb: 8 }}>
        <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>Browse by Category</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {categories.map(category => (
            <Box key={category.id} sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', lg: '1 1 30%' }, minWidth: 280 }}>
                <Link to={`/category/${category.slug}`} style={{ textDecoration: 'none' }}>
                <Card sx={{ 
                    height: 120, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    transition: 'all 0.3s',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                        transform: 'scale(1.02)',
                        bgcolor: 'primary.main',
                        '& .cat-name': { color: 'white' }
                    }
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
                        sx={{ 
                            p: 3, 
                            mb: 3, 
                            breakInside: 'avoid', 
                            borderRadius: 3,
                            transition: 'border-color 0.2s',
                            '&:hover': { borderColor: 'primary.main' }
                        }}
                      >
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                              <Avatar sx={{ width: 32, height: 32, mr: 1 }}>{review.user.charAt(0).toUpperCase()}</Avatar>
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
                          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                              "{review.comment}"
                          </Typography>
                      </Paper>
                  ))}
              </Box>
          </Box>
      )}
    </Box>
  );
};

export default CategoryList;
