import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Rating as MuiRating, 
  Button, 
  TextField,
  Avatar,
  Paper,
  CircularProgress,
  Container,
  Grid,
  Chip,
  Stack,
  alpha,
  useTheme
} from '@mui/material';
import api from '../../api';
import { useTitle } from '../../hooks/useTitle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import VerifiedIcon from '@mui/icons-material/Verified';
import StarIcon from '@mui/icons-material/Star';

interface Reply {
    id: number;
    user: string;
    text: string;
    created_at: string;
}

interface Rating {
    id: number;
    user: string;
    user_avatar: string | null;
    score: number;
    comment: string;
    created_at: string;
    replies: Reply[];
}

interface Flavor {
  id: number;
  name: string;
  category_name: string;
  category_slug: string;
  description: string;
  average_rating: number;
  user_rating: number | null;
  ratings: Rating[];
  image_url: string | null;
  is_available: boolean;
  is_legacy: boolean;
  shop_url: string | null;
}

const FlavorDetail: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [flavor, setFlavor] = useState<Flavor | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyInputs, setReplyInputs] = useState<{[key: number]: string}>({});
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  
  // Rating form state
  const [newScore, setNewScore] = useState<number | null>(null);
  const [newComment, setNewComment] = useState('');
  
  // Edit state
  const [editMode, setEditMode] = useState<number | null>(null);
  const [editScore, setEditScore] = useState(0);
  const [editComment, setEditComment] = useState('');

  // Reply Edit state
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
  const [editReplyText, setEditReplyText] = useState('');

  const fetchFlavor = async () => {
    try {
      const res = await api.get(`flavors/${id}/`);
      setFlavor(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const getUser = async () => {
        try {
            const res = await api.get('users/me/');
            setCurrentUser(res.data.username);
        } catch (e) { /* ignore */ }
    };
    getUser();
    fetchFlavor();
  }, [id]);

  useTitle(flavor?.name || t('common.loading'));

  const handleRatingSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newScore) {
          alert('Please select a score');
          return;
      }
      try {
          await api.post('ratings/', { flavor: flavor?.id, score: newScore, comment: newComment });
          setNewScore(null);
          setNewComment('');
          fetchFlavor();
      } catch (err: any) {
          alert(err.response?.data?.error || 'Failed to submit rating');
      }
  };

  const handleReplySubmit = async (ratingId: number) => {
      const text = replyInputs[ratingId];
      if (!text) return;
      try {
          await api.post(`ratings/${ratingId}/reply/`, { text });
          setReplyInputs({ ...replyInputs, [ratingId]: '' });
          fetchFlavor();
      } catch (err) {
          alert('Failed to submit reply');
      }
  };

  const handleUpdateReply = async (replyId: number) => {
      if (!editReplyText) return;
      try {
          await api.patch(`replies/${replyId}/`, { text: editReplyText });
          setEditingReplyId(null);
          fetchFlavor();
      } catch (err) {
          alert('Failed to update reply');
      }
  };

  const handleDeleteReply = async (replyId: number) => {
      if (!confirm('Delete this reply?')) return;
      try {
          await api.delete(`replies/${replyId}/`);
          fetchFlavor();
      } catch (err) {
          alert('Failed to delete reply');
      }
  };

  const handleDeleteRating = async (ratingId: number) => {
      if (!confirm('Are you sure?')) return;
      try {
          await api.delete(`ratings/${ratingId}/`);
          fetchFlavor();
      } catch (err) {
          alert('Failed to delete review');
      }
  };

  const startEdit = (rating: Rating) => {
      setEditMode(rating.id);
      setEditScore(rating.score);
      setEditComment(rating.comment || '');
  };

  const handleUpdateRating = async (ratingId: number) => {
      try {
          await api.patch(`ratings/${ratingId}/`, { score: editScore, comment: editComment });
          setEditMode(null);
          fetchFlavor();
      } catch (err) {
          alert('Failed to update review');
      }
  };

  const handleGoBack = () => {
      if (window.history.length > 1) {
          navigate(-1);
      } else {
          navigate(`/category/${flavor?.category_slug}`);
      }
  };

    const renderTextWithMentions = (text: string) => {
        const parts = text.split(/(@\w+)/g);
        return parts.map((part, i) => {
            if (part.startsWith('@')) {
                const username = part.substring(1);
                return (
                    <Link 
                        key={i} 
                        to={`/profile/${username}`} 
                        style={{ 
                            color: theme.palette.primary.main, 
                            textDecoration: 'none', 
                            fontWeight: 'bold',
                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                            padding: '0 4px',
                            borderRadius: '4px'
                        }}
                    >
                        {part}
                    </Link>
                );
            }
            return part;
        });
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  if (!flavor) return <Typography>Flavor not found</Typography>;

  return (
    <Container maxWidth="xl" sx={{ px: { xs: 2, md: 6 }, py: 4 }}>
      {/* Top Bar */}
      <Box sx={{ mb: 4 }}>
          <Button 
            variant="text" 
            onClick={handleGoBack}
            startIcon={<ArrowBackIcon />}
            sx={{ textTransform: 'none', color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'transparent' } }}
          >
            {t('common.backTo')}
          </Button>
      </Box>

      {/* Hero Section */}
      <Grid container spacing={6} sx={{ mb: 8 }}>
          {/* Left: Image */}
          <Grid size={{ xs: 12, md: 6 }}>
              <Paper 
                elevation={0}
                sx={{ 
                    width: '100%', 
                    aspectRatio: '1/1', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    bgcolor: (theme) => alpha(theme.palette.background.paper, 0.4),
                    backdropFilter: 'blur(10px)',
                    borderRadius: 4,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: (theme) => alpha(theme.palette.text.primary, 0.05),
                    position: 'relative',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
                }}
              >
                  {!flavor.is_available && (
                        <Chip 
                            label={flavor.is_legacy ? "Unavailable" : "Out of Stock"} 
                            color={flavor.is_legacy ? "warning" : "error"}
                            sx={{ position: 'absolute', top: 16, right: 16, fontWeight: 'bold', backdropFilter: 'blur(4px)', bgcolor: (theme) => alpha(theme.palette[flavor.is_legacy ? 'warning' : 'error'].main, 0.8) }}
                        />
                  )}
                  {flavor.image_url ? (
                      <Box 
                        component="img" 
                        src={flavor.image_url} 
                        sx={{ 
                            width: '85%', 
                            height: '85%', 
                            objectFit: 'contain',
                            filter: 'drop-shadow(0px 15px 30px rgba(0,0,0,0.2))'
                        }} 
                      />
                  ) : (
                      <Typography color="text.secondary">No Image</Typography>
                  )}
              </Paper>
          </Grid>

          {/* Right: Info */}
          <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Box sx={{ mb: 2 }}>
                  <Chip label={flavor.category_name} size="small" sx={{ mb: 2, fontWeight: 'bold', bgcolor: 'action.hover' }} />
                  <Typography variant="h2" sx={{ fontWeight: '800', lineHeight: 1.1, mb: 2 }}>
                      {flavor.name}
                  </Typography>
                  
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'primary.main', color: 'primary.contrastText', px: 1.5, py: 0.5, borderRadius: 2 }}>
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{(flavor.average_rating || 0).toFixed(1)}</Typography>
                          <Typography variant="caption" sx={{ opacity: 0.8, ml: 0.5 }}>/ 10</Typography>
                      </Box>
                      <MuiRating value={flavor.average_rating || 0} readOnly precision={0.5} />
                      <Typography variant="body2" color="text.secondary">
                          {flavor.ratings.length} {t('common.reviews')}
                      </Typography>
                  </Stack>

                  <Typography variant="body1" sx={{ fontSize: '1.1rem', lineHeight: 1.8, color: 'text.secondary', mb: 4 }}>
                      {flavor.description}
                  </Typography>

                  {flavor.shop_url && (
                      <Button 
                        variant="contained" 
                        size="large" 
                        component="a" 
                        href={flavor.shop_url} 
                        target="_blank" 
                        startIcon={<ShoppingCartIcon />}
                        sx={{ 
                            borderRadius: 3, 
                            px: 4, 
                            py: 1.5, 
                            fontSize: '1rem', 
                            fontWeight: 'bold',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.15)' 
                        }}
                      >
                          {t('common.buyNow')}
                      </Button>
                  )}
              </Box>
          </Grid>
      </Grid>

      {/* Reviews Section */}
      <Container maxWidth="md" disableGutters>
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{t('home.communityVoice')}</Typography>
          </Box>

          {/* New Rating Form */}
          {currentUser && flavor.user_rating === null && (
              <Paper 
                variant="outlined" 
                sx={{ 
                    p: 4, mb: 6, 
                    borderRadius: 3, 
                    bgcolor: (theme) => alpha(theme.palette.background.paper, 0.3), 
                    backdropFilter: 'blur(8px)',
                    border: '1px dashed', 
                    borderColor: 'divider',
                    boxShadow: 'none'
                }}
              >
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>Rate this flavor</Typography>
                  <form onSubmit={handleRatingSubmit}>
                      <Box sx={{ mb: 3 }}>
                          <Typography component="legend" gutterBottom color="text.secondary">Score</Typography>
                          <MuiRating max={10} value={newScore} onChange={(_, val) => setNewScore(val)} size="large" />
                      </Box>
                      <TextField
                          fullWidth
                          multiline
                          rows={3}
                          placeholder="Share your thoughts..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          sx={{ mb: 3, bgcolor: 'background.paper' }}
                      />
                      <Button variant="contained" type="submit" disabled={!newScore} sx={{ borderRadius: 2 }}>
                          Submit Review
                      </Button>
                  </form>
              </Paper>
          )}

          <Stack spacing={3}>
            {flavor.ratings.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8, bgcolor: 'action.hover', borderRadius: 4 }}>
                    <Typography color="text.secondary">{t('dashboard.noRatings')}</Typography>
                </Box>
            ) : (
                flavor.ratings.map((rating: Rating) => (
                    <Card key={rating.id} variant="outlined" sx={{ borderRadius: 3, overflow: 'visible' }}>
                        <CardContent sx={{ p: 3 }}>
                            {editMode === rating.id ? (
                                // Edit Mode
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <MuiRating max={10} value={editScore} onChange={(_, val) => setEditScore(val || 0)} size="large" />
                                    <TextField 
                                        multiline 
                                        fullWidth 
                                        rows={3} 
                                        value={editComment} 
                                        onChange={(e) => setEditComment(e.target.value)}
                                    />
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Button variant="contained" onClick={() => handleUpdateRating(rating.id)}>Save</Button>
                                        <Button onClick={() => setEditMode(null)}>Cancel</Button>
                                    </Box>
                                </Box>
                            ) : (
                                // View Mode
                                <>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Link to={`/profile/${rating.user}`} style={{ textDecoration: 'none' }}>
                                                <Avatar src={rating.user_avatar || undefined} sx={{ width: 48, height: 48, border: '2px solid', borderColor: 'divider' }}>
                                                    {!rating.user_avatar && rating.user.charAt(0).toUpperCase()}
                                                </Avatar>
                                            </Link>
                                            <Box>
                                                <Link to={`/profile/${rating.user}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{rating.user}</Typography>
                                                </Link>
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(rating.created_at).toLocaleDateString()}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1), 
                                            backdropFilter: 'blur(4px)',
                                            px: 1.5, py: 0.5, 
                                            borderRadius: 2,
                                            border: '1px solid',
                                            borderColor: (theme) => alpha(theme.palette.primary.main, 0.1)
                                        }}>
                                            <StarIcon sx={{ fontSize: '1rem', color: 'primary.main', mr: 0.5 }} />
                                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>{rating.score}/10</Typography>
                                        </Box>
                                    </Box>

                                    {rating.comment && (
                                        <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.6 }}>
                                            {renderTextWithMentions(rating.comment)}
                                        </Typography>
                                    )}

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        {/* Reply Actions or Metadata */}
                                        <Box /> 
                                        {currentUser === rating.user && (
                                            <Box>
                                                <Button size="small" onClick={() => startEdit(rating)} sx={{ minWidth: 0, mr: 1 }}>Edit</Button>
                                                <Button size="small" color="error" onClick={() => handleDeleteRating(rating.id)} sx={{ minWidth: 0 }}>Delete</Button>
                                            </Box>
                                        )}
                                    </Box>
                                </>
                            )}

                            {/* Replies */}
                            {rating.replies.length > 0 && (
                                <Box sx={{ 
                                    mt: 2, 
                                    bgcolor: (theme) => alpha(theme.palette.text.primary, 0.03), 
                                    backdropFilter: 'blur(4px)',
                                    p: 2, 
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: (theme) => alpha(theme.palette.text.primary, 0.05)
                                }}>
                                    {rating.replies.map((reply: any) => (
                                        <Box key={reply.id} sx={{ mb: 1.5, '&:last-child': { mb: 0 } }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                                <Link to={`/profile/${reply.user}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                        {reply.user} 
                                                        {reply.user === rating.user && <VerifiedIcon sx={{ fontSize: '0.8rem', color: 'primary.main', ml: 0.5, verticalAlign: 'middle' }} />}
                                                    </Typography>
                                                </Link>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                                        {new Date(reply.created_at).toLocaleDateString()} {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </Typography>
                                                    {currentUser === reply.user && editingReplyId !== reply.id && (
                                                        <Box sx={{ display: 'flex' }}>
                                                            <Button size="small" sx={{ minWidth: 0, p: 0.5, fontSize: '0.7rem' }} onClick={() => { setEditingReplyId(reply.id); setEditReplyText(reply.text); }}>Edit</Button>
                                                            <Button size="small" color="error" sx={{ minWidth: 0, p: 0.5, fontSize: '0.7rem' }} onClick={() => handleDeleteReply(reply.id)}>Delete</Button>
                                                        </Box>
                                                    )}
                                                </Box>
                                            </Box>
                                            {editingReplyId === reply.id ? (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                                                    <TextField 
                                                        size="small" 
                                                        fullWidth 
                                                        multiline 
                                                        value={editReplyText} 
                                                        onChange={(e) => setEditReplyText(e.target.value)}
                                                    />
                                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                                        <Button variant="contained" size="small" onClick={() => handleUpdateReply(reply.id)}>Save</Button>
                                                        <Button size="small" onClick={() => setEditingReplyId(null)}>Cancel</Button>
                                                    </Box>
                                                </Box>
                                            ) : (
                                                <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                                                    {renderTextWithMentions(reply.text)}
                                                </Typography>
                                            )}
                                        </Box>
                                    ))}
                                </Box>
                            )}
                            
                            {currentUser && (
                                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                    <TextField 
                                        size="small" 
                                        placeholder="Write a reply..." 
                                        fullWidth 
                                        value={replyInputs[rating.id] || ''} 
                                        onChange={(e) => setReplyInputs({ ...replyInputs, [rating.id]: e.target.value })} 
                                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } }}
                                    />
                                    <Button variant="contained" size="small" disabled={!replyInputs[rating.id]} onClick={() => handleReplySubmit(rating.id)}>Reply</Button>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                ))
            )}
          </Stack>
      </Container>
    </Container>
  );
};

export default FlavorDetail;
