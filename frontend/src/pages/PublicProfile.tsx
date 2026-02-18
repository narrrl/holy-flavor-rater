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
import ColorThief from 'colorthief';
import api from '../api';
import { useTitle } from '../hooks/useTitle';
import { useTranslation } from 'react-i18next';
import RatingBadge from '../components/RatingBadge';
import RichText from '../components/RichText';
import DynamicBanner from '../components/DynamicBanner';
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
  const [palette, setPalette] = useState<string[]>([]);
  
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

  useEffect(() => {
      if (data?.avatar) {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.src = data.avatar;
          img.onload = () => {
              const colorThief = new ColorThief();
              try {
                  const palette = colorThief.getPalette(img, 10);
                  
                  // Filter for colors that are neither too dark nor too bright (washed out)
                  // and prefer higher saturation
                  const processed = palette.map(c => {
                      const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
                      const max = Math.max(r, g, b), min = Math.min(r, g, b);
                      const l = (max + min) / 2;
                      const s = max === min ? 0 : (l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min));
                      return { rgb: `rgb(${c[0]}, ${c[1]}, ${c[2]})`, l, s };
                  });

                  // Sort by saturation (highest first) then filter by luminance (0.3 - 0.8 range)
                  const vibrant = processed
                      .filter(c => c.l > 0.2 && c.l < 0.85) // Avoid pure black/white
                      .sort((a, b) => b.s - a.s); // Prefer colorful ones

                  if (vibrant.length >= 2) {
                      setPalette([vibrant[0].rgb, vibrant[1].rgb]);
                  } else if (vibrant.length === 1) {
                      setPalette([vibrant[0].rgb, vibrant[0].rgb]);
                  } else {
                      setPalette([]);
                  }
              } catch (e) {
                  setPalette([]);
              }
          };
      } else {
          setPalette([]);
      }
  }, [data?.avatar]);

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

  const bannerColors = [
      palette[0] || theme.palette.primary.main,
      palette[1] || theme.palette.secondary.main,
      theme.palette.secondary.main,
      theme.palette.primary.main
  ];

  const abstractBanner = `
    radial-gradient(at 0% 0%, ${alpha(bannerColors[0], 0.6)} 0px, transparent 55%),
    radial-gradient(at 100% 0%, ${alpha(bannerColors[1], 0.5)} 0px, transparent 55%),
    radial-gradient(at 100% 100%, ${alpha(bannerColors[2], 0.4)} 0px, transparent 55%),
    radial-gradient(at 0% 100%, ${alpha(bannerColors[3], 0.3)} 0px, transparent 55%),
    radial-gradient(at 50% 50%, ${alpha(bannerColors[0], 0.3)} 0px, transparent 60%),
    linear-gradient(135deg, ${alpha(bannerColors[0], 0.1)} 0%, ${alpha(bannerColors[1], 0.1)} 100%)
  `;

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
          <Box sx={{ 
              height: { xs: 120, sm: 180 }, 
              position: 'relative',
              overflow: 'hidden'
          }}>
              {/* Layer 1: Abstract Mesh Background */}
              <Box sx={{ 
                  position: 'absolute', 
                  top: 0, left: 0, right: 0, bottom: 0, 
                  background: abstractBanner,
                  zIndex: 0
              }} />
              
              {/* Layer 2: Interactive Generative Art */}
              <DynamicBanner 
                username={data.username} 
                palette={palette} 
                ratingsCount={data.ratings.length} 
                followersCount={data.followers_count} 
              />
          </Box>
          
          <CardContent sx={{ pt: 0, px: { xs: 2, md: 5 }, pb: { xs: 2, md: 4 }, position: 'relative', zIndex: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'center', sm: 'flex-end' }, gap: { xs: 2, sm: 4 } }}>
                  <Box sx={{ 
                      position: 'relative',
                      mt: { xs: -7, sm: -10 },
                      p: 0.75,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${bannerColors[0]}, ${bannerColors[2]})`,
                      boxShadow: '0 12px 48px rgba(0,0,0,0.25)',
                      display: 'flex'
                  }}>
                      <Avatar 
                        src={data.avatar || undefined} 
                        sx={{ 
                            width: { xs: 140, sm: 180 }, 
                            height: { xs: 140, sm: 180 }, 
                            border: '6px solid', 
                            borderColor: (theme) => theme.palette.background.paper,
                            fontSize: '4.5rem',
                            bgcolor: (theme) => theme.palette.background.paper,
                            color: bannerColors[0],
                        }}
                      >
                          {!data.avatar && data.username.charAt(0).toUpperCase()}
                      </Avatar>
                      {data.ratings.length > 50 && (
                          <Tooltip title="Master Collector">
                              <VerifiedIcon color="primary" sx={{ position: 'absolute', bottom: 12, right: 12, bgcolor: 'background.paper', borderRadius: '50%', fontSize: '2.2rem', p: 0.2, border: '3px solid', borderColor: bannerColors[0] }} />
                          </Tooltip>
                      )}
                  </Box>
                  
                  <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' }, mt: { xs: 2, sm: 6 } }}>
                      <Typography 
                        variant="h2" 
                        sx={{ 
                            fontWeight: '900', 
                            letterSpacing: -2, 
                            fontSize: { xs: '2.8rem', sm: '4.2rem' }, 
                            lineHeight: 0.9,
                            color: 'text.primary',
                            position: 'relative',
                            display: 'inline-block',
                            mb: 2
                        }}
                      >
                          {data.username}
                      </Typography>
                      
                      <Box>
                          <Paper 
                            elevation={0}
                            sx={{ 
                                display: 'inline-flex',
                                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                overflow: 'hidden',
                                backdropFilter: 'blur(8px)'
                            }}
                          >
                              {[
                                  { label: 'Rated', val: data.ratings.length },
                                  { label: 'Followers', val: data.followers_count },
                                  { label: 'Following', val: data.following_count }
                              ].map((stat, i) => (
                                  <React.Fragment key={stat.label}>
                                      <Box sx={{ py: 1.2, width: { xs: 90, sm: 120 }, textAlign: 'center' }}>
                                          <Typography variant="h6" sx={{ fontWeight: '900', lineHeight: 1, color: 'text.primary' }}>{stat.val}</Typography>
                                          <Typography variant="caption" sx={{ fontWeight: '900', textTransform: 'uppercase', opacity: 0.5, fontSize: '0.6rem', letterSpacing: 1 }}>{stat.label}</Typography>
                                      </Box>
                                      {i < 2 && <Divider orientation="vertical" flexItem sx={{ borderStyle: 'solid', opacity: 0.1 }} />}
                                  </React.Fragment>
                              ))}
                          </Paper>
                      </Box>
                  </Box>

                  <Stack direction="row" spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: 'center', mb: 1 }}>
                      {currentUser?.username !== data.username && (
                          <Button 
                            variant={data.is_following ? "outlined" : "contained"} 
                            onClick={handleFollowToggle}
                            startIcon={data.is_following ? <PersonRemoveIcon /> : <PersonAddIcon />}
                            sx={{ borderRadius: 1, px: 4, fontWeight: '900', py: 1.2, textTransform: 'none', fontSize: '1rem' }}
                          >
                              {data.is_following ? "Unfollow" : "Follow"}
                          </Button>
                      )}
                      {currentUser?.is_superuser && (
                          <Button 
                            variant="outlined" 
                            color="secondary"
                            onClick={() => navigate(`/admin-panel/user/${data.id}`)}
                            sx={{ borderRadius: 1, px: 2.5, fontWeight: 'bold', textTransform: 'none' }}
                          >
                              {t('admin.manageUser')}
                          </Button>
                      )}
                  </Stack>
              </Box>
          </CardContent>
      </Card>

      <Box sx={{ mb: 4, position: 'sticky', top: 80, zIndex: 10, bgcolor: alpha(theme.palette.background.default, 0.9), backdropFilter: 'blur(12px)', py: 1, borderRadius: 1, border: '1px solid', borderColor: alpha(theme.palette.divider, 0.1) }}>
          <Tabs 
            value={activeTab} 
            onChange={(_, v) => setActiveTab(v)} 
            variant="fullWidth"
            sx={{ 
                '& .MuiTab-root': { fontWeight: '900', textTransform: 'none', fontSize: '1rem', borderRadius: 1 },
                '& .Mui-selected': { color: 'primary.main' }
            }}
          >
              <Tab label="Ratings" />
              <Tab label="Guestbook" />
              <Tab label="Followers" />
              <Tab label="Following" />
          </Tabs>
      </Box>

      <Box sx={{ minHeight: 400 }}>
          {activeTab === 0 && (
              <Box>
                  <Box sx={{ mb: 5, display: 'flex', overflowX: 'auto', pb: 1, gap: 1.5, '&::-webkit-scrollbar': { display: 'none' } }}>
                      {ratingCategories.map((cat, idx) => (
                          <Chip 
                            key={cat} label={cat} 
                            onClick={() => setCategoryTab(idx)}
                            color={categoryTab === idx ? 'primary' : 'default'}
                            variant={categoryTab === idx ? 'filled' : 'outlined'}
                            sx={{ fontWeight: '900', px: 1.5, borderRadius: 1 }}
                          />
                      ))}
                  </Box>

                  <Stack spacing={10}>
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
                                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 3 }}>
                                      <Paper sx={{ 
                                          width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                          bgcolor: tier.color, color: 'black', fontWeight: '900', fontSize: '2rem',
                                          borderRadius: 0.5, boxShadow: `0 0 20px ${alpha(tier.color, 0.6)}`
                                      }}>
                                          {tier.key}
                                      </Paper>
                                      <Box>
                                          <Typography variant="h4" sx={{ fontWeight: '900', lineHeight: 1.1, letterSpacing: -0.5 }}>{tier.title}</Typography>
                                          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 'bold', opacity: 0.7 }}>{items.length} items</Typography>
                                      </Box>
                                      <Divider sx={{ flexGrow: 1, borderStyle: 'dashed', opacity: 0.3 }} />
                                  </Box>

                                  <Grid container spacing={3}>
                                      {items.map((rating: Rating) => (
                                          <Grid key={rating.id} size={{ xs: 6, sm: 4, lg: 2.4 }}>
                                              <Card sx={{ 
                                                  height: '100%', borderRadius: 1, border: '1px solid', borderColor: 'divider',
                                                  bgcolor: (theme) => alpha(theme.palette.background.paper, 0.4),
                                                  transition: 'all 0.3s ease', 
                                                  overflow: 'hidden',
                                                  '&:hover': { transform: 'translateY(-8px)', borderColor: 'primary.main', boxShadow: '0 12px 32px rgba(0,0,0,0.1)' }
                                              }}>
                                                  <Link to={`/flavor/${rating.flavor}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                      <Box sx={{ 
                                                          position: 'relative', 
                                                          aspectRatio: '1/1', 
                                                          bgcolor: 'background.default', 
                                                          display: 'flex', 
                                                          alignItems: 'center', 
                                                          justifyContent: 'center',
                                                          borderBottom: '1px solid',
                                                          borderColor: 'divider',
                                                          overflow: 'hidden'
                                                      }}>
                                                          <Box 
                                                            component="img" 
                                                            src={rating.flavor_image || undefined} 
                                                            sx={{ 
                                                                height: '100%', 
                                                                width: '100%', 
                                                                objectFit: 'cover',
                                                                transition: 'transform 0.5s ease',
                                                                '&:hover': { transform: 'scale(1.1)' }
                                                            }} 
                                                          />
                                                          <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}>
                                                              <RatingBadge score={rating.score} size="small" />
                                                          </Box>
                                                      </Box>
                                                      <CardContent sx={{ p: 1.5, textAlign: 'center' }}>
                                                          <Typography variant="subtitle2" sx={{ fontWeight: '900', fontSize: '0.85rem', lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                              {rating.flavor_name}
                                                          </Typography>
                                                      </CardContent>
                                                  </Link>
                                                  {adminMode && (
                                                      <Box sx={{ px: 1, pb: 1 }}>
                                                          <Button 
                                                            size="small" fullWidth variant="outlined" color="secondary"
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/admin-panel/rating/${rating.id}`); }}
                                                            sx={{ borderRadius: 1, textTransform: 'none', fontSize: '0.6rem', py: 0, fontWeight: 'bold' }}
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
                      <Paper sx={{ p: 4, mb: 5, borderRadius: 4, border: '1px solid', borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                          <Typography variant="h5" gutterBottom sx={{ fontWeight: '900', mb: 2 }}>Leave a message</Typography>
                          <form onSubmit={handleAddComment}>
                              <TextField 
                                fullWidth multiline rows={3} placeholder="Say something about their taste..." 
                                value={newComment} onChange={(e) => setNewComment(e.target.value)}
                                sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'background.paper' } }}
                              />
                              <Button variant="contained" type="submit" endIcon={<SendIcon />} sx={{ borderRadius: 2, px: 5, py: 1.2, fontWeight: '900', fontSize: '1rem', textTransform: 'none' }}>
                                Send Message
                              </Button>
                          </form>
                      </Paper>
                  )}

                  <Stack spacing={2.5}>
                      {data.comments.length === 0 ? (
                          <Box sx={{ py: 12, textAlign: 'center', bgcolor: alpha(theme.palette.action.hover, 0.5), borderRadius: 4, border: '2px dashed', borderColor: 'divider' }}>
                              <Typography color="text.secondary" variant="h6" sx={{ fontWeight: 'bold' }}>No entries in the guestbook yet.</Typography>
                              <Typography variant="body2" color="text.secondary">Be the first to leave a message!</Typography>
                          </Box>
                      ) : (
                          data.comments.map(comment => (
                              <Card key={comment.id} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', transition: 'all 0.2s', '&:hover': { borderColor: 'primary.main', bgcolor: alpha(theme.palette.background.paper, 0.8) } }}>
                                  <CardContent sx={{ p: 3 }}>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                          <Stack direction="row" spacing={2.5} alignItems="center">
                                              <Link to={`/profile/${comment.author_username}`} style={{ textDecoration: 'none' }}>
                                                  <Avatar src={comment.author_avatar || undefined} sx={{ width: 48, height: 48, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '2px solid white' }}>
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
                                      <Typography variant="body1" sx={{ mt: 3, pl: { xs: 0, sm: 9.5 }, lineHeight: 1.7, fontSize: '1rem' }}>
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
                      <Grid size={12}><Typography variant="h6" color="text.secondary" sx={{ py: 12, textAlign: 'center', fontWeight: 'bold' }}>No followers yet.</Typography></Grid>
                  ) : (
                      data.followers.map(user => (
                          <Grid key={user.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                              <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden', transition: 'all 0.3s ease', '&:hover': { borderColor: 'primary.main', transform: 'translateY(-4px)' } }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', p: 2, gap: 2 }}>
                                      <Avatar component={Link} to={`/profile/${user.username}`} src={user.avatar || undefined} sx={{ width: 56, height: 56, cursor: 'pointer', border: '2px solid', borderColor: 'divider' }}>{user.username.charAt(0)}</Avatar>
                                      <Box sx={{ flex: 1, minWidth: 0 }}>
                                          <Typography component={Link} to={`/profile/${user.username}`} variant="subtitle1" sx={{ fontWeight: '900', color: 'text.primary', textDecoration: 'none', '&:hover': { color: 'primary.main' }, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                              {user.username}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>Community Member</Typography>
                                      </Box>
                                      {currentUser && currentUser.username !== user.username && (
                                          <IconButton 
                                            color={user.is_following ? "secondary" : "primary"} 
                                            onClick={() => handleMiniFollowToggle(user)}
                                            sx={{ bgcolor: alpha(user.is_following ? theme.palette.secondary.main : theme.palette.primary.main, 0.1), '&:hover': { bgcolor: alpha(user.is_following ? theme.palette.secondary.main : theme.palette.primary.main, 0.2) } }}
                                          >
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
                      <Grid size={12}><Typography variant="h6" color="text.secondary" sx={{ py: 12, textAlign: 'center', fontWeight: 'bold' }}>Not following anyone yet.</Typography></Grid>
                  ) : (
                      data.following.map(user => (
                          <Grid key={user.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                              <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden', transition: 'all 0.3s ease', '&:hover': { borderColor: 'primary.main', transform: 'translateY(-4px)' } }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', p: 2, gap: 2 }}>
                                      <Avatar component={Link} to={`/profile/${user.username}`} src={user.avatar || undefined} sx={{ width: 56, height: 56, cursor: 'pointer', border: '2px solid', borderColor: 'divider' }}>{user.username.charAt(0)}</Avatar>
                                      <Box sx={{ flex: 1, minWidth: 0 }}>
                                          <Typography component={Link} to={`/profile/${user.username}`} variant="subtitle1" sx={{ fontWeight: '900', color: 'text.primary', textDecoration: 'none', '&:hover': { color: 'primary.main' }, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                              {user.username}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>Community Member</Typography>
                                      </Box>
                                      {currentUser && currentUser.username !== user.username && (
                                          <IconButton 
                                            color={user.is_following ? "secondary" : "primary"} 
                                            onClick={() => handleMiniFollowToggle(user)}
                                            sx={{ bgcolor: alpha(user.is_following ? theme.palette.secondary.main : theme.palette.primary.main, 0.1), '&:hover': { bgcolor: alpha(user.is_following ? theme.palette.secondary.main : theme.palette.primary.main, 0.2) } }}
                                          >
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
