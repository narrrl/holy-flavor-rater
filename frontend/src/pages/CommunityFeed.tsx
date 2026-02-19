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
  Collapse,
  Link as MuiLink
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CommentIcon from '@mui/icons-material/Comment';
import SendIcon from '@mui/icons-material/Send';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PeopleIcon from '@mui/icons-material/People';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useTitle } from '../hooks/useTitle';
import RichText from '../components/RichText';
import { formatDate } from '../utils/date';
import { useTranslation } from 'react-i18next';
import MentionTextField from '../components/MentionTextField';
import RatingBadge from '../components/RatingBadge';

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
    notification_type: 'reply' | 'mention' | 'follow' | 'ticket_new' | 'ticket_reply' | 'profile_comment';
    rating: number | null;
    reply: number | null;
    is_read: boolean;
    created_at: string;
    flavor_name: string | null;
    flavor_id: number | null;
}

interface CommunityFeedProps {
    adminMode?: boolean;
}

const CommunityFeed: React.FC<CommunityFeedProps> = ({ adminMode }) => {
  const { t } = useTranslation();
  useTitle(t('community.title'));
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

  const handleGoBack = () => {
      if (window.history.length > 1) {
          navigate(-1);
      } else {
          navigate('/');
      }
  };

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
      <Box sx={{ mb: 4 }}>
          <Button 
            variant="outlined" 
            onClick={handleGoBack}
            startIcon={<ArrowBackIcon />}
            sx={{ 
                borderRadius: 2, 
                textTransform: 'none', 
                fontWeight: 'bold',
                color: 'text.secondary',
                borderColor: 'divider',
                '&:hover': {
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    bgcolor: 'transparent'
                }
            }}
          >
            {window.history.length > 1 ? t('common.back') : t('common.backToHome')}
          </Button>
      </Box>

      <Box sx={{ mb: 6 }}>
          <Typography variant="h3" sx={{ fontWeight: '800', mb: 1 }}>{t('community.title')}</Typography>
          <Typography variant="h6" color="text.secondary">
              {t('community.subtitle')}
          </Typography>
      </Box>

      <Grid container spacing={4}>
          {/* Main Feed Column */}
          <Grid size={{ xs: 12, lg: 8 }}>
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
                    <Typography variant="h6" gutterBottom color="text.secondary">{t('community.quietFeed')}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        {t('community.followMore')}
                    </Typography>
                    <Button variant="contained" component={Link} to="/" sx={{ borderRadius: 2 }}>
                        {t('home.exploreFlavors')}
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
                            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
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
                                    <RatingBadge score={rating.score} />
                                </Box>

                                {adminMode && (
                                    <Button 
                                        size="small" variant="outlined" color="secondary"
                                        onClick={() => navigate(`/admin-panel/rating/${rating.id}`)}
                                        sx={{ mb: 2, borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                                    >
                                        {t('admin.manageRating')}
                                    </Button>
                                )}

                                {/* Flavor and Comment */}
                                <Box sx={{ display: 'flex', gap: 3 }}>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            {t('community.rated')} <MuiLink component={Link} to={`/flavor/${rating.flavor}`} sx={{ color: 'primary.main', fontWeight: 'bold', textDecoration: 'none' }}>{rating.flavor_name}</MuiLink>
                                        </Typography>
                                        {rating.comment ? (
                                            <Typography variant="body1" sx={{ lineHeight: 1.6, fontStyle: 'italic', color: 'text.primary' }}>
                                                <RichText text={rating.comment} />
                                            </Typography>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>No comment provided.</Typography>
                                        )}
                                    </Box>
                                    <Link to={`/flavor/${rating.flavor}`} style={{ flexShrink: 0 }}>
                                        <Box sx={{ width: 70, height: 70, borderRadius: 1, overflow: 'hidden', bgcolor: 'background.default', border: '1px solid', borderColor: 'divider' }}>
                                            <Box component="img" src={rating.flavor_image || undefined} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                                    {rating.replies.length > 0 ? `${rating.replies.length} ${t('common.replies')}` : t('common.reply')}
                                </Button>

                                <Collapse in={expandedReplies[rating.id]}>
                                    <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid', borderColor: 'divider' }}>
                                        {rating.replies.map((reply) => (
                                            <Box key={reply.id} sx={{ mb: 1.5 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>{reply.user}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{formatTimestamp(reply.created_at)}</Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <Typography variant="body2"><RichText text={reply.text} /></Typography>
                                                    {adminMode && (
                                                        <Button 
                                                            size="small" sx={{ minWidth: 0, py: 0, fontSize: '0.7rem' }} 
                                                            onClick={() => navigate(`/admin-panel/reply/${reply.id}`)}
                                                        >
                                                            {t('admin.manageReply')}
                                                        </Button>
                                                    )}
                                                </Box>
                                            </Box>
                                        ))}
                                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                            <MentionTextField 
                                                placeholder={t('community.writeReply')} 
                                                value={replyInputs[rating.id] || ''} 
                                                onChange={(val) => setReplyInputs(prev => ({ ...prev, [rating.id]: val }))}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        handleReplySubmit(rating.id);
                                                    }
                                                }}
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
          <Grid size={{ xs: 12, lg: 4 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  
                  {/* Notifications Widget */}
                  <Card elevation={0} sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#000', 0.02), display: 'flex', alignItems: 'center', gap: 1 }}>
                          <NotificationsIcon color="primary" fontSize="small" />
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{t('community.notifications')}</Typography>
                      </Box>
                      <List disablePadding>
                          {notifications.length === 0 ? (
                              <Box sx={{ p: 3, textAlign: 'center' }}><Typography variant="body2" color="text.secondary">{t('community.noNotifications')}</Typography></Box>
                          ) : (
                              notifications.map(n => {
                                  const handleClick = () => {
                                      if (n.notification_type === 'follow') {
                                          navigate(`/profile/${n.actor_username}`);
                                      } else if (n.flavor_id) {
                                          navigate(`/flavor/${n.flavor_id}`);
                                      }
                                  };

                                  return (
                                      <ListItemButton key={n.id} onClick={handleClick} sx={{ py: 1.5 }}>
                                          <ListItemAvatar sx={{ minWidth: 40 }}>
                                              <Avatar src={n.actor_avatar || undefined} sx={{ width: 30, height: 30, fontSize: '0.8rem' }}>{n.actor_username.charAt(0)}</Avatar>
                                          </ListItemAvatar>
                                          <ListItemText 
                                            primary={
                                                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                                    <strong>{n.actor_username}</strong> {
                                                        n.notification_type === 'reply' ? t('community.notifReply') : 
                                                        n.notification_type === 'mention' ? t('community.notifMention') :
                                                        n.notification_type === 'follow' ? t('community.notifFollow') :
                                                        n.notification_type
                                                    }
                                                </Typography>
                                            }
                                            secondary={formatTimestamp(n.created_at)}
                                            secondaryTypographyProps={{ sx: { fontSize: '0.7rem' } }}
                                          />
                                      </ListItemButton>
                                  );
                              })
                          )}
                      </List>
                  </Card>

                  {/* Following Widget */}
                  <Card elevation={0} sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#000', 0.02), display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PeopleIcon color="primary" fontSize="small" />
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{t('nav.following')}</Typography>
                      </Box>
                      <Box sx={{ p: 1.5 }}>
                           <TextField
                                fullWidth size="small" placeholder={t('community.searchFriends')}
                                value={followingSearch}
                                onChange={(e) => setFollowingSearch(e.target.value)}
                                InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
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
                  <Card elevation={0} sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#000', 0.02), display: 'flex', alignItems: 'center', gap: 1 }}>
                          <WhatshotIcon color="error" fontSize="small" />
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{t('community.topRated')}</Typography>
                      </Box>
                      <List disablePadding>
                          {topFollowed.map((flavor, idx) => (
                              <ListItemButton key={flavor.id} component={Link} to={`/flavor/${flavor.id}`}>
                                  <Box sx={{ mr: 2, fontWeight: 'bold', color: 'text.secondary', width: 15 }}>{idx + 1}</Box>
                                  <Box sx={{ width: 32, height: 32, mr: 2, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', borderRadius: 0.5, overflow: 'hidden', flexShrink: 0 }}>
                                      <Box component="img" src={flavor.image_url} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  </Box>
                                  <ListItemText 
                                    primary={flavor.name} 
                                    primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold', noWrap: true }}
                                  />
                                  <RatingBadge score={flavor.average_rating || 0} size="small" />
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
