import React, { useState } from 'react';
import {
  Box,
  Button,
  CardContent,
  Collapse,
  Rating as MuiRating,
  Stack,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CommentIcon from '@mui/icons-material/Comment';
import VerifiedIcon from '@mui/icons-material/Verified';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { RatedItem } from '../../api/types';
import {
  useCreateReply,
  useDeleteRating,
  useDeleteReply,
  useUpdateRating,
} from '../../api/mutations/useRatingMutations';
import RatingBadge from '../../components/RatingBadge';
import StatusBadge from '../../components/StatusBadge';
import MentionTextField from '../../components/MentionTextField';
import RichText from '../../components/RichText';
import { formatDate } from '../../utils/date';
import { GlassCard, FlavorThumb } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { useConfirm } from '../../hooks/useConfirm';

export interface MyReviewCardProps {
  rating: RatedItem;
  /** Current user's username — drives the "this is mine" verified badge + reply delete. */
  currentUsername: string;
}

/**
 * One of the current user's own reviews on the dashboard: flavor-centric header,
 * inline score/comment edit, and a collapsible reply thread. Owns its own edit /
 * reply / expand state (previously hoisted into the Dashboard monolith as shared
 * maps keyed by rating id).
 */
const MyReviewCard: React.FC<MyReviewCardProps> = ({ rating, currentUsername }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const { notify } = useToast();
  const { confirm } = useConfirm();

  const updateRating = useUpdateRating();
  const deleteRating = useDeleteRating();
  const createReply = useCreateReply();
  const deleteReply = useDeleteReply();

  const [isEditing, setIsEditing] = useState(false);
  const [editScore, setEditScore] = useState(rating.score);
  const [editComment, setEditComment] = useState(rating.comment || '');
  const [replyInput, setReplyInput] = useState('');
  const [expanded, setExpanded] = useState(false);

  const startEdit = () => {
    setEditScore(rating.score);
    setEditComment(rating.comment || '');
    setIsEditing(true);
  };

  const handleUpdate = async () => {
    try {
      await updateRating.mutateAsync({ id: rating.id, score: editScore, comment: editComment });
      setIsEditing(false);
    } catch {
      notify({ message: t('flavorDetail.reviewUpdateFailed'), severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!(await confirm({ message: t('common.confirmDeleteReview'), danger: true }))) return;
    try {
      await deleteRating.mutateAsync(rating.id);
    } catch {
      notify({ message: t('flavorDetail.reviewDeleteFailed'), severity: 'error' });
    }
  };

  const handleReplySubmit = async () => {
    if (!replyInput) return;
    try {
      await createReply.mutateAsync({ ratingId: rating.id, text: replyInput });
      setReplyInput('');
      setExpanded(true);
    } catch {
      notify({ message: t('common.replyFailed'), severity: 'error' });
    }
  };

  const handleDeleteReply = async (replyId: number) => {
    if (!(await confirm({ message: t('common.confirmDeleteReply'), danger: true }))) return;
    try {
      await deleteReply.mutateAsync(replyId);
    } catch {
      notify({ message: t('flavorDetail.replyDeleteFailed'), severity: 'error' });
    }
  };

  return (
    <GlassCard>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        {isEditing ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {t('dashboard.editingReview', { flavor: rating.flavor_name })}
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="body2">{t('dashboard.newScore')}</Typography>
              <MuiRating max={10} value={editScore} onChange={(_, val) => setEditScore(val || 0)} />
            </Stack>
            <MentionTextField multiline rows={3} value={editComment} onChange={setEditComment} />
            <Stack direction="row" spacing={1}>
              <Button variant="contained" size="small" onClick={handleUpdate}>
                {t('common.save')}
              </Button>
              <Button variant="outlined" size="small" onClick={() => setIsEditing(false)}>
                {t('common.cancel')}
              </Button>
            </Stack>
          </Box>
        ) : (
          <>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'stretch', sm: 'flex-start' },
                gap: { xs: 1.5, sm: 2 },
                mb: 2,
              }}
            >
              <Box sx={{ display: 'flex', gap: 2, minWidth: 0, flex: 1 }}>
                <FlavorThumb
                  src={rating.flavor_image}
                  name={rating.flavor_name}
                  size={{ xs: 56, sm: 64 }}
                />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    variant={isXs ? 'subtitle1' : 'h6'}
                    sx={{ fontWeight: 700, lineHeight: 1.2, wordBreak: 'break-word' }}
                  >
                    <Link
                      to={`/flavor/${rating.flavor}`}
                      style={{ color: 'inherit', textDecoration: 'none' }}
                    >
                      {rating.flavor_name}
                    </Link>
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    flexWrap="wrap"
                    sx={{ mt: 0.5, rowGap: 0.5 }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {t(`categories.${rating.category_slug}`, {
                        defaultValue: rating.category_name,
                      })}{' '}
                      • {formatDate(rating.created_at)}
                    </Typography>
                    <StatusBadge
                      isLegacy={rating.is_legacy}
                      isAvailable={rating.is_available}
                      size="small"
                    />
                  </Stack>
                </Box>
              </Box>
              <Box sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' }, flexShrink: 0 }}>
                <RatingBadge
                  score={rating.score}
                  size={isXs ? 'medium' : isMobile ? 'medium' : 'large'}
                />
              </Box>
            </Box>

            <Box
              sx={{
                mb: 2,
                p: 2,
                bgcolor: alpha(theme.palette.text.primary, 0.03),
                borderRadius: 2,
              }}
            >
              {rating.comment ? (
                <RichText text={rating.comment} />
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  {t('dashboard.noComment')}
                </Typography>
              )}
            </Box>

            <Stack direction="row" spacing={2} alignItems="center">
              <Button
                size="small"
                startIcon={<CommentIcon fontSize="small" />}
                onClick={() => setExpanded((v) => !v)}
                sx={{ textTransform: 'none', fontWeight: 700, color: 'text.secondary' }}
              >
                {rating.replies.length} {t('common.replies')}
              </Button>
              <Box sx={{ flexGrow: 1 }} />
              <Button size="small" sx={{ fontWeight: 700 }} onClick={startEdit}>
                {t('common.edit')}
              </Button>
              <Button size="small" color="error" sx={{ fontWeight: 700 }} onClick={handleDelete}>
                {t('common.delete')}
              </Button>
            </Stack>

            <Collapse in={expanded}>
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                {rating.replies.map((reply) => (
                  <Box
                    key={reply.id}
                    sx={{ mb: 2, pl: 2, borderLeft: '3px solid', borderColor: 'primary.main' }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 0.5,
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                        {reply.user}
                        {reply.user === currentUsername && (
                          <VerifiedIcon
                            sx={{ fontSize: '0.8rem', color: 'primary.main', ml: 0.5 }}
                          />
                        )}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(reply.created_at)}
                        </Typography>
                        {reply.user === currentUsername && (
                          <Button
                            size="small"
                            color="error"
                            sx={{ minWidth: 0, p: 0, fontSize: '0.7rem' }}
                            onClick={() => handleDeleteReply(reply.id)}
                          >
                            {t('common.delete')}
                          </Button>
                        )}
                      </Stack>
                    </Box>
                    <Typography variant="body2">
                      <RichText text={reply.text} />
                    </Typography>
                  </Box>
                ))}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <MentionTextField
                      placeholder={t('community.writeReply')}
                      multiline
                      rows={2}
                      value={replyInput}
                      onChange={setReplyInput}
                      onKeyDown={(e) =>
                        (e.metaKey || e.ctrlKey) && e.key === 'Enter' && handleReplySubmit()
                      }
                    />
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleReplySubmit}
                    disabled={!replyInput}
                    sx={{ height: 40, px: 3, alignSelf: { xs: 'flex-end', sm: 'auto' } }}
                  >
                    {t('common.reply')}
                  </Button>
                </Stack>
              </Box>
            </Collapse>
          </>
        )}
      </CardContent>
    </GlassCard>
  );
};

export default MyReviewCard;
