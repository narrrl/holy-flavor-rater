import React, { useEffect, useState } from 'react';
import { Typography, Card, CardContent, Box, Rating as MuiRating } from '@mui/material';
import api from '../api';

interface DashboardData {
    rated_count: number;
    missing_count: number;
    missing_flavors: any[];
    my_ratings: any[];
}

const Dashboard: React.FC = () => {
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
                        <CardContent>
                            <Typography variant="h6">{rating.flavor_name}</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', my: 1 }}>
                                <MuiRating value={rating.score} readOnly max={10} size="small" />
                                <Typography variant="body2" sx={{ ml: 1 }}>{rating.score}/10</Typography>
                            </Box>
                            {rating.comment && (
                                <Typography variant="body2" color="text.secondary">
                                    "{rating.comment}"
                                </Typography>
                            )}
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
                        <CardContent>
                            <Typography variant="h6">{flavor.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{flavor.category_name}</Typography>
                            <Typography variant="body2">{flavor.description}</Typography>
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
