import React, { useEffect, useState } from 'react';
import { 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Rating as MuiRating,
  CircularProgress
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
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

const CategoryList: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  
  const query = new URLSearchParams(location.search).get('q') || '';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (query) {
            const res = await api.get(`flavors/`);
            setFlavors(res.data);
        } else {
            const res = await api.get('categories/');
            setCategories(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [query]);

  useTitle(query ? `Search: ${query}` : 'Catalog');

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  if (query) {
      const filteredFlavors = flavors.filter(f => 
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

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>Catalog</Typography>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {categories.map(category => (
          <Box key={category.id} sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', lg: '1 1 23%' }, minWidth: 280 }}>
            <Link to={`/category/${category.slug}`} style={{ textDecoration: 'none' }}>
              <Card sx={{ 
                height: 150, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'scale(1.02)',
                  cursor: 'pointer',
                  bgcolor: 'action.hover'
                }
              }}>
                <CardContent>
                  <Typography variant="h4" color="primary">{category.name}</Typography>
                </CardContent>
              </Card>
            </Link>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default CategoryList;
