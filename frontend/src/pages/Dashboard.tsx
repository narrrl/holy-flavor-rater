import React, { useEffect, useState } from 'react';
import { 
  Typography, 
  Card, 
  CardContent, 
  Box, 
  Rating as MuiRating, 
  Button, 
  TextField, 
  Container, 
  CircularProgress, 
  Avatar,
  Tabs,
  Tab
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Link } from 'react-router-dom';
import api from '../api';
import { useTitle } from '../hooks/useTitle';

interface DashboardData {
    user: { username: string, avatar: string | null };
    rated_count: number;
    missing_count: number;
    missing_flavors: any[];
    my_ratings: any[];
}

const Dashboard: React.FC = () => {
  useTitle('Dashboard');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  const shareUrl = data ? `${window.location.origin}/profile/${data.user.username}` : '';

  const copyToClipboard = () => {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
  };

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

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  if (!data) return <Typography>Please login to view dashboard.</Typography>;

  // Helper to group by category
  const groupBy = (array: any[]) => {
    return array.reduce((result, currentValue) => {
      const groupKey = currentValue.flavor?.category_name || currentValue.category_name;
      (result[groupKey] = result[groupKey] || []).push(currentValue);
      return result;
    }, {});
  };

  const ratedGrouped = groupBy(data.my_ratings);
  const missingGrouped = groupBy(data.missing_flavors);

  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, sm: 4, md: 6 }, py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar src={data.user.avatar || undefined} sx={{ width: 48, height: 48 }}>
                  {!data.user.avatar && data.user.username.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="h4">Dashboard</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField 
                size="small" 
                value={shareUrl} 
                slotProps={{ input: { readOnly: true } }}
                sx={{ width: { xs: '100%', sm: 300 } }}
              />
              <Button variant="contained" startIcon={<ContentCopyIcon />} onClick={copyToClipboard}>
                  Share
              </Button>
          </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label={`My Ratings (${data.rated_count})`} />
          <Tab label={`Missing (${data.missing_count})`} />
        </Tabs>
      </Box>

      {activeTab === 0 ? (
        <Box>
          {Object.keys(ratedGrouped).length === 0 ? (
            <Typography color="text.secondary">You haven't rated any flavors yet.</Typography>
          ) : (
            Object.entries(ratedGrouped).map(([category, ratings]: [string, any]) => (
              <Box key={category} sx={{ mb: 4 }}>
                <Typography variant="h6" color="secondary" gutterBottom sx={{ fontWeight: 'bold' }}>{category}</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {ratings.map((rating: any) => (
                    <Card key={rating.id} sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 30%', lg: '1 1 23%' }, minWidth: 280 }}>
                      <CardContent sx={{ display: 'flex', gap: 2 }}>
                        {rating.flavor_image && (
                          <Box component="img" src={rating.flavor_image} sx={{ width: 50, height: 50, objectFit: 'contain' }} />
                        )}
                        <Box sx={{ flex: 1 }}>
                          <Link to={`/flavor/${rating.flavor}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', '&:hover': { color: 'primary.main' } }}>
                              {rating.flavor_name}
                            </Typography>
                          </Link>
                          <Box sx={{ display: 'flex', alignItems: 'center', my: 0.5 }}>
                            <MuiRating value={rating.score} readOnly max={10} size="small" />
                            <Typography variant="caption" sx={{ ml: 1 }}>{rating.score}/10</Typography>
                          </Box>
                          {rating.comment && (
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 200 }}>
                              "{rating.comment}"
                            </Typography>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Box>
            ))
          )}
        </Box>
      ) : (
        <Box>
          {Object.keys(missingGrouped).length === 0 ? (
            <Typography color="text.secondary">Amazing! You've rated everything!</Typography>
          ) : (
            Object.entries(missingGrouped).map(([category, flavors]: [string, any]) => (
              <Box key={category} sx={{ mb: 4 }}>
                <Typography variant="h6" color="primary" gutterBottom sx={{ fontWeight: 'bold' }}>{category}</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {flavors.map((flavor: any) => (
                    <Card key={flavor.id} sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 30%', lg: '1 1 23%' }, minWidth: 280 }}>
                      <CardContent sx={{ display: 'flex', gap: 2 }}>
                        {flavor.image_url && (
                          <Box component="img" src={flavor.image_url} sx={{ width: 50, height: 50, objectFit: 'contain' }} />
                        )}
                        <Box sx={{ flex: 1 }}>
                          <Link to={`/flavor/${flavor.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', '&:hover': { color: 'primary.main' } }}>
                              {flavor.name}
                            </Typography>
                          </Link>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            {flavor.description.substring(0, 60)}...
                          </Typography>
                          {flavor.shop_url && (
                            <Button size="small" variant="text" component="a" href={flavor.shop_url} target="_blank" sx={{ fontSize: '0.7rem', p: 0 }}>
                              Buy Now
                            </Button>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Box>
            ))
          )}
        </Box>
      )}
    </Container>
  );
};

export default Dashboard;
