import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Rating as MuiRating,
  CircularProgress,
  Container,
  Button
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../../api';
import { useTitle } from '../../hooks/useTitle';

interface Rating {
    id: number;
    user: string;
    score: number;
    comment: string;
    created_at: string;
}

interface Flavor {
  id: number;
  name: string;
  category_name: string;
  description: string;
  average_rating: number;
  user_rating: number | null;
  ratings: Rating[];
  image_url: string | null;
  is_available: boolean;
  is_legacy: boolean;
  shop_url: string | null;
}

const CategoryFlavors: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFlavors = async () => {
      setLoading(true);
      try {
        const res = await api.get(`flavors/?category__slug=${slug}`);
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setFlavors(data);
        if (data.length > 0) {
          setCategoryName(data[0].category_name);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFlavors();
  }, [slug]);

  useTitle(categoryName || 'Flavors');

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, sm: 4, md: 6 }, py: 4 }}>
      <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom>{categoryName || 'Flavors'}</Typography>
          <Button 
            variant="outlined" 
            component={Link} 
            to="/" 
            startIcon={<ArrowBackIcon />}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Back to all categories
          </Button>
      </Box>

      <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(auto-fill, minmax(280px, 1fr))',
              lg: 'repeat(auto-fill, minmax(240px, 1fr))'
          },
          gap: 3 
      }}>
        {flavors.map(flavor => (
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
                        />
                    </Box>
                )}
                <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ fontSize: '1.1rem', mb: 1 }}>{flavor.name}</Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <MuiRating value={flavor.average_rating || 0} readOnly precision={0.5} max={10} size="small" />
                        <Typography variant="caption" sx={{ ml: 1 }}>({(flavor.average_rating || 0).toFixed(1)})</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">{flavor.ratings.length} reviews</Typography>
                </CardContent>
              </Box>
            </Card>
          </Box>
        ))}
      </Box>
    </Container>
  );
};

export default CategoryFlavors;
