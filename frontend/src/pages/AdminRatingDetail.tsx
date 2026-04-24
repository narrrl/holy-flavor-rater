import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, Stack, CircularProgress, TextField } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import { useTitle } from '../hooks/useTitle';
import MentionTextField from '../components/MentionTextField';
import { PageShell, SectionHeader, FormCard } from '../components/ui';

interface AdminRating {
  id: number;
  user: string;
  score: number;
  comment: string | null;
  flavor_name: string;
}

const AdminRatingDetail: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState<AdminRating | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRating = useCallback(async () => {
    try {
      const res = await api.get<AdminRating>(`ratings/${id}/`);
      setRating(res.data);
      setScore(res.data.score);
      setComment(res.data.comment || '');
    } catch (err) {
      console.error(err);
      navigate('/admin-panel');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchRating();
  }, [fetchRating]);

  useTitle(rating ? `${t('admin.manageRating')}: ${rating.flavor_name}` : 'Rating Management');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch(`ratings/${id}/`, { score, comment });
      fetchRating();
      alert('Rating updated!');
    } catch {
      alert('Update failed');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this rating and all replies?')) return;
    try {
      await api.delete(`ratings/${id}/`);
      navigate('/admin-panel');
    } catch {
      alert('Delete failed');
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
          subtitle={`User: ${rating.user}`}
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
            label="Score"
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
