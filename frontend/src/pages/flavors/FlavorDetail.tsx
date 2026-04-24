import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Typography,
  Box,
  CardContent,
  Rating as MuiRating,
  Button,
  Avatar,
  CircularProgress,
  Grid,
  Chip,
  Stack,
  alpha,
  useTheme,
  Collapse,
  TextField,
  FormControlLabel,
  Switch,
  Divider,
} from '@mui/material';
import api from '../../lib/api';
import { useTitle } from '../../hooks/useTitle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import VerifiedIcon from '@mui/icons-material/Verified';
import CommentIcon from '@mui/icons-material/Comment';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { formatDate } from '../../utils/date';
import MentionTextField from '../../components/MentionTextField';
import RichText from '../../components/RichText';
import RatingBadge from '../../components/RatingBadge';
import StatusBadge from '../../components/StatusBadge';
import { PageShell, HeroBackdrop, GlassCard, SectionHeader, EmptyState } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { useConfirm } from '../../hooks/useConfirm';

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

interface FlavorDetailProps {
  adminMode?: boolean;
}

const FlavorDetail: React.FC<FlavorDetailProps> = ({ adminMode }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { confirm } = useConfirm();
  const [flavor, setFlavor] = useState<Flavor | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyInputs, setReplyInputs] = useState<{ [key: number]: string }>({});
  const [expandedReplies, setExpandedReplies] = useState<{ [key: number]: boolean }>({});
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  // Product Edit state (Admin)
  const [isAdminEditing, setIsAdminEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editFlavorData, setEditFlavorData] = useState({
    name: '',
    description: '',
    shop_url: '',
    is_available: true,
    is_legacy: false,
  });

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

  const fetchFlavor = useCallback(async () => {
    try {
      const res = await api.get(`flavors/${id}/`);
      setFlavor(res.data);
      setEditFlavorData({
        name: res.data.name,
        description: res.data.description,
        shop_url: res.data.shop_url || '',
        is_available: res.data.is_available,
        is_legacy: res.data.is_legacy,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const getUser = async () => {
      try {
        const res = await api.get('users/me/');
        setCurrentUser(res.data.username);
      } catch {
        /* ignore */
      }
    };
    getUser();
    fetchFlavor();
  }, [fetchFlavor]);

  useTitle(flavor?.name || t('common.loading'));

  const handleAdminUpdate = async () => {
    try {
      await api.patch(`flavors/${id}/`, editFlavorData);
      setIsAdminEditing(false);
      fetchFlavor();
    } catch {
      notify({ message: 'Admin update failed', severity: 'error' });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      setUploadingImage(true);
      await api.patch(`flavors/${id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchFlavor();
    } catch {
      notify({ message: 'Image upload failed', severity: 'error' });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScore) {
      notify({ message: 'Please select a score', severity: 'warning' });
      return;
    }
    try {
      await api.post('ratings/', { flavor: flavor?.id, score: newScore, comment: newComment });
      setNewScore(null);
      setNewComment('');
      fetchFlavor();
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      notify({ message: msg || 'Failed to submit rating', severity: 'error' });
    }
  };

  const handleReplySubmit = async (ratingId: number) => {
    const text = replyInputs[ratingId];
    if (!text) return;
    try {
      await api.post(`ratings/${ratingId}/reply/`, { text });
      setReplyInputs({ ...replyInputs, [ratingId]: '' });
      setExpandedReplies((prev) => ({ ...prev, [ratingId]: true }));
      fetchFlavor();
    } catch {
      notify({ message: 'Failed to submit reply', severity: 'error' });
    }
  };

  const handleUpdateReply = async (replyId: number) => {
    if (!editReplyText) return;
    try {
      await api.patch(`replies/${replyId}/`, { text: editReplyText });
      setEditingReplyId(null);
      fetchFlavor();
    } catch {
      notify({ message: 'Failed to update reply', severity: 'error' });
    }
  };

  const handleDeleteReply = async (replyId: number) => {
    if (!(await confirm({ message: 'Delete this reply?', danger: true }))) return;
    try {
      await api.delete(`replies/${replyId}/`);
      fetchFlavor();
    } catch {
      notify({ message: 'Failed to delete reply', severity: 'error' });
    }
  };

  const handleDeleteRating = async (ratingId: number) => {
    if (!(await confirm({ message: 'Delete this review?', danger: true }))) return;
    try {
      await api.delete(`ratings/${ratingId}/`);
      fetchFlavor();
    } catch {
      notify({ message: 'Failed to delete review', severity: 'error' });
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
    } catch {
      notify({ message: 'Failed to update review', severity: 'error' });
    }
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  if (loading)
    return (
      <PageShell>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      </PageShell>
    );
  if (!flavor)
    return (
      <PageShell>
        <Typography>Flavor not found</Typography>
      </PageShell>
    );

  return (
    <PageShell hero={<HeroBackdrop variant="minimal" />}>
      <Button
        variant="outlined"
        onClick={handleGoBack}
        startIcon={<ArrowBackIcon />}
        sx={{
          alignSelf: 'flex-start',
          borderRadius: 2,
          textTransform: 'none',
          fontWeight: 'bold',
          color: 'text.secondary',
        }}
      >
        {window.history.length > 1 ? t('common.back') : t('common.backToHome')}
      </Button>

      <Grid container spacing={4}>
        {/* Left: Product Info Card */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Box sx={{ position: { md: 'sticky' }, top: 100 }}>
            <GlassCard intensity="strong" sx={{ overflow: 'hidden' }}>
              <Box
                sx={{
                  p: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'action.hover',
                  position: 'relative',
                  aspectRatio: '1/1',
                }}
              >
                <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1 }}>
                  <StatusBadge isLegacy={flavor.is_legacy} isAvailable={flavor.is_available} />
                </Box>
                {flavor.image_url ? (
                  <Box
                    component="img"
                    src={flavor.image_url}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.15))',
                    }}
                  />
                ) : (
                  <Typography color="text.secondary">No Image</Typography>
                )}
              </Box>
              <CardContent sx={{ p: 3 }}>
                {adminMode && (
                  <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    {!isAdminEditing ? (
                      <Button
                        startIcon={<EditIcon />}
                        size="small"
                        onClick={() => setIsAdminEditing(true)}
                      >
                        Edit Product (Admin)
                      </Button>
                    ) : (
                      <Stack direction="row" spacing={1}>
                        <Button
                          startIcon={<SaveIcon />}
                          size="small"
                          color="success"
                          variant="contained"
                          onClick={handleAdminUpdate}
                        >
                          Save
                        </Button>
                        <Button
                          startIcon={<CancelIcon />}
                          size="small"
                          onClick={() => setIsAdminEditing(false)}
                        >
                          Cancel
                        </Button>
                      </Stack>
                    )}
                  </Box>
                )}

                {isAdminEditing ? (
                  <Stack spacing={2} sx={{ mb: 2 }}>
                    <TextField
                      label="Name"
                      fullWidth
                      size="small"
                      value={editFlavorData.name}
                      onChange={(e) =>
                        setEditFlavorData({ ...editFlavorData, name: e.target.value })
                      }
                    />
                    <TextField
                      label="Description"
                      fullWidth
                      size="small"
                      multiline
                      rows={4}
                      value={editFlavorData.description}
                      onChange={(e) =>
                        setEditFlavorData({ ...editFlavorData, description: e.target.value })
                      }
                    />
                    <TextField
                      label="Shop URL"
                      fullWidth
                      size="small"
                      value={editFlavorData.shop_url}
                      onChange={(e) =>
                        setEditFlavorData({ ...editFlavorData, shop_url: e.target.value })
                      }
                    />

                    <Box>
                      <Button
                        variant="outlined"
                        component="label"
                        size="small"
                        fullWidth
                        disabled={uploadingImage}
                      >
                        {uploadingImage ? 'Uploading...' : 'Upload Custom Image'}
                        <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
                      </Button>
                    </Box>

                    <FormControlLabel
                      control={
                        <Switch
                          checked={editFlavorData.is_available}
                          onChange={(e) =>
                            setEditFlavorData({ ...editFlavorData, is_available: e.target.checked })
                          }
                        />
                      }
                      label="In Stock"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={editFlavorData.is_legacy}
                          onChange={(e) =>
                            setEditFlavorData({ ...editFlavorData, is_legacy: e.target.checked })
                          }
                        />
                      }
                      label="Legacy / Limited"
                    />
                    <Divider sx={{ my: 1 }} />
                  </Stack>
                ) : (
                  <>
                    <Chip
                      label={flavor.category_name}
                      size="small"
                      sx={{
                        mb: 2,
                        fontWeight: 'bold',
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: 'primary.main',
                      }}
                    />
                    <Typography variant="h4" sx={{ fontWeight: '800', mb: 2, lineHeight: 1.2 }}>
                      {flavor.name}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                      <RatingBadge score={flavor.average_rating || 0} size="large" />
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontWeight: 'bold' }}
                      >
                        {flavor.ratings.length} {t('common.reviews')}
                      </Typography>
                    </Box>

                    <Typography
                      variant="body2"
                      sx={{ lineHeight: 1.7, color: 'text.secondary', mb: 4 }}
                    >
                      <RichText text={flavor.description} />
                    </Typography>
                  </>
                )}

                {flavor.shop_url && !isAdminEditing && (
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    component="a"
                    href={flavor.shop_url}
                    target="_blank"
                    rel="noreferrer"
                    startIcon={<ShoppingCartIcon />}
                    sx={{
                      borderRadius: 3,
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: '900',
                      boxShadow: (theme) => `0 8px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                    }}
                  >
                    {t('common.buyNow')}
                  </Button>
                )}
              </CardContent>
            </GlassCard>
          </Box>
        </Grid>

        {/* Right: Ratings & Comments */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <SectionHeader
            title="Ratings & Comments"
            subtitle={
              flavor.ratings.length === 0
                ? 'Be the first to rate this flavor!'
                : `Join the discussion with ${flavor.ratings.length} other fans.`
            }
            compact
          />

          {/* Add Rating Form */}
          {currentUser && flavor.user_rating === null && (
            <Box sx={{ mb: 4 }}>
              <GlassCard intensity="subtle">
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Rate this flavor
                  </Typography>
                  <form onSubmit={handleRatingSubmit}>
                    <Box sx={{ mb: 3 }}>
                      <MuiRating
                        max={10}
                        value={newScore}
                        onChange={(_, val) => setNewScore(val)}
                        size="large"
                      />
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
              </GlassCard>
            </Box>
          )}

          <Stack spacing={2.5}>
            {flavor.ratings.length === 0 ? (
              <EmptyState title={t('dashboard.noRatings')} />
            ) : (
              flavor.ratings.map((rating: Rating) => (
                <GlassCard key={rating.id}>
                  <CardContent sx={{ p: 3 }}>
                    {editMode === rating.id ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <MuiRating
                          max={10}
                          value={editScore}
                          onChange={(_, val) => setEditScore(val || 0)}
                          size="large"
                        />
                        <MentionTextField
                          multiline
                          rows={3}
                          value={editComment}
                          onChange={(val) => setEditComment(val)}
                        />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button variant="contained" onClick={() => handleUpdateRating(rating.id)}>
                            {t('common.save')}
                          </Button>
                          <Button variant="outlined" onClick={() => setEditMode(null)}>
                            {t('common.cancel')}
                          </Button>
                        </Box>
                      </Box>
                    ) : (
                      <>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            mb: 2,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Link to={`/profile/${rating.user}`} style={{ textDecoration: 'none' }}>
                              <Avatar
                                src={rating.user_avatar || undefined}
                                sx={{
                                  width: 44,
                                  height: 44,
                                  border: '2px solid',
                                  borderColor: 'divider',
                                }}
                              >
                                {!rating.user_avatar && rating.user.charAt(0).toUpperCase()}
                              </Avatar>
                            </Link>
                            <Box>
                              <Link
                                to={`/profile/${rating.user}`}
                                style={{ textDecoration: 'none', color: 'inherit' }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  sx={{ fontWeight: 'bold', fontSize: '1rem' }}
                                >
                                  {rating.user}
                                </Typography>
                              </Link>
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(rating.created_at)}
                              </Typography>
                            </Box>
                          </Box>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <RatingBadge score={rating.score} />
                            {adminMode && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="secondary"
                                onClick={() => navigate(`/admin-panel/rating/${rating.id}`)}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                              >
                                {t('admin.manageRating')}
                              </Button>
                            )}
                          </Stack>
                        </Box>

                        {rating.comment ? (
                          <Typography
                            variant="body1"
                            sx={{ mb: 2, lineHeight: 1.6, color: 'text.primary' }}
                          >
                            <RichText text={rating.comment} />
                          </Typography>
                        ) : (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 2, fontStyle: 'italic' }}
                          >
                            No comment provided.
                          </Typography>
                        )}

                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Button
                            size="small"
                            startIcon={<CommentIcon fontSize="small" />}
                            onClick={() =>
                              setExpandedReplies((prev) => ({
                                ...prev,
                                [rating.id]: !prev[rating.id],
                              }))
                            }
                            sx={{
                              textTransform: 'none',
                              color: 'text.secondary',
                              fontWeight: 'bold',
                            }}
                          >
                            {rating.replies.length > 0
                              ? `${rating.replies.length} ${t('common.replies')}`
                              : t('common.reply')}
                          </Button>

                          {currentUser === rating.user && (
                            <Box>
                              <Button
                                size="small"
                                onClick={() => startEdit(rating)}
                                sx={{ minWidth: 0, mr: 1, fontWeight: 'bold' }}
                              >
                                {t('common.edit')}
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                onClick={() => handleDeleteRating(rating.id)}
                                sx={{ minWidth: 0, fontWeight: 'bold' }}
                              >
                                {t('common.delete')}
                              </Button>
                            </Box>
                          )}
                        </Box>
                      </>
                    )}

                    {/* Replies Section */}
                    <Collapse in={expandedReplies[rating.id]}>
                      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                        {rating.replies.map((reply) => (
                          <Box
                            key={reply.id}
                            sx={{
                              mb: 2,
                              pl: 2,
                              borderLeft: '3px solid',
                              borderColor: 'primary.main',
                            }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                mb: 0.5,
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Link
                                  to={`/profile/${reply.user}`}
                                  style={{ textDecoration: 'none', color: 'inherit' }}
                                >
                                  <Typography
                                    variant="subtitle2"
                                    sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}
                                  >
                                    {reply.user}
                                    {reply.user === rating.user && (
                                      <VerifiedIcon
                                        sx={{
                                          fontSize: '0.8rem',
                                          color: 'primary.main',
                                          ml: 0.5,
                                          verticalAlign: 'middle',
                                        }}
                                      />
                                    )}
                                  </Typography>
                                </Link>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ fontSize: '0.7rem' }}
                                >
                                  {formatDate(reply.created_at)}
                                </Typography>
                              </Box>
                              {currentUser === reply.user && editingReplyId !== reply.id && (
                                <Box>
                                  <Button
                                    size="small"
                                    sx={{
                                      minWidth: 0,
                                      py: 0,
                                      fontSize: '0.7rem',
                                      fontWeight: 'bold',
                                    }}
                                    onClick={() => {
                                      setEditingReplyId(reply.id);
                                      setEditReplyText(reply.text);
                                    }}
                                  >
                                    {t('common.edit')}
                                  </Button>
                                  <Button
                                    size="small"
                                    color="error"
                                    sx={{
                                      minWidth: 0,
                                      py: 0,
                                      fontSize: '0.7rem',
                                      fontWeight: 'bold',
                                    }}
                                    onClick={() => handleDeleteReply(reply.id)}
                                  >
                                    {t('common.delete')}
                                  </Button>
                                </Box>
                              )}
                              {adminMode && (
                                <Button
                                  size="small"
                                  variant="text"
                                  color="secondary"
                                  onClick={() => navigate(`/admin-panel/reply/${reply.id}`)}
                                  sx={{
                                    minWidth: 0,
                                    py: 0,
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold',
                                  }}
                                >
                                  {t('admin.manageReply')}
                                </Button>
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
                                  <Button
                                    variant="contained"
                                    size="small"
                                    onClick={() => handleUpdateReply(reply.id)}
                                  >
                                    {t('common.save')}
                                  </Button>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => setEditingReplyId(null)}
                                  >
                                    {t('common.cancel')}
                                  </Button>
                                </Box>
                              </Box>
                            ) : (
                              <Typography
                                variant="body2"
                                sx={{ lineHeight: 1.5, color: 'text.primary' }}
                              >
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
                              onChange={(val) =>
                                setReplyInputs({ ...replyInputs, [rating.id]: val })
                              }
                              onKeyDown={(e) =>
                                e.key === 'Enter' && !e.shiftKey && handleReplySubmit(rating.id)
                              }
                            />
                            <Button
                              variant="contained"
                              size="small"
                              disabled={!replyInputs[rating.id]}
                              onClick={() => handleReplySubmit(rating.id)}
                              sx={{
                                px: 2,
                                fontWeight: 'bold',
                                height: 40,
                                alignSelf: 'flex-start',
                              }}
                            >
                              {t('common.reply')}
                            </Button>
                          </Box>
                        )}
                      </Box>
                    </Collapse>
                  </CardContent>
                </GlassCard>
              ))
            )}
          </Stack>
        </Grid>
      </Grid>
    </PageShell>
  );
};

export default FlavorDetail;
