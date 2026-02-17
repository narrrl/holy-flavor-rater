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
  Button,
  Grid,
  List,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Pagination,
  TextField,
  InputAdornment,
  alpha,
  IconButton,
  Collapse
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CommentIcon from '@mui/icons-material/Comment';
import SendIcon from '@mui/icons-material/Send';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import { Link } from 'react-router-dom';
import api from '../api';
import { useTitle } from '../hooks/useTitle';
import RichText from '../components/RichText';

interface Reply {
    id: number;
    user: string;
    text: string;
    created_at: string;
}

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
    replies: Reply[];
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
  
  // Trending Flavors State (for sidebar)
  const [trending, setTrending] = useState<any[]>([]);

  // Reply State
  const [replyInputs, setReplyInputs] = useState<{[key: number]: string}>({});
  const [expandedReplies, setExpandedReplies] = useState<{[key: number]: boolean}>({});

  const filteredFollowing = following.filter(user => 
    user.username.toLowerCase().includes(followingSearch.toLowerCase())
  );

  const fetchFeedData = async (pageNum: number) => {
    setLoading(true);
    try {
      const [feedRes, followingRes, trendingRes] = await Promise.all([
          api.get(`ratings/feed/?page=${pageNum}`),
          api.get('users/following_list/'),
          api.get('flavors/top/') // Using top as trending for now
      ]);
      
      const feedData = feedRes.data.results || (Array.isArray(feedRes.data) ? feedRes.data : []);
      setRatings(feedData);
      
      const count = feedRes.data.count || 0;
      setTotalPages(Math.ceil(count / 10));
      
      const followData = Array.isArray(followingRes.data) ? followingRes.data : (followingRes.data.results || []);
      setFollowing(followData);

      setTrending(Array.isArray(trendingRes.data) ? trendingRes.data.slice(0, 5) : []);

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

  const handleReplyToggle = (ratingId: number) => {
      setExpandedReplies(prev => ({ ...prev, [ratingId]: !prev[ratingId] }));
  };

  const handleReplySubmit = async (ratingId: number) => {
      const text = replyInputs[ratingId];
      if (!text) return;
      try {
          const res = await api.post(`ratings/${ratingId}/reply/`, { text });
          // Optimistically update the UI
          setRatings(prevRatings => prevRatings.map(r => {
              if (r.id === ratingId) {
                  return { ...r, replies: [...r.replies, res.data] };
              }
              return r;
          }));
          setReplyInputs(prev => ({ ...prev, [ratingId]: '' }));
      } catch (err) {
          alert('Failed to send reply');
      }
  };

  if (loading && ratings.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={4}>
          {/* Main Feed Column */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: '800', mb: 1 }}>Community Feed</Typography>
                <Typography variant="subtitle1" color="text.secondary">
                    See what your friends are drinking and rating.
                </Typography>
            </Box>

            {ratings.length === 0 ? (
                <Box sx={{ 
                    p: 6, 
                    textAlign: 'center', 
                    borderRadius: 4, 
                    bgcolor: (theme) => alpha(theme.palette.background.paper, 0.6),
                    backdropFilter: 'blur(10px)',
                    border: '1px dashed', 
                    borderColor: 'divider' 
                }}>
                    <Typography variant="h6" gutterBottom color="text.secondary">It's quiet in here...</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Follow more users to populate your feed with flavor reviews!
                    </Typography>
                    <Button variant="outlined" component={Link} to="/" sx={{ borderRadius: 2 }}>
                        Discover Users
                    </Button>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {ratings.map(rating => (
                        <Card key={rating.id} elevation={0} sx={{ 
                            borderRadius: 3, 
                            border: '1px solid', 
                            borderColor: 'divider',
                            bgcolor: (theme) => alpha(theme.palette.background.paper, 0.8),
                            backdropFilter: 'blur(12px)',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            '&:hover': {
                                boxShadow: (theme) => `0 4px 20px ${alpha(theme.palette.primary.main, 0.08)}`,
                                borderColor: (theme) => alpha(theme.palette.primary.main, 0.3)
                            }
                        }}>
                            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                {/* Header */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <Link to={`/profile/${rating.user}`} style={{ textDecoration: 'none' }}>
                                            <Avatar src={rating.user_avatar || undefined} sx={{ width: 44, height: 44, border: '2px solid', borderColor: 'divider' }}>
                                                {!rating.user_avatar && rating.user.charAt(0).toUpperCase()}
                                            </Avatar>
                                        </Link>
                                        <Box>
                                            <Link to={`/profile/${rating.user}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '1rem', lineHeight: 1.2 }}>
                                                    {rating.user}
                                                </Typography>
                                            </Link>
                                            <Typography variant="caption" color="text.secondary">
                                                rated <Link to={`/flavor/${rating.flavor}`} style={{ color: 'inherit', fontWeight: 'bold', textDecoration: 'none' }}>{rating.flavor_name}</Link>
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                {new Date(rating.created_at).toLocaleDateString()}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    
                                    {/* Rating Badge */}
                                    <Box sx={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'center', 
                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                                        color: 'primary.main',
                                        px: 1.5, py: 0.5, 
                                        borderRadius: 2,
                                        minWidth: 50
                                    }}>
                                        <Typography variant="h6" sx={{ fontWeight: '900', lineHeight: 1 }}>{rating.score}</Typography>
                                        <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 'bold', opacity: 0.8 }}>/ 10</Typography>
                                    </Box>
                                </Box>

                                {/* Content Body */}
                                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                    <Box sx={{ flex: 1 }}>
                                        {rating.comment ? (
                                            <Typography variant="body1" sx={{ lineHeight: 1.6, fontSize: '0.95rem', mb: 1 }}>
                                                <RichText text={rating.comment} />
                                            </Typography>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
                                                No review text provided.
                                            </Typography>
                                        )}
                                    </Box>
                                    {/* Flavor Thumbnail */}
                                    <Link to={`/flavor/${rating.flavor}`} style={{ flexShrink: 0 }}>
                                        <Box sx={{ 
                                            width: 80, 
                                            height: 80, 
                                            borderRadius: 2, 
                                            overflow: 'hidden', 
                                            bgcolor: 'action.hover',
                                            border: '1px solid',
                                            borderColor: 'divider'
                                        }}>
                                            <Box 
                                                component="img" 
                                                src={rating.flavor_image || undefined} 
                                                alt={rating.flavor_name}
                                                sx={{ width: '100%', height: '100%', objectFit: 'contain', p: 0.5 }} 
                                            />
                                        </Box>
                                    </Link>
                                </Box>

                                <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />

                                {/* Actions / Footer */}
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Button 
                                        size="small" 
                                        startIcon={<CommentIcon fontSize="small" />} 
                                        onClick={() => handleReplyToggle(rating.id)}
                                        sx={{ textTransform: 'none', color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'transparent' } }}
                                    >
                                        {rating.replies.length > 0 ? `${rating.replies.length} Replies` : 'Reply'}
                                    </Button>
                                    
                                    {/* Small timestamp or generic action */}
                                    <Box /> 
                                </Box>

                                {/* Replies Section (Collapsible) */}
                                <Collapse in={expandedReplies[rating.id]}>
                                    <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid', borderColor: 'divider' }}>
                                        {/* Existing Replies */}
                                        {rating.replies.map((reply) => (
                                            <Box key={reply.id} sx={{ mb: 1.5 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                    <Avatar src={undefined} sx={{ width: 20, height: 20, fontSize: '0.7rem' }}>
                                                        {reply.user.charAt(0).toUpperCase()}
                                                    </Avatar>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                        {reply.user}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {new Date(reply.created_at).toLocaleDateString()}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="body2" sx={{ pl: 3.5, fontSize: '0.9rem' }}>
                                                    <RichText text={reply.text} />
                                                </Typography>
                                            </Box>
                                        ))}

                                        {/* Reply Input */}
                                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                            <TextField 
                                                placeholder="Write a reply..." 
                                                size="small" 
                                                fullWidth 
                                                variant="outlined"
                                                value={replyInputs[rating.id] || ''}
                                                onChange={(e) => setReplyInputs(prev => ({ ...prev, [rating.id]: e.target.value }))}
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'background.paper' } }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleReplySubmit(rating.id);
                                                    }
                                                }}
                                            />
                                            <IconButton 
                                                color="primary" 
                                                disabled={!replyInputs[rating.id]}
                                                onClick={() => handleReplySubmit(rating.id)}
                                                sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' }, width: 40, height: 40 }}
                                            >
                                                <SendIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    </Box>
                                </Collapse>
                            </CardContent>
                        </Card>
                    ))}
                    
                    {totalPages > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                            <Pagination 
                                count={totalPages} 
                                page={page} 
                                onChange={handlePageChange} 
                                color="primary" 
                                shape="rounded"
                            />
                        </Box>
                    )}
                </Box>
            )}
          </Grid>

          {/* Sidebar - Desktop Only */}
          <Grid size={{ xs: 12, md: 4 }} sx={{ display: { xs: 'none', md: 'block' } }}>
              <Box sx={{ position: 'sticky', top: 100, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  
                  {/* Following Widget */}
                  <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Following</Typography>
                      </Box>
                      <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                          {following.length === 0 ? (
                              <Box sx={{ p: 3, textAlign: 'center' }}>
                                  <Typography variant="body2" color="text.secondary">You aren't following anyone yet.</Typography>
                              </Box>
                          ) : (
                              <List disablePadding>
                                  {filteredFollowing.map((user) => (
                                      <ListItemButton key={user.id} component={Link} to={`/profile/${user.username}`}>
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
                                  ))}
                              </List>
                          )}
                      </Box>
                      <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                           <TextField
                                fullWidth
                                size="small"
                                placeholder="Filter..."
                                value={followingSearch}
                                onChange={(e) => setFollowingSearch(e.target.value)}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                                    sx: { borderRadius: 2, fontSize: '0.85rem' }
                                }}
                            />
                      </Box>
                  </Card>

                  {/* Trending / Top Rated Widget */}
                  <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', gap: 1 }}>
                          <WhatshotIcon color="error" fontSize="small" />
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Top Rated Flavors</Typography>
                      </Box>
                      <List disablePadding>
                          {trending.map((flavor, index) => (
                              <ListItemButton key={flavor.id} component={Link} to={`/flavor/${flavor.id}`} sx={{ py: 1.5 }}>
                                  <Box sx={{ mr: 2, fontWeight: 'bold', color: 'text.secondary', width: 20, textAlign: 'center' }}>
                                      {index + 1}
                                  </Box>
                                  <Avatar 
                                    src={flavor.image_url} 
                                    variant="rounded" 
                                    sx={{ width: 32, height: 32, mr: 2, bgcolor: 'transparent' }} 
                                    imgProps={{ sx: { objectFit: 'contain' } }}
                                  >
                                      F
                                  </Avatar>
                                  <ListItemText 
                                    primary={flavor.name} 
                                    secondary={`${flavor.average_rating ? flavor.average_rating.toFixed(1) : '-'} / 10`}
                                    primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold', noWrap: true }}
                                    secondaryTypographyProps={{ variant: 'caption', color: 'primary.main', fontWeight: 'bold' }}
                                  />
                              </ListItemButton>
                          ))}
                      </List>
                  </Card>
              </Box>
          </Grid>
      </Grid>
    </Container>
  );
};

export default CommunityFeed;
