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
  Tab,
  IconButton
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

  // Robust grouping helper
  const groupBy = (array: any[]) => {
    return array.reduce((result, currentValue) => {
      // Use category_name from either the rating or the flavor object
      const groupKey = currentValue.category_name || currentValue.flavor?.category_name || 'Other';
      (result[groupKey] = result[groupKey] || []).push(currentValue);
      return result;
    }, {});
  };

  const ratedGrouped = groupBy(data.my_ratings);
  const missingGrouped = groupBy(data.missing_flavors);

  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, sm: 4, md: 6 }, py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 6, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar src={data.user.avatar || undefined} sx={{ width: 64, height: 64, border: '3px solid', borderColor: 'primary.main' }}>
                  {!data.user.avatar && data.user.username.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Dashboard</Typography>
                <Typography variant="body2" color="text.secondary">Welcome back, {data.user.username}!</Typography>
              </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'background.paper', p: 1, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" sx={{ ml: 1, mr: 2, display: { xs: 'none', md: 'block' } }}>Share Profile:</Typography>
              <TextField 
                size="small" 
                variant="standard"
                value={shareUrl} 
                slotProps={{ input: { readOnly: true, disableUnderline: true } }}
                sx={{ width: { xs: 150, sm: 250 }, px: 1 }}
              />
              <IconButton size="small" onClick={copyToClipboard} color="primary">
                  <ContentCopyIcon fontSize="small" />
              </IconButton>
          </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} textColor="primary" indicatorColor="primary">
          <Tab label={`My Ratings (${data.rated_count})`} sx={{ fontWeight: 'bold' }} />
          <Tab label={`Missing (${data.missing_count})`} sx={{ fontWeight: 'bold' }} />
        </Tabs>
      </Box>

      {activeTab === 0 ? (
        <Box>
          {Object.keys(ratedGrouped).length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography color="text.secondary">You haven't rated any flavors yet.</Typography>
                <Button component={Link} to="/" sx={{ mt: 2 }}>Go explore flavors</Button>
            </Box>
          ) : (
            Object.entries(ratedGrouped).map(([category, items]: [string, any]) => (
              <Box key={category} sx={{ mb: 6 }}>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                    {category}
                    <Box sx={{ ml: 2, flexGrow: 1, height: '1px', bgcolor: 'divider' }} />
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {items.map((rating: any) => (
                    <Card key={rating.id} sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 30%', lg: '1 1 23%' }, minWidth: 280, transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.02)' } }}>
                      <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        {rating.flavor_image && (
                          <Box 
                            sx={{ 
                                width: 60, 
                                height: 60, 
                                minWidth: 60,
                                aspectRatio: '1/1', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                bgcolor: 'action.hover',
                                p: 0.5,
                                borderRadius: 1,
                                overflow: 'hidden'
                            }}
                          >
                            <Box 
                                component="img" 
                                src={rating.flavor_image} 
                                sx={{ 
                                    maxWidth: '100%', 
                                    maxHeight: '100%', 
                                    objectFit: 'contain'
                                }} 
                            />
                          </Box>
                        )}
                        <Box sx={{ flex: 1 }}>
                          <Link to={`/flavor/${rating.flavor}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', '&:hover': { color: 'primary.main' } }}>
                              {rating.flavor_name}
                            </Typography>
                          </Link>
                          <Box sx={{ display: 'flex', alignItems: 'center', my: 0.5 }}>
                            <MuiRating value={rating.score} readOnly max={10} size="small" />
                            <Typography variant="caption" sx={{ ml: 1, fontWeight: 'bold' }}>{rating.score}/10</Typography>
                          </Box>
                          {rating.comment && (
                            <Typography variant="caption" color="text.secondary" sx={{ 
                                display: '-webkit-box',
                                overflow: 'hidden',
                                WebkitBoxOrient: 'vertical',
                                WebkitLineClamp: 2,
                                fontStyle: 'italic'
                            }}>
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
            <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h5" color="primary">Amazing! You've rated everything! 🏆</Typography>
            </Box>
          ) : (
            Object.entries(missingGrouped).map(([category, flavors]: [string, any]) => (
              <Box key={category} sx={{ mb: 6 }}>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                    {category}
                    <Box sx={{ ml: 2, flexGrow: 1, height: '1px', bgcolor: 'divider' }} />
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {flavors.map((flavor: any) => (
                    <Card key={flavor.id} sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 30%', lg: '1 1 23%' }, minWidth: 280, transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.02)' } }}>
                      <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        {flavor.image_url && (
                          <Box 
                            sx={{ 
                                width: 60, 
                                height: 60, 
                                minWidth: 60,
                                aspectRatio: '1/1', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                bgcolor: 'action.hover',
                                p: 0.5,
                                borderRadius: 1,
                                overflow: 'hidden'
                            }}
                          >
                            <Box 
                                component="img" 
                                src={flavor.image_url} 
                                sx={{ 
                                    maxWidth: '100%', 
                                    maxHeight: '100%', 
                                    objectFit: 'contain'
                                }} 
                            />
                          </Box>
                        )}
                        <Box sx={{ flex: 1 }}>
                          <Link to={`/flavor/${flavor.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', '&:hover': { color: 'primary.main' } }}>
                              {flavor.name}
                            </Typography>
                          </Link>
                          <Typography variant="caption" color="text.secondary" sx={{ 
                              display: '-webkit-box',
                              overflow: 'hidden',
                              WebkitBoxOrient: 'vertical',
                              WebkitLineClamp: 2,
                              mb: 1
                          }}>
                            {flavor.description}
                          </Typography>
                          {flavor.shop_url && (
                            <Button size="small" variant="outlined" component="a" href={flavor.shop_url} target="_blank" sx={{ fontSize: '0.65rem', py: 0, borderRadius: 1.5 }}>
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
