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
  Avatar,
  CircularProgress,
  Container,
  Grid,
  Chip,
  Stack,
  alpha,
  useTheme,
  Collapse
} from '@mui/material';
import api from '../../api';
import { useTitle } from '../../hooks/useTitle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import VerifiedIcon from '@mui/icons-material/Verified';
import CommentIcon from '@mui/icons-material/Comment';
import { formatDate } from '../../utils/date';
import MentionTextField from '../../components/MentionTextField';
import RichText from '../../components/RichText';
import RatingBadge from '../../components/RatingBadge';

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
  const [expandedReplies, setExpandedReplies] = useState<{[key: number]: boolean}>({});
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
          // Auto-expand replies when submitting a new one
          setExpandedReplies(prev => ({ ...prev, [ratingId]: true }));
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
          navigate('/');
      }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  if (!flavor) return <Typography>Flavor not found</Typography>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Top Bar */}
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

      {/* Main Content Grid */}
      <Grid container spacing={4}>
          {/* Left: Product Info Card */}
          <Grid size={{ xs: 12, md: 5, lg: 4 }}>
              <Box sx={{ position: { md: 'sticky' }, top: 100 }}>
                  <Card elevation={0} sx={{ 
                      borderRadius: 4, 
                      border: '1px solid', 
                      borderColor: 'divider',
                      bgcolor: (theme) => alpha(theme.palette.background.paper, 0.6),
                      backdropFilter: 'blur(12px)',
                      overflow: 'hidden'
                  }}>
                      <Box sx={{ 
                          p: 4, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          bgcolor: 'action.hover',
                          position: 'relative',
                          aspectRatio: '1/1'
                      }}>
                          {!flavor.is_available && (
                                <Chip 
                                    label={flavor.is_legacy ? "Legacy" : "Out of Stock"} 
                                    color={flavor.is_legacy ? "warning" : "error"}
                                    sx={{ 
                                        position: 'absolute', 
                                        top: 16, 
                                        right: 16, 
                                        fontWeight: '900', 
                                        borderRadius: 2,
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                    }}
                                />
                          )}
                          {flavor.image_url ? (
                              <Box 
                                component="img" 
                                src={flavor.image_url} 
                                sx={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'contain',
                                    filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.15))'
                                }} 
                              />
                          ) : (
                              <Typography color="text.secondary">No Image</Typography>
                          )}
                      </Box>
                      <CardContent sx={{ p: 3 }}>
                          <Chip 
                            label={flavor.category_name} 
                            size="small" 
                            sx={{ mb: 2, fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }} 
                          />
                          <Typography variant="h4" sx={{ fontWeight: '800', mb: 2, lineHeight: 1.2 }}>
                              {flavor.name}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                              <RatingBadge score={flavor.average_rating || 0} size="large" />
                              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                                  {flavor.ratings.length} {t('common.reviews')}
                              </Typography>
                          </Box>

                          <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'text.secondary', mb: 4 }}>
                              {flavor.description}
                          </Typography>

                          {flavor.shop_url && (
                              <Button 
                                variant="contained" 
                                fullWidth
                                size="large" 
                                component="a" 
                                href={flavor.shop_url} 
                                target="_blank" 
                                startIcon={<ShoppingCartIcon />}
                                sx={{ 
                                    borderRadius: 3, 
                                    py: 1.5, 
                                    fontSize: '1rem', 
                                    fontWeight: '900',
                                    boxShadow: (theme) => `0 8px 20px ${alpha(theme.palette.primary.main, 0.3)}` 
                                }}
                              >
                                  {t('common.buyNow')}
                              </Button>
                          )}
                      </CardContent>
                  </Card>
              </Box>
          </Grid>

          {/* Right: Ratings & Comments */}
          <Grid size={{ xs: 12, md: 7, lg: 8 }}>
              <Box sx={{ mb: 4 }}>
                  <Typography variant="h4" sx={{ fontWeight: '800', mb: 1 }}>Ratings & Comments</Typography>
                  <Typography variant="subtitle1" color="text.secondary">
                      {flavor.ratings.length === 0 ? "Be the first to rate this flavor!" : `Join the discussion with ${flavor.ratings.length} other fans.`}
                  </Typography>
              </Box>

              {/* Add Rating Form */}
              {currentUser && flavor.user_rating === null && (
                  <Card variant="outlined" sx={{ mb: 4, borderRadius: 4, border: '2px dashed', borderColor: 'divider', bgcolor: 'transparent' }}>
                      <CardContent sx={{ p: 3 }}>
                          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>Rate this flavor</Typography>
                          <form onSubmit={handleRatingSubmit}>
                              <Box sx={{ mb: 3 }}>
                                  <MuiRating max={10} value={newScore} onChange={(_, val) => setNewScore(val)} size="large" />
                              </Box>
                              <MentionTextField
                                  multiline
                                  rows={3}
                                  placeholder="Share your thoughts..."
                                  value={newComment}
                                  onChange={(val) => setNewComment(val)}
                              />
                              <Button 
                                variant="contained" 
                                type="submit" 
                                disabled={!newScore} 
                                sx={{ mt: 2, borderRadius: 2, fontWeight: 'bold' }}
                              >
                                  Submit Review
                              </Button>
                          </form>
                      </CardContent>
                  </Card>
              )}

              <Stack spacing={2.5}>
                {flavor.ratings.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 8, bgcolor: 'action.hover', borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                        <Typography color="text.secondary">{t('dashboard.noRatings')}</Typography>
                    </Box>
                ) : (
                    flavor.ratings.map((rating: Rating) => (
                        <Card key={rating.id} elevation={0} sx={{ 
                            borderRadius: 4, 
                            border: '1px solid', 
                            borderColor: 'divider',
                            bgcolor: (theme) => alpha(theme.palette.background.paper, 0.8)
                        }}>
                            <CardContent sx={{ p: 3 }}>
                                {editMode === rating.id ? (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <MuiRating max={10} value={editScore} onChange={(_, val) => setEditScore(val || 0)} size="large" />
                                        <MentionTextField 
                                            multiline 
                                            rows={3} 
                                            value={editComment} 
                                            onChange={(val) => setEditComment(val)}
                                        />
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Button variant="contained" onClick={() => handleUpdateRating(rating.id)}>{t('common.save')}</Button>
                                            <Button variant="outlined" onClick={() => setEditMode(null)}>{t('common.cancel')}</Button>
                                        </Box>
                                    </Box>
                                ) : (
                                    <>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Link to={`/profile/${rating.user}`} style={{ textDecoration: 'none' }}>
                                                    <Avatar src={rating.user_avatar || undefined} sx={{ width: 44, height: 44, border: '2px solid', borderColor: 'divider' }}>
                                                        {!rating.user_avatar && rating.user.charAt(0).toUpperCase()}
                                                    </Avatar>
                                                </Link>
                                                <Box>
                                                    <Link to={`/profile/${rating.user}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>{rating.user}</Typography>
                                                    </Link>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {formatDate(rating.created_at)}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <RatingBadge score={rating.score} />
                                        </Box>

                                        {rating.comment ? (
                                            <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6, color: 'text.primary' }}>
                                                <RichText text={rating.comment} />
                                            </Typography>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>No comment provided.</Typography>
                                        )}

                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Button 
                                                size="small" 
                                                startIcon={<CommentIcon fontSize="small" />} 
                                                onClick={() => setExpandedReplies(prev => ({ ...prev, [rating.id]: !prev[rating.id] }))}
                                                sx={{ textTransform: 'none', color: 'text.secondary', fontWeight: 'bold' }}
                                            >
                                                {rating.replies.length > 0 ? `${rating.replies.length} ${t('common.replies')}` : t('common.reply')}
                                            </Button>
                                            
                                            {currentUser === rating.user && (
                                                <Box>
                                                    <Button size="small" onClick={() => startEdit(rating)} sx={{ minWidth: 0, mr: 1, fontWeight: 'bold' }}>{t('common.edit')}</Button>
                                                    <Button size="small" color="error" onClick={() => handleDeleteRating(rating.id)} sx={{ minWidth: 0, fontWeight: 'bold' }}>{t('common.delete')}</Button>
                                                </Box>
                                            )}
                                        </Box>
                                    </>
                                )}

                                {/* Replies Section */}
                                <Collapse in={expandedReplies[rating.id]}>
                                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                        {rating.replies.map((reply: any) => (
                                            <Box key={reply.id} sx={{ mb: 2, pl: 2, borderLeft: '3px solid', borderColor: 'primary.main' }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Link to={`/profile/${reply.user}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                                {reply.user} 
                                                                {reply.user === rating.user && <VerifiedIcon sx={{ fontSize: '0.8rem', color: 'primary.main', ml: 0.5, verticalAlign: 'middle' }} />}
                                                            </Typography>
                                                        </Link>
                                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                                            {formatDate(reply.created_at)}
                                                        </Typography>
                                                    </Box>
                                                    {currentUser === reply.user && editingReplyId !== reply.id && (
                                                        <Box>
                                                            <Button size="small" sx={{ minWidth: 0, py: 0, fontSize: '0.7rem', fontWeight: 'bold' }} onClick={() => { setEditingReplyId(reply.id); setEditReplyText(reply.text); }}>{t('common.edit')}</Button>
                                                            <Button size="small" color="error" sx={{ minWidth: 0, py: 0, fontSize: '0.7rem', fontWeight: 'bold' }} onClick={() => handleDeleteReply(reply.id)}>{t('common.delete')}</Button>
                                                        </Box>
                                                    )}
                                                </Box>
                                                {editingReplyId === reply.id ? (
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                                                        <MentionTextField 
                                                            multiline 
                                                            value={editReplyText} 
                                                            onChange={(val) => setEditReplyText(val)}
                                                        />
                                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                                            <Button variant="contained" size="small" onClick={() => handleUpdateReply(reply.id)}>{t('common.save')}</Button>
                                                            <Button variant="outlined" size="small" onClick={() => setEditingReplyId(null)}>{t('common.cancel')}</Button>
                                                        </Box>
                                                    </Box>
                                                ) : (
                                                    <Typography variant="body2" sx={{ lineHeight: 1.5, color: 'text.primary' }}>
                                                        <RichText text={reply.text} />
                                                    </Typography>
                                                )}
                                            </Box>
                                        ))}
                                        
                                        {currentUser && (
                                            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                                <MentionTextField 
                                                    placeholder={t('community.writeReply')} 
                                                    value={replyInputs[rating.id] || ''} 
                                                    onChange={(val) => setReplyInputs({ ...replyInputs, [rating.id]: val })} 
                                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleReplySubmit(rating.id)}
                                                />
                                                <Button 
                                                    variant="contained" 
                                                    size="small" 
                                                    disabled={!replyInputs[rating.id]} 
                                                    onClick={() => handleReplySubmit(rating.id)} 
                                                    sx={{ px: 2, fontWeight: 'bold', height: 40, alignSelf: 'flex-start' }}
                                                >
                                                    {t('common.reply')}
                                                </Button>
                                            </Box>
                                        )}
                                    </Box>
                                </Collapse>
                            </CardContent>
                        </Card>
                    ))
                )}
              </Stack>
          </Grid>
      </Grid>
    </Container>
  );
};

export default FlavorDetail;
