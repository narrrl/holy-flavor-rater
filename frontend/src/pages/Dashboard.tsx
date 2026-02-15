import React, { useEffect, useState } from 'react';
import { Typography, Card, CardContent, Box, Rating as MuiRating, Button } from '@mui/material';
import api from '../api';
import { useTitle } from '../hooks/useTitle';

interface DashboardData {
    rated_count: number;
    missing_count: number;
    missing_flavors: any[];
    my_ratings: any[];
}

const Dashboard: React.FC = () => {
  useTitle('Dashboard');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('users/dashboard/');
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <Typography>Loading...</Typography>;
  if (!data) return <Typography>Please login to view dashboard.</Typography>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Personal Dashboard</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        <Box sx={{ flex: '1 1 45%', minWidth: 300 }}>
            <Typography variant="h5" color="secondary" gutterBottom>My Ratings ({data.rated_count})</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {data.my_ratings.map((rating: any) => (
                    <Card key={rating.id}>
                        <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                            {rating.flavor_image && (
                                <Box 
                                    component="img" 
                                    src={rating.flavor_image} 
                                    sx={{ width: 60, height: 60, objectFit: 'contain', bgcolor: 'rgba(255,255,255,0.05)', p: 0.5, borderRadius: 1 }} 
                                />
                            )}
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="h6" sx={{ fontSize: '1rem' }}>{rating.flavor_name}</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', my: 0.5 }}>
                                    <MuiRating value={rating.score} readOnly max={10} size="small" />
                                    <Typography variant="body2" sx={{ ml: 1, fontSize: '0.8rem' }}>{rating.score}/10</Typography>
                                </Box>
                                {rating.comment && (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                                        "{rating.comment}"
                                    </Typography>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                ))}
            </Box>
        </Box>
        <Box sx={{ flex: '1 1 45%', minWidth: 300 }}>
            <Typography variant="h5" color="primary" gutterBottom>Missing Flavors ({data.missing_count})</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {data.missing_flavors.map((flavor: any) => (
                    <Card key={flavor.id}>
                        <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                            {flavor.image_url && (
                                <Box 
                                    component="img" 
                                    src={flavor.image_url} 
                                    sx={{ width: 60, height: 60, objectFit: 'contain', bgcolor: 'rgba(255,255,255,0.05)', p: 0.5, borderRadius: 1 }} 
                                />
                            )}
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="h6" sx={{ fontSize: '1rem' }}>{flavor.name}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{flavor.category_name}</Typography>
                                <Typography variant="body2" sx={{ fontSize: '0.85rem', mb: 1 }}>{flavor.description.substring(0, 100)}...</Typography>
                                {flavor.shop_url && (
                                    <Button 
                                        variant="outlined" 
                                        size="small" 
                                        component="a" 
                                        href={flavor.shop_url} 
                                        target="_blank" 
                                        sx={{ fontSize: '0.65rem', py: 0 }}
                                    >
                                        Buy Now
                                    </Button>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                ))}
            </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
