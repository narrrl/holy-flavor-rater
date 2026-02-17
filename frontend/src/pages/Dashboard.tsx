import React, { useEffect, useState } from 'react';
import { 
  Typography, 
  Card, 
  CardContent, 
  Box, 
  Button, 
  TextField, 
  Container, 
  CircularProgress, 
  Avatar,
  Tabs,
  Tab,
  IconButton,
  Tooltip
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  useTitle(t('nav.dashboard'));
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  const shareUrl = data ? `${window.location.origin}/profile/${data.user.username}` : '';

  const copyToClipboard = () => {
      navigator.clipboard.writeText(shareUrl);
      alert(t('dashboard.copySuccess'));
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

  const groupBy = (array: any[]) => {
    return array.reduce((result, currentValue) => {
      const groupKey = currentValue.category_name || currentValue.flavor?.category_name || 'Other';
      (result[groupKey] = result[groupKey] || []).push(currentValue);
      return result;
    }, {});
  };

  const ratedGrouped = groupBy(data.my_ratings);
  const missingGrouped = groupBy(data.missing_flavors);

  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, sm: 4, md: 6 }, py: 4 }}>
      <Button 
        variant="outlined" 
        component={Link} 
        to="/" 
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 4, textTransform: 'none', borderRadius: 2 }}
      >
        {t('common.backToHome')}
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 6, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar src={data.user.avatar || undefined} sx={{ width: 64, height: 64, border: '3px solid', borderColor: 'primary.main' }}>
                  {!data.user.avatar && data.user.username.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{t('nav.dashboard')}</Typography>
                <Typography variant="body2" color="text.secondary">{t('dashboard.welcome', { username: data.user.username })}</Typography>
              </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'background.paper', p: 1, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" sx={{ ml: 1, mr: 2, display: { xs: 'none', md: 'block' } }}>{t('dashboard.shareProfile')}</Typography>
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
          <Tab label={`${t('dashboard.myRatings')} (${data.rated_count})`} sx={{ fontWeight: 'bold' }} />
          <Tab label={`${t('dashboard.missing')} (${data.missing_count})`} sx={{ fontWeight: 'bold' }} />
        </Tabs>
      </Box>

      {activeTab === 0 ? (
        <Box>
          {Object.keys(ratedGrouped).length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography color="text.secondary">{t('dashboard.noRatings')}</Typography>
                <Button component={Link} to="/" sx={{ mt: 2 }}>{t('dashboard.exploreFlavors')}</Button>
            </Box>
          ) : (
            Object.entries(ratedGrouped).map(([category, items]: [string, any]) => (
              <Box key={category} sx={{ mb: 6 }}>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>{category}</Typography>
                <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: {
                        xs: 'repeat(2, 1fr)',
                        sm: 'repeat(3, 1fr)',
                        md: 'repeat(4, 1fr)',
                        lg: 'repeat(6, 1fr)',
                        xl: 'repeat(8, 1fr)'
                    }, 
                    gap: 2 
                }}>
                  {items.map((rating: any) => (
                    <Tooltip key={rating.id} title={`${rating.flavor_name} - ${rating.score}/10`} arrow>
                        <Card sx={{ 
                            position: 'relative', 
                            transition: 'all 0.3s ease',
                            '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }
                        }}>
                            <Link to={`/flavor/${rating.flavor}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <Box sx={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden' }}>
                                    <Box 
                                        component="img" 
                                        src={rating.flavor_image || undefined} 
                                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                        loading="lazy"
                                    />
                                    <Box sx={{ 
                                        position: 'absolute', 
                                        bottom: 0, 
                                        left: 0, 
                                        right: 0, 
                                        bgcolor: 'rgba(0,0,0,0.6)', 
                                        color: 'white', 
                                        p: 0.5, 
                                        textAlign: 'center',
                                        backdropFilter: 'blur(4px)'
                                    }}>
                                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{rating.score}/10</Typography>
                                    </Box>
                                </Box>
                                <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                                    <Typography variant="caption" sx={{ 
                                        fontWeight: 'bold', 
                                        display: '-webkit-box',
                                        WebkitLineClamp: 1,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        fontSize: '0.75rem'
                                    }}>
                                        {rating.flavor_name}
                                    </Typography>
                                </CardContent>
                            </Link>
                        </Card>
                    </Tooltip>
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
                <Typography variant="h5" color="primary">{t('dashboard.allRated')}</Typography>
            </Box>
          ) : (
            Object.entries(missingGrouped).map(([category, flavors]: [string, any]) => (
              <Box key={category} sx={{ mb: 6 }}>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>{category}</Typography>
                <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: {
                        xs: 'repeat(2, 1fr)',
                        sm: 'repeat(3, 1fr)',
                        md: 'repeat(4, 1fr)',
                        lg: 'repeat(6, 1fr)',
                        xl: 'repeat(8, 1fr)'
                    }, 
                    gap: 2 
                }}>
                  {flavors.map((flavor: any) => (
                    <Card key={flavor.id} sx={{ 
                        transition: 'all 0.3s ease',
                        '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }
                    }}>
                      <Link to={`/flavor/${flavor.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Box sx={{ aspectRatio: '1/1', overflow: 'hidden', borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Box 
                                component="img" 
                                src={flavor.image_url || undefined} 
                                sx={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                loading="lazy"
                            />
                        </Box>
                        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                          <Typography variant="caption" sx={{ 
                              fontWeight: 'bold', 
                              display: '-webkit-box',
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              fontSize: '0.75rem'
                          }}>
                            {flavor.name}
                          </Typography>
                        </CardContent>
                      </Link>
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
