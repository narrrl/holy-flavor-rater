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
  alpha,
  IconButton,
  Collapse
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CommentIcon from '@mui/icons-material/Comment';
import SendIcon from '@mui/icons-material/Send';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PeopleIcon from '@mui/icons-material/People';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useTitle } from '../hooks/useTitle';
import RichText from '../components/RichText';
import { formatDate } from '../utils/date';

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

interface Notification {
    id: number;
    actor_username: string;
    actor_avatar: string | null;
    notification_type: 'reply' | 'mention';
    rating: number | null;
    reply: number | null;
    is_read: boolean;
    created_at: string;
    flavor_name: string | null;
    flavor_id: number | null;
}

const CommunityFeed: React.FC = () => {
  useTitle('Community Feed');
  const navigate = useNavigate();
  const [ratings, setRatings] = useState<FeedRating[]>([]);
  const [following, setFollowing] = useState<FollowedUser[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [followingSearch, setFollowingSearch] = useState('');
  
  // Top Rated Flavors by followed users
  const [topFollowed, setTopFollowed] = useState<any[]>([]);

  // UI State
  const [replyInputs, setReplyInputs] = useState<{[key: number]: string}>({});
  const [expandedReplies, setExpandedReplies] = useState<{[key: number]: boolean}>({});

  const filteredFollowing = following.filter(user => 
    user.username.toLowerCase().includes(followingSearch.toLowerCase())
  );

  const fetchFeedData = async (pageNum: number) => {
    setLoading(true);
    try {
      const [feedRes, followingRes, topFollowedRes, notifRes] = await Promise.all([
          api.get(`ratings/feed/?page=${pageNum}`),
          api.get('users/following_list/'),
          api.get('flavors/followed_top/'),
          api.get('notifications/')
      ]);
      
      const feedData = feedRes.data.results || (Array.isArray(feedRes.data) ? feedRes.data : []);
      setRatings(feedData);
      
      const count = feedRes.data.count || 0;
      setTotalPages(Math.ceil(count / 10));
      
      const followData = Array.isArray(followingRes.data) ? followingRes.data : (followingRes.data.results || []);
      setFollowing(followData);

      setTopFollowed(Array.isArray(topFollowedRes.data) ? topFollowedRes.data.slice(0, 5) : []);
      
      const notifData = Array.isArray(notifRes.data) ? notifRes.data : (notifRes.data.results || []);
      setNotifications(notifData.slice(0, 5)); // Just the latest 5 for sidebar

    } catch (err: any) {
      if (err.response?.status === 401) {
          navigate('/login');
      }
      console.error('Failed to fetch feed data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
        navigate('/login');
        return;
    }
    fetchFeedData(page);
  }, [page, navigate]);

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

  const formatTimestamp = (dateStr: string) => {
      return formatDate(dateStr);
  };

  if (loading && ratings.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 6 }}>
          <Typography variant="h3" sx={{ fontWeight: '800', mb: 1 }}>Community Activity</Typography>
          <Typography variant="h6" color="text.secondary">
              Stay updated with your circle's latest ratings and discussions.
          </Typography>
      </Box>

      <Grid container spacing={4}>
          {/* Main Feed Column */}
          <Grid size={{ xs: 12, md: 8 }}>
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
                    <Typography variant="h6" gutterBottom color="text.secondary">Your feed is a bit empty...</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Follow more people to see their flavor ratings here!
                    </Typography>
                    <Button variant="contained" component={Link} to="/" sx={{ borderRadius: 2 }}>
                        Explore Flavors
                    </Button>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    {ratings.map(rating => (
                        <Card key={rating.id} elevation={0} sx={{ 
                            borderRadius: 4, 
                            border: '1px solid', 
                            borderColor: 'divider',
                            bgcolor: (theme) => alpha(theme.palette.background.paper, 0.8),
                            transition: 'transform 0.2s',
                            '&:hover': {
                                transform: 'translateY(-2px)',
                                borderColor: (theme) => alpha(theme.palette.primary.main, 0.2)
                            }
                        }}>
                            <CardContent sx={{ p: 3 }}>
                                {/* User Info */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <Link to={`/profile/${rating.user}`} style={{ textDecoration: 'none' }}>
                                            <Avatar src={rating.user_avatar || undefined} sx={{ width: 48, height: 48, border: '2px solid', borderColor: 'divider' }}>
                                                {!rating.user_avatar && rating.user.charAt(0).toUpperCase()}
                                            </Avatar>
                                        </Link>
                                        <Box>
                                            <Link to={`/profile/${rating.user}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                                                    {rating.user}
                                                </Typography>
                                            </Link>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                {formatTimestamp(rating.created_at)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'center', 
                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                                        color: 'primary.main',
                                        px: 2, py: 0.5, 
                                        borderRadius: 2
                                    }}>
                                        <Typography variant="h5" sx={{ fontWeight: '900', lineHeight: 1 }}>{rating.score}</Typography>
                                        <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 'bold' }}>/ 10</Typography>
                                    </Box>
                                </Box>

                                {/* Flavor and Comment */}
                                <Box sx={{ display: 'flex', gap: 3 }}>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            Rated <Link to={`/flavor/${rating.flavor}`} style={{ color: 'primary.main', fontWeight: 'bold', textDecoration: 'none' }}>{rating.flavor_name}</Link>
                                        </Typography>
                                        {rating.comment ? (
                                            <Typography variant="body1" sx={{ lineHeight: 1.6, fontStyle: 'italic', color: 'text.primary' }}>
                                                <RichText text={rating.comment} />
                                            </Typography>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>No review text.</Typography>
                                        )}
                                    </Box>
                                    <Link to={`/flavor/${rating.flavor}`} style={{ flexShrink: 0 }}>
                                        <Box sx={{ width: 70, height: 70, borderRadius: 2, overflow: 'hidden', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                                            <Box component="img" src={rating.flavor_image || undefined} sx={{ width: '100%', height: '100%', objectFit: 'contain', p: 0.5 }} />
                                        </Box>
                                    </Link>
                                </Box>

                                <Divider sx={{ my: 2 }} />

                                {/* Footer & Replies */}
                                <Button 
                                    size="small" 
                                    startIcon={<CommentIcon fontSize="small" />} 
                                    onClick={() => handleReplyToggle(rating.id)}
                                    sx={{ textTransform: 'none', color: 'text.secondary' }}
                                >
                                    {rating.replies.length > 0 ? `${rating.replies.length} Replies` : 'Reply'}
                                </Button>

                                <Collapse in={expandedReplies[rating.id]}>
                                    <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid', borderColor: 'divider' }}>
                                        {rating.replies.map((reply) => (
                                            <Box key={reply.id} sx={{ mb: 1.5 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>{reply.user}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{formatTimestamp(reply.created_at)}</Typography>
                                                </Box>
                                                <Typography variant="body2"><RichText text={reply.text} /></Typography>
                                            </Box>
                                        ))}
                                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                            <TextField 
                                                fullWidth size="small" placeholder="Add a reply..." 
                                                value={replyInputs[rating.id] || ''} 
                                                onChange={(e) => setReplyInputs(prev => ({ ...prev, [rating.id]: e.target.value }))}
                                                onKeyDown={(e) => e.key === 'Enter' && handleReplySubmit(rating.id)}
                                            />
                                            <IconButton color="primary" onClick={() => handleReplySubmit(rating.id)} disabled={!replyInputs[rating.id]}>
                                                <SendIcon />
                                            </IconButton>
                                        </Box>
                                    </Box>
                                </Collapse>
                            </CardContent>
                        </Card>
                    ))}
                    {totalPages > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                            <Pagination count={totalPages} page={page} onChange={handlePageChange} color="primary" />
                        </Box>
                    )}
                </Box>
            )}
          </Grid>

          {/* Sidebar Column */}
          <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  
                  {/* Notifications Widget */}
                  <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#000', 0.02), display: 'flex', alignItems: 'center', gap: 1 }}>
                          <NotificationsIcon color="primary" fontSize="small" />
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Recent Notifications</Typography>
                      </Box>
                      <List disablePadding>
                          {notifications.length === 0 ? (
                              <Box sx={{ p: 3, textAlign: 'center' }}><Typography variant="body2" color="text.secondary">No notifications.</Typography></Box>
                          ) : (
                              notifications.map(n => (
                                  <ListItemButton key={n.id} onClick={() => n.flavor_id && navigate(`/flavor/${n.flavor_id}`)} sx={{ py: 1.5 }}>
                                      <ListItemAvatar sx={{ minWidth: 40 }}>
                                          <Avatar src={n.actor_avatar || undefined} sx={{ width: 30, height: 30, fontSize: '0.8rem' }}>{n.actor_username.charAt(0)}</Avatar>
                                      </ListItemAvatar>
                                      <ListItemText 
                                        primary={
                                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                                <strong>{n.actor_username}</strong> {n.notification_type === 'reply' ? 'replied' : 'mentioned you'}
                                            </Typography>
                                        }
                                        secondary={formatTimestamp(n.created_at)}
                                        secondaryTypographyProps={{ sx: { fontSize: '0.7rem' } }}
                                      />
                                  </ListItemButton>
                              ))
                          )}
                      </List>
                  </Card>

                  {/* Following Widget */}
                  <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#000', 0.02), display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PeopleIcon color="primary" fontSize="small" />
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Following</Typography>
                      </Box>
                      <Box sx={{ p: 1.5 }}>
                           <TextField
                                fullWidth size="small" placeholder="Search friends..."
                                value={followingSearch}
                                onChange={(e) => setFollowingSearch(e.target.value)}
                                InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> }}
                            />
                      </Box>
                      <List disablePadding sx={{ maxHeight: 250, overflowY: 'auto' }}>
                          {filteredFollowing.map(user => (
                              <ListItemButton key={user.id} component={Link} to={`/profile/${user.username}`}>
                                  <Avatar src={user.avatar || undefined} sx={{ width: 28, height: 28, mr: 2, fontSize: '0.8rem' }}>{user.username.charAt(0)}</Avatar>
                                  <ListItemText primary={user.username} primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }} />
                              </ListItemButton>
                          ))}
                      </List>
                  </Card>

                  {/* Top Rated by Circle */}
                  <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#000', 0.02), display: 'flex', alignItems: 'center', gap: 1 }}>
                          <WhatshotIcon color="error" fontSize="small" />
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Circle's Top Rated</Typography>
                      </Box>
                      <List disablePadding>
                          {topFollowed.map((flavor, idx) => (
                              <ListItemButton key={flavor.id} component={Link} to={`/flavor/${flavor.id}`}>
                                  <Box sx={{ mr: 2, fontWeight: 'bold', color: 'text.secondary', width: 15 }}>{idx + 1}</Box>
                                  <Avatar src={flavor.image_url} variant="rounded" sx={{ width: 32, height: 32, mr: 2, bgcolor: 'transparent' }} imgProps={{ sx: { objectFit: 'contain' } }} />
                                  <ListItemText 
                                    primary={flavor.name} 
                                    secondary={`${(flavor.average_rating || 0).toFixed(1)} / 10`}
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
