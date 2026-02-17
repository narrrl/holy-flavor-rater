import React, { useEffect, useState } from 'react';
import { 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Avatar, 
  Container, 
  CircularProgress, 
  Divider,
  Rating as MuiRating,
  Button,
  Grid,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Pagination,
  TextField,
  InputAdornment,
  alpha
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { Link } from 'react-router-dom';
import api from '../api';
import { useTitle } from '../hooks/useTitle';

interface FeedRating {
    id: number;
    user: string;
    user_id: number;
    user_avatar: string | null;
    flavor: number;
    flavor_name: string;
    flavor_image: string | null;
    category_name: string;
    category_slug: string;
    score: number;
    comment: string;
    created_at: string;
}

interface FollowedUser {
    id: number;
    username: string;
    avatar: string | null;
}

const CommunityFeed: React.FC = () => {
  useTitle('Community Feed');
  const [ratings, setRatings] = useState<FeedRating[]>([]);
  const [following, setFollowing] = useState<FollowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [followingSearch, setFollowingSearch] = useState('');

  const filteredFollowing = following.filter(user => 
    user.username.toLowerCase().includes(followingSearch.toLowerCase())
  );

  const fetchFeedData = async (pageNum: number) => {
    setLoading(true);
    try {
      const [feedRes, followingRes] = await Promise.all([
          api.get(`ratings/feed/?page=${pageNum}`),
          api.get('users/following_list/')
      ]);
      
      const feedData = feedRes.data.results || [];
      setRatings(feedData);
      
      // Calculate total pages (DRF returns total count)
      const count = feedRes.data.count || 0;
      setTotalPages(Math.ceil(count / 10)); // 10 is our page_size
      
      setFollowing(followingRes.data);
    } catch (err) {
      console.error('Failed to fetch feed data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedData(page);
  }, [page]);

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
      setPage(value);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading && ratings.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 6 }}>
          <Typography variant="h3" sx={{ mb: 1, fontWeight: 'bold' }}>Community Activity</Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700, lineHeight: 1.6 }}>
              Discover which Holy Energy flavors your circle is currently testing. 
              See their latest ratings, read their reviews, and find your next favorite together.
          </Typography>
      </Box>
      
      <Grid container spacing={4}>
          {/* Main Feed */}
          <Grid size={{ xs: 12, md: 8 }}>
            {ratings.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center', borderRadius: 4, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" gutterBottom>Your feed is quiet...</Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                        Follow other Holy Energy fans to see their latest flavor ratings and reviews here!
                    </Typography>
                    <Button variant="contained" component={Link} to="/" sx={{ borderRadius: 2 }}>
                        Find flavors and reviewers
                    </Button>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
                ) : (
                    <>
                        {ratings.map(rating => (
                            <Card key={rating.id} sx={{ borderRadius: 3, transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Link to={`/profile/${rating.user}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}>
                                        <Avatar src={rating.user_avatar || undefined} sx={{ width: 40, height: 40, mr: 2 }}>
                                        {!rating.user_avatar && rating.user.charAt(0).toUpperCase()}
                                        </Avatar>
                                        <Box>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', '&:hover': { color: 'primary.main' } }}>
                                                {rating.user}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {new Date(rating.created_at).toLocaleDateString()}
                                            </Typography>
                                        </Box>
                                    </Link>
                                    </Box>

                                    <Divider sx={{ my: 2 }} />

                                    <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
                                        <Link to={`/flavor/${rating.flavor}`} style={{ textDecoration: 'none' }}>
                                            <Box sx={{ width: { xs: '100%', sm: 100 }, aspectRatio: '1/1', borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                                                <Box 
                                                    component="img" 
                                                    src={rating.flavor_image || undefined} 
                                                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                                />
                                            </Box>
                                        </Link>
                                        <Box sx={{ flex: 1 }}>
                                            <Link to={`/flavor/${rating.flavor}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                <Typography variant="h6" sx={{ fontSize: '1.1rem', mb: 0.5, '&:hover': { color: 'primary.main' } }}>
                                                    {rating.flavor_name}
                                                </Typography>
                                            </Link>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                                                {rating.category_name}
                                            </Typography>
                                            
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                                                {/* Compact rating for mobile, stars for desktop */}
                                                <Box sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center', gap: 0.5 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>⭐ {rating.score}/10</Typography>
                                                </Box>
                                                <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center' }}>
                                                    <MuiRating value={rating.score} readOnly max={10} size="small" />
                                                    <Typography variant="body2" sx={{ ml: 1, fontWeight: 'bold' }}>{rating.score}/10</Typography>
                                                </Box>
                                            </Box>

                                            {rating.comment && (
                                                <Typography variant="body2" sx={{ 
                                                    fontStyle: 'italic', 
                                                    color: 'text.secondary',
                                                    borderLeft: '3px solid',
                                                    borderColor: 'divider',
                                                    pl: 2,
                                                    py: 0.5
                                                }}>
                                                    "{rating.comment}"
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        ))}
                    </>
                )}

                {totalPages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                        <Pagination 
                            count={totalPages} 
                            page={page} 
                            onChange={handlePageChange} 
                            color="primary" 
                            size="large"
                            sx={{ 
                                '& .MuiPaginationItem-root': { borderRadius: 2, fontWeight: 'bold' }
                            }}
                        />
                    </Box>
                )}
                </Box>
            )}
          </Grid>

          {/* Sidebar - Desktop Only */}
          <Grid size={{ xs: 12, md: 4 }} sx={{ display: { xs: 'none', md: 'block' } }}>
              <Card sx={{ borderRadius: 3, position: { md: 'sticky' }, top: { md: 100 } }}>
                  <CardContent sx={{ p: 0 }}>
                      <Box sx={{ 
                          p: 2, 
                          bgcolor: (theme) => alpha(theme.palette.background.paper, 0.4), 
                          backdropFilter: 'blur(8px)',
                          borderBottom: '1px solid', 
                          borderColor: 'divider' 
                      }}>
                          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>Following ({following.length})</Typography>
                          <TextField
                            fullWidth
                            size="small"
                            placeholder="Search friends..."
                            value={followingSearch}
                            onChange={(e) => setFollowingSearch(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ fontSize: '1.1rem' }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ 
                                bgcolor: 'background.paper', 
                                borderRadius: 1,
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': { border: 'none' },
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                }
                            }}
                          />
                      </Box>
                      {following.length === 0 ? (
                          <Box sx={{ p: 3, textAlign: 'center' }}>
                              <Typography variant="body2" color="text.secondary">You aren't following anyone yet.</Typography>
                          </Box>
                      ) : (
                          <List sx={{ py: 0, maxHeight: '60vh', overflowY: 'auto' }}>
                              {filteredFollowing.map((user) => (
                                  <React.Fragment key={user.id}>
                                      <ListItem disablePadding>
                                          <ListItemButton component={Link} to={`/profile/${user.username}`}>
                                              <ListItemAvatar>
                                                  <Avatar src={user.avatar || undefined} sx={{ width: 32, height: 32 }}>
                                                      {!user.avatar && user.username.charAt(0).toUpperCase()}
                                                  </Avatar>
                                              </ListItemAvatar>
                                              <ListItemText 
                                                primary={user.username} 
                                                primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                                              />
                                          </ListItemButton>
                                      </ListItem>
                                      <Divider component="li" />
                                  </React.Fragment>
                              ))}
                              {filteredFollowing.length === 0 && followingSearch && (
                                  <Box sx={{ p: 3, textAlign: 'center' }}>
                                      <Typography variant="body2" color="text.secondary">No matching friends found.</Typography>
                                  </Box>
                              )}
                          </List>
                      )}
                  </CardContent>
              </Card>
          </Grid>
      </Grid>
    </Container>
  );
};

export default CommunityFeed;
