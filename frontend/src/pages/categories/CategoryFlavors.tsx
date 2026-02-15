import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Rating as MuiRating, 
  TextField, 
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
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
  shop_url: string | null;
}

const CategoryFlavors: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [categoryName, setCategoryName] = useState('');
  useTitle(categoryName || 'Flavors');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchFlavors = async () => {
      try {
        const res = await api.get(`flavors/?category__slug=${slug}`);
        setFlavors(res.data);
        if (res.data.length > 0) {
          setCategoryName(res.data[0].category_name);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFlavors();
  }, [slug]);

  const filteredFlavors = flavors.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.description.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Typography>Loading Flavors...</Typography>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>{categoryName || 'Flavors'}</Typography>
      
      <TextField
        fullWidth
        variant="outlined"
        placeholder={`Search ${categoryName} flavors...`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 4 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {filteredFlavors.map(flavor => (
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 30%', lg: '1 1 23%', xl: '1 1 18%' }, minWidth: 280 }} key={flavor.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.02)' } }}>
              <Box component={Link} to={`/flavor/${flavor.id}`} sx={{ textDecoration: 'none', color: 'inherit', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                {!flavor.is_available && (
                    <Box sx={{ position: 'absolute', top: 10, right: 10, bgcolor: 'error.main', color: 'white', px: 1, borderRadius: 1, fontSize: '0.75rem', zIndex: 1 }}>
                        Out of Stock
                    </Box>
                )}
                {flavor.image_url && (
                    <Box component="img" src={flavor.image_url} sx={{ width: '100%', height: 200, objectFit: 'contain', p: 2, bgcolor: 'rgba(255,255,255,0.05)' }} />
                )}
                <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6">{flavor.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{flavor.description.substring(0, 100)}...</Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <MuiRating value={flavor.average_rating || 0} readOnly precision={0.5} max={10} size="small" />
                        <Typography variant="body2" sx={{ ml: 1 }}>({(flavor.average_rating || 0).toFixed(1)})</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">{flavor.ratings.length} reviews</Typography>
                </CardContent>
              </Box>
            </Card>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default CategoryFlavors;
