import React, { useEffect, useState } from 'react';
import { Box, Button, Stack, CircularProgress, TextField } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useAdminRating } from '../api/queries/useAdminQueries';
import { useDeleteRating, useUpdateRating } from '../api/mutations/useRatingMutations';
import { useTitle } from '../hooks/useTitle';
import MentionTextField from '../components/MentionTextField';
import { PageShell, SectionHeader, FormCard } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';

const AdminRatingDetail: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: rating, isLoading: loading, error } = useAdminRating(id);
  const updateRating = useUpdateRating();
  const deleteRating = useDeleteRating();

  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const { notify } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    if (rating) {
      setScore(rating.score);
      setComment(rating.comment || '');
    }
  }, [rating]);

  useEffect(() => {
    if (error) navigate('/admin-panel');
  }, [error, navigate]);

  useTitle(
    rating ? `${t('admin.manageRating')}: ${rating.flavor_name}` : t('admin.ratingMgmtTitle'),
  );

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await updateRating.mutateAsync({ id: Number(id), score, comment });
      notify({ message: t('admin.ratingUpdated'), severity: 'success' });
    } catch {
      notify({ message: t('admin.updateFailed'), severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!(await confirm({ message: t('admin.deleteRatingRepliesConfirm'), danger: true }))) return;
    try {
      await deleteRating.mutateAsync(Number(id));
      navigate('/admin-panel');
    } catch {
      notify({ message: t('admin.deleteFailed'), severity: 'error' });
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

  if (!rating) return null;

  return (
    <PageShell>
      <Button
        variant="outlined"
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ alignSelf: 'flex-start', borderRadius: 2 }}
      >
        {t('common.back')}
      </Button>

      <SectionHeader title={t('admin.manageRating')} />

      <Box sx={{ maxWidth: 560, width: '100%' }}>
        <FormCard
          title={rating.flavor_name}
          subtitle={t('admin.userLabel', { user: rating.user })}
          onSubmit={handleUpdate}
          actions={
            <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
              <Button variant="contained" fullWidth type="submit">
                {t('common.save')}
              </Button>
              <Button
                variant="outlined"
                color="error"
                fullWidth
                startIcon={<DeleteIcon />}
                onClick={handleDelete}
              >
                {t('common.delete')}
              </Button>
            </Stack>
          }
        >
          <TextField
            label={t('admin.scoreLabel')}
            type="number"
            slotProps={{ input: { inputProps: { min: 1, max: 10 } } }}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
          />
          <MentionTextField multiline rows={4} value={comment} onChange={setComment} />
        </FormCard>
      </Box>
    </PageShell>
  );
};

export default AdminRatingDetail;
