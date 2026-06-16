import React, { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Typography,
  Box,
  CardContent,
  Button,
  Avatar,
  CircularProgress,
  Grid,
  Chip,
  Stack,
  alpha,
  useTheme,
  Collapse,
} from '@mui/material';
import { useFlavorDetail, type FlavorDetailRating } from '../../api/queries/useFlavorDetail';
import { useCurrentUserLite } from '../../api/queries/useCurrentUserLite';
import {
  useDeleteRating,
  useCreateReply,
  useDeleteReply,
  useUpdateRating,
} from '../../api/mutations/useRatingMutations';
import { useUpdateReply } from '../../api/mutations/useReplyMutations';
import { useTitle } from '../../hooks/useTitle';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import VerifiedIcon from '@mui/icons-material/Verified';
import CommentIcon from '@mui/icons-material/Comment';
import EditIcon from '@mui/icons-material/Edit';
import { formatDate } from '../../utils/date';
import MentionTextField from '../../components/MentionTextField';
import RichText from '../../components/RichText';
import RatingBadge from '../../components/RatingBadge';
import StatusBadge from '../../components/StatusBadge';
import {
  PageShell,
  HeroBackdrop,
  GlassCard,
  SectionHeader,
  EmptyState,
  HeroGallery,
  ScoreInput,
  RatingDistribution,
  BackButton,
} from '../../components/ui';
import RatingForm from './components/RatingForm';
import SimilarFlavorsSection from './components/SimilarFlavorsSection';
import AdminFlavorEditDialog from './components/AdminFlavorEditDialog';
import { useToast } from '../../hooks/useToast';
import { useConfirm } from '../../hooks/useConfirm';

const FlavorDetail: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { confirm } = useConfirm();
  const { data: flavor, isLoading: loading } = useFlavorDetail(id);
  const { data: meData } = useCurrentUserLite();
  const currentUser = meData?.username ?? null;
  const isSuperuser = !!meData?.is_superuser;
  const deleteRatingMutation = useDeleteRating();
  const updateRating = useUpdateRating();
  const createReply = useCreateReply();
  const updateReply = useUpdateReply();
  const deleteReplyMutation = useDeleteReply();
  const [replyInputs, setReplyInputs] = useState<{ [key: number]: string }>({});
  const [expandedReplies, setExpandedReplies] = useState<{ [key: number]: boolean }>({});

  // Product Edit dialog (Admin) — form moved out of the card (UX audit #6).
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);

  // Edit state
  const [editMode, setEditMode] = useState<number | null>(null);
  const [editScore, setEditScore] = useState(0);
  const [editComment, setEditComment] = useState('');

  // Reply Edit state
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
  const [editReplyText, setEditReplyText] = useState('');

  useTitle(flavor?.name || t('common.loading'));

  const galleryImages = useMemo(() => flavor?.image_urls ?? [], [flavor?.image_urls]);

  const handleReplySubmit = async (ratingId: number) => {
    const text = replyInputs[ratingId];
    if (!text) return;
    try {
      await createReply.mutateAsync({
        ratingId,
        text,
        flavorId: flavor?.id,
        optimisticUser: currentUser ?? undefined,
      });
      setReplyInputs({ ...replyInputs, [ratingId]: '' });
      setExpandedReplies((prev) => ({ ...prev, [ratingId]: true }));
    } catch {
      notify({ message: t('common.replyFailed'), severity: 'error' });
    }
  };

  const handleUpdateReply = async (replyId: number) => {
    if (!editReplyText) return;
    try {
      await updateReply.mutateAsync({ replyId, text: editReplyText });
      setEditingReplyId(null);
    } catch {
      notify({ message: t('flavorDetail.replyUpdateFailed'), severity: 'error' });
    }
  };

  const handleDeleteReply = async (replyId: number) => {
    if (!(await confirm({ message: t('common.confirmDeleteReply'), danger: true }))) return;
    try {
      await deleteReplyMutation.mutateAsync(replyId);
    } catch {
      notify({ message: t('flavorDetail.replyDeleteFailed'), severity: 'error' });
    }
  };

  const handleDeleteRating = async (ratingId: number) => {
    if (!(await confirm({ message: t('common.confirmDeleteReview'), danger: true }))) return;
    try {
      await deleteRatingMutation.mutateAsync(ratingId);
    } catch {
      notify({ message: t('flavorDetail.reviewDeleteFailed'), severity: 'error' });
    }
  };

  const startEdit = (rating: FlavorDetailRating) => {
    setEditMode(rating.id);
    setEditScore(rating.score);
    setEditComment(rating.comment || '');
  };

  const handleUpdateRating = async (ratingId: number) => {
    try {
      await updateRating.mutateAsync({ id: ratingId, score: editScore, comment: editComment });
      setEditMode(null);
    } catch {
      notify({ message: t('flavorDetail.reviewUpdateFailed'), severity: 'error' });
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
        <Typography>{t('flavorDetail.flavorNotFound')}</Typography>
      </PageShell>
    );

  return (
    <PageShell hero={<HeroBackdrop variant="minimal" />}>
      <BackButton />

      <Grid container spacing={4}>
        {/* Left: Product Info Card */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Box sx={{ position: { md: 'sticky' }, top: 100 }}>
            <HeroGallery
              images={galleryImages}
              alt={flavor.name}
              badge={<StatusBadge isLegacy={flavor.is_legacy} isAvailable={flavor.is_available} />}
            />
            <Box
              sx={{
                display: { xs: 'block', lg: 'none' },
                height: 2,
                my: 2,
                background: theme.tokens.accent.softGradient,
                borderRadius: 1,
              }}
            />
            <GlassCard sx={{ mt: { xs: 0, lg: 2 } }}>
              <CardContent sx={{ p: 3 }}>
                {isSuperuser && (
                  <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      startIcon={<EditIcon />}
                      size="small"
                      onClick={() => setAdminDialogOpen(true)}
                    >
                      {t('flavorDetail.editProductAdmin')}
                    </Button>
                  </Box>
                )}

                <Chip
                  label={flavor.category_name}
                  size="small"
                  sx={{
                    mb: 2,
                    fontWeight: 700,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: 'primary.main',
                  }}
                />
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 2, lineHeight: 1.2 }}>
                  {flavor.name}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <RatingBadge score={flavor.average_rating || 0} size="large" />
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {flavor.ratings.length} {t('common.reviews')}
                  </Typography>
                </Box>

                {flavor.ratings.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <RatingDistribution
                      distribution={flavor.rating_distribution}
                      total={flavor.ratings.length}
                    />
                  </Box>
                )}

                <Typography
                  variant="body2"
                  sx={{ lineHeight: 1.7, color: 'text.secondary', mb: 4 }}
                >
                  <RichText text={flavor.description} />
                </Typography>

                {flavor.shop_url && (
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
                      fontWeight: 900,
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
            title={t('flavorDetail.ratingsAndComments')}
            subtitle={
              flavor.ratings.length === 0
                ? t('flavorDetail.beTheFirst')
                : t('flavorDetail.joinDiscussion', { count: flavor.ratings.length })
            }
            compact
          />

          {/* Add Rating Form */}
          {currentUser && flavor.user_rating === null && (
            <Box sx={{ mb: 4 }}>
              <RatingForm flavorId={flavor.id} />
            </Box>
          )}

          <Stack spacing={2.5}>
            {flavor.ratings.length === 0 ? (
              <EmptyState title={t('dashboard.noRatings')} />
            ) : (
              flavor.ratings.map((rating: FlavorDetailRating) => (
                <GlassCard key={rating.id}>
                  <CardContent sx={{ p: 3 }}>
                    {editMode === rating.id ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <ScoreInput
                          value={editScore || null}
                          onChange={(val) => setEditScore(val)}
                          size="small"
                          ariaLabel={t('flavorDetail.scoreLabel')}
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
                                  sx={{ fontWeight: 700, fontSize: '1rem' }}
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
                            {isSuperuser && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="secondary"
                                onClick={() => navigate(`/admin-panel/rating/${rating.id}`)}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
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
                            {t('flavorDetail.noComment')}
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
                              fontWeight: 700,
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
                                sx={{ minWidth: 0, mr: 1, fontWeight: 700 }}
                              >
                                {t('common.edit')}
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                onClick={() => handleDeleteRating(rating.id)}
                                sx={{ minWidth: 0, fontWeight: 700 }}
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
                                    sx={{ fontWeight: 700, fontSize: '0.85rem' }}
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
                                      fontWeight: 700,
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
                                      fontWeight: 700,
                                    }}
                                    onClick={() => handleDeleteReply(reply.id)}
                                  >
                                    {t('common.delete')}
                                  </Button>
                                </Box>
                              )}
                              {isSuperuser && (
                                <Button
                                  size="small"
                                  variant="text"
                                  color="secondary"
                                  onClick={() => navigate(`/admin-panel/reply/${reply.id}`)}
                                  sx={{
                                    minWidth: 0,
                                    py: 0,
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
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
                              multiline
                              rows={2}
                              value={replyInputs[rating.id] || ''}
                              onChange={(val) =>
                                setReplyInputs({ ...replyInputs, [rating.id]: val })
                              }
                              onKeyDown={(e) =>
                                (e.metaKey || e.ctrlKey) &&
                                e.key === 'Enter' &&
                                handleReplySubmit(rating.id)
                              }
                            />
                            <Button
                              variant="contained"
                              size="small"
                              disabled={!replyInputs[rating.id]}
                              onClick={() => handleReplySubmit(rating.id)}
                              sx={{
                                px: 2,
                                fontWeight: 700,
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

      <SimilarFlavorsSection flavorId={flavor.id} />

      {isSuperuser && id && (
        <AdminFlavorEditDialog
          open={adminDialogOpen}
          onClose={() => setAdminDialogOpen(false)}
          flavorId={id}
          flavor={flavor}
        />
      )}
    </PageShell>
  );
};

export default FlavorDetail;
