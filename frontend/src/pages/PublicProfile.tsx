import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Avatar, 
  Container, 
  CircularProgress, 
  Tabs,
  Tab,
  Paper,
  Divider,
  Button,
  Stack,
  alpha,
  useTheme,
  Grid,
  TextField,
  IconButton,
  Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../api';
import { useTitle } from '../hooks/useTitle';
import { useTranslation } from 'react-i18next';
import RatingBadge from '../components/RatingBadge';
import RichText from '../components/RichText';
import { formatDate } from '../utils/date';

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

interface ProfileComment {
    id: number;
    author_username: string;
    author_avatar: string | null;
    text: string;
    created_at: string;
}

interface MiniUser {
    id: number;
    username: string;
    avatar: string | null;
}

interface ProfileData {
    id: number;
    username: string;
    theme: string;
    avatar: string | null;
    following_count: number;
    followers_count: number;
    is_following: boolean;
    ratings: Rating[];
    comments: ProfileComment[];
    followers: MiniUser[];
    following: MiniUser[];
}

interface PublicProfileProps {
    adminMode?: boolean;
}

const PublicProfile: React.FC<PublicProfileProps> = ({ adminMode }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0); // 0: Ratings, 1: Guestbook, 2: Followers, 3: Following
  const [categoryTab, setCategoryTab] = useState(0);
  const [currentUser, setCurrentUser] = useState<{username: string, is_superuser: boolean} | null>(null);
  
  // Comment state
  const [newComment, setNewComment] = useState('');

  const fetchProfile = async () => {
    try {
      const [profileRes, meRes] = await Promise.all([
          api.get(`users/profile/${username}/`),
          localStorage.getItem('token') ? api.get('users/me/') : Promise.resolve({ data: null })
      ]);
      setData(profileRes.data);
      if (meRes.data) setCurrentUser(meRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const handleFollowToggle = async () => {
      if (!data) return;
      try {
          if (data.is_following) {
              await api.post(`users/${data.id}/unfollow/`);
              setData({ ...data, is_following: false, followers_count: data.followers_count - 1 });
          } else {
              await api.post(`users/${data.id}/follow/`);
              setData({ ...data, is_following: true, followers_count: data.followers_count + 1 });
          }
      } catch (err) {
          alert('Failed to update follow status. Please login.');
      }
  };

  const handleAddComment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newComment.trim() || !data) return;
      try {
          await api.post(`users/${data.id}/add_comment/`, { text: newComment });
          setNewComment('');
          fetchProfile();
      } catch (err) {
          alert('Failed to add comment');
      }
  };

  const handleDeleteComment = async (commentId: number) => {
      if (!data || !confirm('Delete this comment?')) return;
      try {
          await api.delete(`users/${data.id}/delete_comment/${commentId}/`);
          fetchProfile();
      } catch (err) {
          alert('Failed to delete comment');
      }
  };

  useTitle(data ? `${data.username}'s Ratings` : 'Profile');

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  if (!data) return <Typography>Profile not found.</Typography>;

  // Rating filtering
  const categoryGroups = data.ratings.reduce((acc: any, rating) => {
      const cat = rating.category_name || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(rating);
      return acc;
  }, {});

  const ratingCategories = ['All', ...Object.keys(categoryGroups)];
  const currentRatings = categoryTab === 0 ? data.ratings : categoryGroups[ratingCategories[categoryTab]];

  const tiers = [
      { key: 'S', title: 'S-Tier', min: 9, color: '#ff7f7f' },
      { key: 'A', title: 'A-Tier', min: 7, color: '#ffbf7f' },
      { key: 'B', title: 'B-Tier', min: 5, color: '#ffff7f' },
      { key: 'C', title: 'C-Tier', min: 3, color: '#bfff7f' },
      { key: 'D', title: 'D-Tier', min: 0, color: '#7fff7f' },
  ];

  const handleGoBack = () => {
      if (window.history.length > 1) navigate(-1);
      else navigate('/');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button 
        variant="outlined" 
        onClick={handleGoBack}
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 4, borderRadius: 2, textTransform: 'none', fontWeight: 'bold', color: 'text.secondary', borderColor: 'divider' }}
      >
        {t('common.back')}
      </Button>

      {/* Modern Profile Header */}
      <Card elevation={0} sx={{ 
          borderRadius: 4, 
          border: '1px solid', 
          borderColor: 'divider',
          bgcolor: (theme) => alpha(theme.palette.background.paper, 0.6),
          backdropFilter: 'blur(12px)',
          mb: 4,
          overflow: 'hidden'
      }}>
          <Box sx={{ height: 120, bgcolor: alpha(theme.palette.primary.main, 0.1) }} />
          <CardContent sx={{ pt: 0, px: { xs: 2, md: 4 }, pb: 4 }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'center', sm: 'flex-end' }, gap: 3, mt: -6 }}>
                  <Avatar 
                    src={data.avatar || undefined} 
                    sx={{ 
                        width: 120, height: 120, 
                        border: '6px solid', 
                        borderColor: (theme) => theme.palette.background.paper,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        fontSize: '3rem',
                        bgcolor: 'primary.main'
                    }}
                  >
                      {!data.avatar && data.username.charAt(0).toUpperCase()}
                  </Avatar>
                  
                  <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' }, mb: 1 }}>
                      <Typography variant="h3" sx={{ fontWeight: '900', letterSpacing: -0.5 }}>{data.username}</Typography>
                      <Stack direction="row" spacing={3} sx={{ mt: 1, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                          <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1 }}>{data.ratings.length}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>Rated</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1 }}>{data.followers_count}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>Followers</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1 }}>{data.following_count}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>Following</Typography>
                          </Box>
                      </Stack>
                  </Box>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' }, mb: 1 }}>
                      {currentUser?.username !== data.username && (
                          <Button 
                            variant={data.is_following ? "outlined" : "contained"} 
                            onClick={handleFollowToggle}
                            sx={{ borderRadius: 3, px: 4, fontWeight: 'bold', py: 1 }}
                          >
                              {data.is_following ? "Following" : "Follow"}
                          </Button>
                      )}
                      {(currentUser?.is_superuser || (adminMode && currentUser?.is_superuser)) && (
                          <Button 
                            variant="outlined" 
                            color="secondary"
                            onClick={() => navigate(`/admin-panel/user/${data.id}`)}
                            sx={{ borderRadius: 3, px: 3, fontWeight: 'bold', py: 1 }}
                          >
                              {t('admin.manageUser')}
                          </Button>
                      )}
                  </Stack>
              </Box>
          </CardContent>
      </Card>

      {/* Profile Navigation Tabs */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 4, overflow: 'hidden' }}>
          <Tabs 
            value={activeTab} 
            onChange={(_, v) => setActiveTab(v)} 
            variant="fullWidth"
            sx={{ 
                bgcolor: alpha(theme.palette.background.paper, 0.4),
                '& .MuiTab-root': { fontWeight: 'bold', py: 2 } 
            }}
          >
              <Tab label="Ratings" />
              <Tab label="Guestbook" />
              <Tab label="Followers" />
              <Tab label="Following" />
          </Tabs>
      </Paper>

      {/* Content Area */}
      <Box sx={{ minHeight: 400 }}>
          {/* TAB 0: RATINGS */}
          {activeTab === 0 && (
              <Box>
                  <Box sx={{ mb: 4, display: 'flex', overflowX: 'auto', pb: 1, gap: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
                      {ratingCategories.map((cat, idx) => (
                          <Chip 
                            key={cat} label={cat} 
                            onClick={() => setCategoryTab(idx)}
                            color={categoryTab === idx ? 'primary' : 'default'}
                            variant={categoryTab === idx ? 'filled' : 'outlined'}
                            sx={{ fontWeight: 'bold', px: 1 }}
                          />
                      ))}
                  </Box>

                  <Stack spacing={6}>
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
                                          width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                          bgcolor: tier.color, color: 'black', fontWeight: '900', fontSize: '1.25rem',
                                          borderRadius: 2, boxShadow: `0 4px 12px ${alpha(tier.color, 0.4)}`
                                      }}>
                                          {tier.key}
                                      </Paper>
                                      <Typography variant="h5" sx={{ fontWeight: '900' }}>{tier.title}</Typography>
                                      <Divider sx={{ flexGrow: 1, borderStyle: 'dashed' }} />
                                  </Box>

                                  <Grid container spacing={2}>
                                      {items.map((rating: Rating) => (
                                          <Grid key={rating.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                                              <Card sx={{ 
                                                  height: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider',
                                                  transition: 'all 0.2s ease', '&:hover': { transform: 'translateY(-4px)', borderColor: 'primary.main', boxShadow: 4 }
                                              }}>
                                                  <Link to={`/flavor/${rating.flavor}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                      <Box sx={{ position: 'relative', aspectRatio: '1/1', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
                                                          <Box component="img" src={rating.flavor_image || undefined} sx={{ height: '80%', width: '80%', objectFit: 'contain', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.1))' }} />
                                                          <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
                                                              <RatingBadge score={rating.score} size="small" />
                                                          </Box>
                                                      </Box>
                                                      <CardContent sx={{ p: 2 }}>
                                                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                              {rating.flavor_name}
                                                          </Typography>
                                                          {rating.comment && (
                                                              <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontStyle: 'italic', minHeight: 32 }}>
                                                                  "<RichText text={rating.comment} />"
                                                              </Typography>
                                                          )}
                                                      </CardContent>
                                                  </Link>
                                                  {adminMode && (
                                                      <Box sx={{ px: 2, pb: 2 }}>
                                                          <Button 
                                                            size="small" fullWidth variant="outlined" color="secondary"
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/admin-panel/rating/${rating.id}`); }}
                                                            sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.7rem' }}
                                                          >
                                                              Manage Rating
                                                          </Button>
                                                      </Box>
                                                  )}
                                              </Card>
                                          </Grid>
                                      ))}
                                  </Grid>
                              </Box>
                          );
                      })}
                  </Stack>
              </Box>
          )}

          {/* TAB 1: GUESTBOOK */}
          {activeTab === 1 && (
              <Box maxWidth="md" sx={{ mx: 'auto' }}>
                  {currentUser && (
                      <Paper sx={{ p: 3, mb: 4, borderRadius: 3, border: '1px dashed', borderColor: 'divider' }}>
                          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>Leave a message</Typography>
                          <form onSubmit={handleAddComment}>
                              <TextField 
                                fullWidth multiline rows={3} placeholder="Write something nice..." 
                                value={newComment} onChange={(e) => setNewComment(e.target.value)}
                                sx={{ mb: 2 }}
                              />
                              <Button variant="contained" type="submit" endIcon={<SendIcon />} sx={{ borderRadius: 2 }}>
                                Post
                              </Button>
                          </form>
                      </Paper>
                  )}

                  <Stack spacing={2}>
                      {data.comments.length === 0 ? (
                          <Box sx={{ py: 8, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 4 }}>
                              <Typography color="text.secondary">No messages yet. Be the first!</Typography>
                          </Box>
                      ) : (
                          data.comments.map(comment => (
                              <Card key={comment.id} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                                  <CardContent sx={{ p: 2.5 }}>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                          <Stack direction="row" spacing={2} alignItems="center">
                                              <Link to={`/profile/${comment.author_username}`} style={{ textDecoration: 'none' }}>
                                                  <Avatar src={comment.author_avatar || undefined} sx={{ width: 40, height: 40 }}>
                                                      {comment.author_username.charAt(0).toUpperCase()}
                                                  </Avatar>
                                              </Link>
                                              <Box>
                                                  <Link to={`/profile/${comment.author_username}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{comment.author_username}</Typography>
                                                  </Link>
                                                  <Typography variant="caption" color="text.secondary">{formatDate(comment.created_at)}</Typography>
                                              </Box>
                                          </Stack>
                                          {(currentUser?.username === comment.author_username || currentUser?.username === data.username || currentUser?.is_superuser) && (
                                              <IconButton size="small" color="error" onClick={() => handleDeleteComment(comment.id)}>
                                                  <DeleteIcon fontSize="small" />
                                              </IconButton>
                                          )}
                                      </Box>
                                      <Typography variant="body2" sx={{ mt: 2, pl: 7 }}>
                                          <RichText text={comment.text} />
                                      </Typography>
                                  </CardContent>
                              </Card>
                          ))
                      )}
                  </Stack>
              </Box>
          )}

          {/* TAB 2: FOLLOWERS */}
          {activeTab === 2 && (
              <Grid container spacing={2}>
                  {data.followers.length === 0 ? (
                      <Grid size={12}><Typography sx={{ py: 4, textAlign: 'center' }} color="text.secondary">No followers yet.</Typography></Grid>
                  ) : (
                      data.followers.map(follower => (
                          <Grid key={follower.id} size={{ xs: 12, sm: 6, md: 4 }}>
                              <Card component={Link} to={`/profile/${follower.username}`} sx={{ textDecoration: 'none', borderRadius: 3, border: '1px solid', borderColor: 'divider', '&:hover': { borderColor: 'primary.main' } }}>
                                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                      <Avatar src={follower.avatar || undefined}>{follower.username.charAt(0)}</Avatar>
                                      <Typography sx={{ fontWeight: 'bold', color: 'text.primary' }}>{follower.username}</Typography>
                                  </CardContent>
                              </Card>
                          </Grid>
                      ))
                  )}
              </Grid>
          )}

          {/* TAB 3: FOLLOWING */}
          {activeTab === 3 && (
              <Grid container spacing={2}>
                  {data.following.length === 0 ? (
                      <Grid size={12}><Typography sx={{ py: 4, textAlign: 'center' }} color="text.secondary">Not following anyone yet.</Typography></Grid>
                  ) : (
                      data.following.map(user => (
                          <Grid key={user.id} size={{ xs: 12, sm: 6, md: 4 }}>
                              <Card component={Link} to={`/profile/${user.username}`} sx={{ textDecoration: 'none', borderRadius: 3, border: '1px solid', borderColor: 'divider', '&:hover': { borderColor: 'primary.main' } }}>
                                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                      <Avatar src={user.avatar || undefined}>{user.username.charAt(0)}</Avatar>
                                      <Typography sx={{ fontWeight: 'bold', color: 'text.primary' }}>{user.username}</Typography>
                                  </CardContent>
                              </Card>
                          </Grid>
                      ))
                  )}
              </Grid>
          )}
      </Box>
    </Container>
  );
};

export default PublicProfile;
