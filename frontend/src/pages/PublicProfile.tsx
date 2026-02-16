import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Avatar, 
  Container, 
  CircularProgress, 
  Tooltip,
  Tabs,
  Tab,
  Paper,
  Divider
} from '@mui/material';
import { Link } from 'react-router-dom';
import api from '../api';
import { useTitle } from '../hooks/useTitle';

interface Rating {
    id: number;
    flavor: number;
    flavor_name: string;
    flavor_image: string | null;
    category_name: string;
    score: number;
    comment: string;
    created_at: string;
}

interface ProfileData {
    username: string;
    theme: string;
    avatar: string | null;
    ratings: Rating[];
}

const PublicProfile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`users/profile/${username}/`);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username]);

  useTitle(data ? `${data.username}'s Ratings` : 'Profile');

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  if (!data) return <Typography>Profile not found.</Typography>;

  // Group by category
  const categoryGroups = data.ratings.reduce((acc: any, rating) => {
      const cat = rating.category_name || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(rating);
      return acc;
  }, {});

  const categories = ['All', ...Object.keys(categoryGroups)];
  const currentRatings = activeTab === 0 ? data.ratings : categoryGroups[categories[activeTab]];

  // Tier logic
  const getTier = (score: number) => {
      if (score >= 9) return { label: 'S', color: '#ff7f7f', desc: 'Elite' };
      if (score >= 7) return { label: 'A', color: '#ffbf7f', desc: 'Great' };
      if (score >= 5) return { label: 'B', color: '#ffff7f', desc: 'Good' };
      if (score >= 3) return { label: 'C', color: '#bfff7f', desc: 'Okay' };
      return { label: 'D', color: '#7fff7f', desc: 'Avoid' };
  };

  const tiers = [
      { key: 'S', title: 'S-Tier', min: 9 },
      { key: 'A', title: 'A-Tier', min: 7 },
      { key: 'B', title: 'B-Tier', min: 5 },
      { key: 'C', title: 'C-Tier', min: 3 },
      { key: 'D', title: 'D-Tier', min: 0 },
  ];

  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, sm: 4, md: 6 }, py: 4 }}>
      {/* Profile Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 6, gap: 3 }}>
        <Avatar src={data.avatar || undefined} sx={{ width: 100, height: 100, border: '4px solid', borderColor: 'primary.main', fontSize: '2.5rem' }}>
            {!data.avatar && data.username.charAt(0).toUpperCase()}
        </Avatar>
        <Box>
            <Typography variant="h2" sx={{ fontWeight: 'bold', fontSize: { xs: '2.5rem', md: '3.75rem' } }}>{data.username}</Typography>
            <Typography variant="h6" color="text.secondary">
                Taste Profile • {data.ratings.length} Flavors Rated
            </Typography>
        </Box>
      </Box>

      {/* Category Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
          <Tabs 
            value={activeTab} 
            onChange={(_, v) => setActiveTab(v)} 
            variant="scrollable" 
            scrollButtons="auto"
          >
              {categories.map((cat) => (
                  <Tab key={cat} label={cat} sx={{ fontWeight: 'bold' }} />
              ))}
          </Tabs>
      </Box>

      {/* Tiered Content */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tiers.map(tier => {
              const items = currentRatings.filter((r: Rating) => {
                  const s = r.score;
                  if (tier.key === 'S') return s >= 9;
                  if (tier.key === 'A') return s >= 7 && s < 9;
                  if (tier.key === 'B') return s >= 5 && s < 7;
                  if (tier.key === 'C') return s >= 3 && s < 5;
                  return s < 3;
              });

              if (items.length === 0) return null;

              return (
                  <Box key={tier.key}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                          <Paper sx={{ 
                              width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                              bgcolor: getTier(tier.min).color, color: 'black', fontWeight: '900', fontSize: '1.5rem',
                              borderRadius: 2
                          }}>
                              {tier.key}
                          </Paper>
                          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{tier.title}</Typography>
                          <Divider sx={{ flexGrow: 1 }} />
                      </Box>

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
                          {items.map((rating: Rating) => (
                              <Tooltip key={rating.id} title={rating.comment ? `"${rating.comment}"` : rating.flavor_name} arrow>
                                  <Card sx={{ transition: 'all 0.3s ease', '&:hover': { transform: 'scale(1.05)', boxShadow: 6, zIndex: 1 } }}>
                                      <Link to={`/flavor/${rating.flavor}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                          <Box sx={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden' }}>
                                              <Box 
                                                  component="img" 
                                                  src={rating.flavor_image || undefined} 
                                                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                                  loading="lazy"
                                              />
                                              <Box sx={{ 
                                                  position: 'absolute', bottom: 0, left: 0, right: 0, 
                                                  bgcolor: 'rgba(0,0,0,0.7)', color: 'white', p: 0.5, textAlign: 'center'
                                              }}>
                                                  <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{rating.score}/10</Typography>
                                              </Box>
                                          </Box>
                                          <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                                              <Typography variant="caption" sx={{ 
                                                  fontWeight: 'bold', display: '-webkit-box', WebkitLineClamp: 1, 
                                                  WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: '0.75rem'
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
              );
          })}
      </Box>
    </Container>
  );
};

export default PublicProfile;
