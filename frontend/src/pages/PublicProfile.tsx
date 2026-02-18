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
  Chip,
  Tooltip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import VerifiedIcon from '@mui/icons-material/Verified';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
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
    is_following?: boolean;
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
  const [activeTab, setActiveTab] = useState(0); 
  const [categoryTab, setCategoryTab] = useState(0);
  const [currentUser, setCurrentUser] = useState<{username: string, is_superuser: boolean} | null>(null);
  
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

  const handleMiniFollowToggle = async (user: MiniUser) => {
      try {
          if (user.is_following) {
              await api.post(`users/${user.id}/unfollow/`);
          } else {
              await api.post(`users/${user.id}/follow/`);
          }
          fetchProfile();
      } catch (err) { alert('Failed'); }
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

      {/* Uplifted Profile Header */}
      <Card elevation={0} sx={{ 
          borderRadius: 5, 
          border: '1px solid', 
          borderColor: 'divider',
          bgcolor: (theme) => alpha(theme.palette.background.paper, 0.6),
          backdropFilter: 'blur(20px)',
          mb: 4,
          overflow: 'hidden',
          position: 'relative'
      }}>
          {/* Decorative Gradient Banner */}
          <Box sx={{ 
              height: 160, 
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.4)} 0%, ${alpha(theme.palette.secondary.main, 0.2)} 100%)`,
              position: 'relative',
              '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)',
                  backgroundSize: '24px 24px'
              }
          }} />
          
          <CardContent sx={{ pt: 0, px: { xs: 2, md: 5 }, pb: 4 }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'center', sm: 'flex-end' }, gap: { xs: 2, sm: 4 }, mt: -8 }}>
                  <Box sx={{ position: 'relative' }}>
                      <Avatar 
                        src={data.avatar || undefined} 
                        sx={{ 
                            width: { xs: 140, sm: 160 }, 
                            height: { xs: 140, sm: 160 }, 
                            border: '8px solid', 
                            borderColor: (theme) => theme.palette.background.paper,
                            boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
                            fontSize: '4rem',
                            bgcolor: 'primary.main',
                            transition: 'transform 0.3s ease',
                            '&:hover': { transform: 'scale(1.02)' }
                        }}
                      >
                          {!data.avatar && data.username.charAt(0).toUpperCase()}
                      </Avatar>
                      {data.ratings.length > 50 && (
                          <Tooltip title="Master Collector">
                              <VerifiedIcon color="primary" sx={{ position: 'absolute', bottom: 10, right: 10, bgcolor: 'background.paper', borderRadius: '50%', fontSize: '2rem' }} />
                          </Tooltip>
                      )}
                  </Box>
                  
                  <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' }, mb: { xs: 1, sm: 2 } }}>
                      <Typography variant="h2" sx={{ fontWeight: '900', letterSpacing: -1, fontSize: { xs: '2.5rem', sm: '3.5rem' } }}>
                          {data.username}
                      </Typography>
                      
                      <Stack 
                        direction="row" 
                        spacing={{ xs: 2, sm: 4 }} 
                        sx={{ 
                            mt: 2, 
                            justifyContent: { xs: 'center', sm: 'flex-start' },
                            bgcolor: alpha(theme.palette.action.hover, 0.5),
                            p: 1.5,
                            borderRadius: 3,
                            width: 'fit-content',
                            mx: { xs: 'auto', sm: 0 }
                        }}
                      >
                          <Box>
                              <Typography variant="h6" sx={{ fontWeight: '900', color: 'primary.main', lineHeight: 1 }}>{data.ratings.length}</Typography>
                              <Typography variant="caption" sx={{ fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.6, fontSize: '0.65rem' }}>Rated</Typography>
                          </Box>
                          <Divider orientation="vertical" flexItem />
                          <Box>
                              <Typography variant="h6" sx={{ fontWeight: '900', lineHeight: 1 }}>{data.followers_count}</Typography>
                              <Typography variant="caption" sx={{ fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.6, fontSize: '0.65rem' }}>Followers</Typography>
                          </Box>
                          <Divider orientation="vertical" flexItem />
                          <Box>
                              <Typography variant="h6" sx={{ fontWeight: '900', lineHeight: 1 }}>{data.following_count}</Typography>
                              <Typography variant="caption" sx={{ fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.6, fontSize: '0.65rem' }}>Following</Typography>
                          </Box>
                      </Stack>
                  </Box>

                  <Stack direction="row" spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: 'center', mb: { xs: 0, sm: 2 } }}>
                      {currentUser?.username !== data.username && (
                          <Button 
                            variant={data.is_following ? "outlined" : "contained"} 
                            onClick={handleFollowToggle}
                            startIcon={data.is_following ? <PersonRemoveIcon /> : <PersonAddIcon />}
                            sx={{ borderRadius: 3, px: 4, fontWeight: '900', py: 1.2, textTransform: 'none' }}
                          >
                              {data.is_following ? "Unfollow" : "Follow"}
                          </Button>
                      )}
                      {currentUser?.is_superuser && (
                          <Button 
                            variant="outlined" 
                            color="secondary"
                            onClick={() => navigate(`/admin-panel/user/${data.id}`)}
                            sx={{ borderRadius: 3, px: 2, fontWeight: 'bold', textTransform: 'none' }}
                          >
                              {t('admin.manageUser')}
                          </Button>
                      )}
                  </Stack>
              </Box>
          </CardContent>
      </Card>

      {/* Profile Navigation Tabs */}
      <Box sx={{ mb: 4, position: 'sticky', top: 80, zIndex: 10, bgcolor: alpha(theme.palette.background.default, 0.8), backdropFilter: 'blur(8px)', py: 1, borderRadius: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={(_, v) => setActiveTab(v)} 
            variant="fullWidth"
            sx={{ 
                '& .MuiTab-root': { fontWeight: '900', textTransform: 'none', fontSize: '1rem' },
                '& .Mui-selected': { color: 'primary.main' }
            }}
          >
              <Tab label="Ratings" />
              <Tab label="Guestbook" />
              <Tab label="Followers" />
              <Tab label="Following" />
          </Tabs>
      </Box>

      {/* Content Area */}
      <Box sx={{ minHeight: 400 }}>
          {activeTab === 0 && (
              <Box>
                  <Box sx={{ mb: 4, display: 'flex', overflowX: 'auto', pb: 1, gap: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
                      {ratingCategories.map((cat, idx) => (
                          <Chip 
                            key={cat} label={cat} 
                            onClick={() => setCategoryTab(idx)}
                            color={categoryTab === idx ? 'primary' : 'default'}
                            sx={{ fontWeight: 'bold', px: 1 }}
                          />
                      ))}
                  </Box>

                  <Stack spacing={8}>
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
                                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 2.5 }}>
                                      <Paper sx={{ 
                                          width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                          bgcolor: tier.color, color: 'black', fontWeight: '900', fontSize: '1.75rem',
                                          borderRadius: 2.5, boxShadow: `0 8px 24px ${alpha(tier.color, 0.4)}`
                                      }}>
                                          {tier.key}
                                      </Paper>
                                      <Box>
                                          <Typography variant="h5" sx={{ fontWeight: '900', lineHeight: 1.2 }}>{tier.title}</Typography>
                                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>{items.length} items</Typography>
                                      </Box>
                                      <Divider sx={{ flexGrow: 1, borderStyle: 'dashed', opacity: 0.5 }} />
                                  </Box>

                                  <Grid container spacing={3}>
                                      {items.map((rating: Rating) => (
                                          <Grid key={rating.id} size={{ xs: 6, sm: 4, md: 3, lg: 2.4 }}>
                                              <Card sx={{ 
                                                  height: '100%', borderRadius: 4, border: '1px solid', borderColor: 'divider',
                                                  bgcolor: (theme) => alpha(theme.palette.background.paper, 0.4),
                                                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                                                  '&:hover': { transform: 'translateY(-8px)', borderColor: 'primary.main', boxShadow: '0 12px 32px rgba(0,0,0,0.12)' }
                                              }}>
                                                  <Link to={`/flavor/${rating.flavor}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                      <Box sx={{ position: 'relative', aspectRatio: '1/1', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
                                                          <Box component="img" src={rating.flavor_image || undefined} sx={{ height: '85%', width: '85%', objectFit: 'contain', filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.15))' }} />
                                                          <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
                                                              <RatingBadge score={rating.score} size="small" />
                                                          </Box>
                                                      </Box>
                                                      <CardContent sx={{ p: 2 }}>
                                                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: '0.85rem' }}>
                                                              {rating.flavor_name}
                                                          </Typography>
                                                          {rating.comment && (
                                                              <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontStyle: 'italic', minHeight: 32, lineHeight: 1.3 }}>
                                                                  "<RichText text={rating.comment} />"
                                                              </Typography>
                                                          )}
                                                      </CardContent>
                                                  </Link>
                                                  {adminMode && (
                                                      <Box sx={{ px: 1.5, pb: 1.5 }}>
                                                          <Button 
                                                            size="small" fullWidth variant="outlined" color="secondary"
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/admin-panel/rating/${rating.id}`); }}
                                                            sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.65rem', py: 0 }}
                                                          >
                                                              Manage
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

          {activeTab === 1 && (
              <Box maxWidth="md" sx={{ mx: 'auto' }}>
                  {currentUser && (
                      <Paper sx={{ p: 3, mb: 4, borderRadius: 4, border: '1px solid', borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                          <Typography variant="h6" gutterBottom sx={{ fontWeight: '900' }}>Leave a message</Typography>
                          <form onSubmit={handleAddComment}>
                              <TextField 
                                fullWidth multiline rows={3} placeholder="Say something about their taste..." 
                                value={newComment} onChange={(e) => setNewComment(e.target.value)}
                                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                              />
                              <Button variant="contained" type="submit" endIcon={<SendIcon />} sx={{ borderRadius: 3, px: 4, fontWeight: 'bold' }}>
                                Send Message
                              </Button>
                          </form>
                      </Paper>
                  )}

                  <Stack spacing={2}>
                      {data.comments.length === 0 ? (
                          <Box sx={{ py: 10, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 5, border: '2px dashed', borderColor: 'divider' }}>
                              <Typography color="text.secondary" variant="h6">No messages yet. Be the first to break the ice!</Typography>
                          </Box>
                      ) : (
                          data.comments.map(comment => (
                              <Card key={comment.id} elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', transition: 'border-color 0.2s', '&:hover': { borderColor: 'primary.main' } }}>
                                  <CardContent sx={{ p: 3 }}>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                          <Stack direction="row" spacing={2} alignItems="center">
                                              <Link to={`/profile/${comment.author_username}`} style={{ textDecoration: 'none' }}>
                                                  <Avatar src={comment.author_avatar || undefined} sx={{ width: 48, height: 48, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                                      {comment.author_username.charAt(0).toUpperCase()}
                                                  </Avatar>
                                              </Link>
                                              <Box>
                                                  <Link to={`/profile/${comment.author_username}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                      <Typography variant="subtitle1" sx={{ fontWeight: '900', lineHeight: 1.2 }}>{comment.author_username}</Typography>
                                                  </Link>
                                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>{formatDate(comment.created_at)}</Typography>
                                              </Box>
                                          </Stack>
                                          {(currentUser?.username === comment.author_username || currentUser?.username === data.username || currentUser?.is_superuser) && (
                                              <IconButton size="small" color="error" onClick={() => handleDeleteComment(comment.id)}>
                                                  <DeleteIcon fontSize="small" />
                                              </IconButton>
                                          )}
                                      </Box>
                                      <Typography variant="body1" sx={{ mt: 2.5, pl: { xs: 0, sm: 8.5 }, lineHeight: 1.6 }}>
                                          <RichText text={comment.text} />
                                      </Typography>
                                  </CardContent>
                              </Card>
                          ))
                      )}
                  </Stack>
              </Box>
          )}

          {activeTab === 2 && (
              <Grid container spacing={3}>
                  {data.followers.length === 0 ? (
                      <Grid size={12}><Typography sx={{ py: 10, textAlign: 'center' }} color="text.secondary">No followers yet.</Typography></Grid>
                  ) : (
                      data.followers.map(user => (
                          <Grid key={user.id} size={{ xs: 12, sm: 6, md: 4 }}>
                              <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', overflow: 'hidden', transition: 'all 0.2s', '&:hover': { borderColor: 'primary.main', transform: 'translateY(-4px)' } }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', p: 2, gap: 2 }}>
                                      <Avatar component={Link} to={`/profile/${user.username}`} src={user.avatar || undefined} sx={{ width: 56, height: 56, cursor: 'pointer' }}>{user.username.charAt(0)}</Avatar>
                                      <Box sx={{ flex: 1, minWidth: 0 }}>
                                          <Typography component={Link} to={`/profile/${user.username}`} variant="subtitle1" sx={{ fontWeight: '900', color: 'text.primary', textDecoration: 'none', '&:hover': { color: 'primary.main' }, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                              {user.username}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">Community Member</Typography>
                                      </Box>
                                      {currentUser && currentUser.username !== user.username && (
                                          <IconButton color="primary" onClick={() => handleMiniFollowToggle(user)}>
                                              {user.is_following ? <PersonRemoveIcon /> : <PersonAddIcon />}
                                          </IconButton>
                                      )}
                                  </Box>
                              </Card>
                          </Grid>
                      ))
                  )}
              </Grid>
          )}

          {activeTab === 3 && (
              <Grid container spacing={3}>
                  {data.following.length === 0 ? (
                      <Grid size={12}><Typography sx={{ py: 10, textAlign: 'center' }} color="text.secondary">Not following anyone yet.</Typography></Grid>
                  ) : (
                      data.following.map(user => (
                          <Grid key={user.id} size={{ xs: 12, sm: 6, md: 4 }}>
                              <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', overflow: 'hidden', transition: 'all 0.2s', '&:hover': { borderColor: 'primary.main', transform: 'translateY(-4px)' } }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', p: 2, gap: 2 }}>
                                      <Avatar component={Link} to={`/profile/${user.username}`} src={user.avatar || undefined} sx={{ width: 56, height: 56, cursor: 'pointer' }}>{user.username.charAt(0)}</Avatar>
                                      <Box sx={{ flex: 1, minWidth: 0 }}>
                                          <Typography component={Link} to={`/profile/${user.username}`} variant="subtitle1" sx={{ fontWeight: '900', color: 'text.primary', textDecoration: 'none', '&:hover': { color: 'primary.main' }, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                              {user.username}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">Community Member</Typography>
                                      </Box>
                                      {currentUser && currentUser.username !== user.username && (
                                          <IconButton color="primary" onClick={() => handleMiniFollowToggle(user)}>
                                              {user.is_following ? <PersonRemoveIcon /> : <PersonAddIcon />}
                                          </IconButton>
                                      )}
                                  </Box>
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
