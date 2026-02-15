import React, { useEffect, useState } from 'react';
import { 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  TextField,
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { Link } from 'react-router-dom';
import api from '../api';
import { useTitle } from '../hooks/useTitle';

interface Category {
  id: number;
  name: string;
  slug: string;
}

const CategoryList: React.FC = () => {
  useTitle('Categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('categories/');
        setCategories(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Typography>Loading Categories...</Typography>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Flavor Categories</Typography>
      
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search categories..."
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
        {filteredCategories.map(category => (
          <Box key={category.id} sx={{ flex: '1 1 45%', minWidth: 280 }}>
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
