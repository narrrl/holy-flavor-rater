import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Stack,
  CircularProgress,
  TextField,
  Paper,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import { useTitle } from '../hooks/useTitle';
import MentionTextField from '../components/MentionTextField';

const AdminRatingDetail: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchRating = async () => {
    try {
      const res = await api.get(`ratings/${id}/`);
      setRating(res.data);
      setScore(res.data.score);
      setComment(res.data.comment || '');
    } catch (err) {
      console.error(err);
      navigate('/admin-panel');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRating();
  }, [id]);

  useTitle(rating ? `${t('admin.manageRating')}: ${rating.flavor_name}` : 'Rating Management');

  const handleUpdate = async () => {
    try {
      await api.patch(`ratings/${id}/`, { score, comment });
      fetchRating();
      alert('Rating updated!');
    } catch (err) {
      alert('Update failed');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this rating and all replies?')) return;
    try {
      await api.delete(`ratings/${id}/`);
      navigate('/admin-panel');
    } catch (err) {
      alert('Delete failed');
    }
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Button
        variant="outlined"
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 4, borderRadius: 2 }}
      >
        {t('common.back')}
      </Button>

      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 4 }}>
        {t('admin.manageRating')}
      </Typography>

      <Paper sx={{ p: 3, borderRadius: 4 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
          {rating.flavor_name} (User: {rating.user})
        </Typography>
        <Stack spacing={3} sx={{ mt: 3 }}>
          <TextField
            label="Score"
            type="number"
            slotProps={{ input: { inputProps: { min: 1, max: 10 } } }}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
          />
          <MentionTextField multiline rows={4} value={comment} onChange={setComment} />
          <Stack direction="row" spacing={2}>
            <Button variant="contained" fullWidth onClick={handleUpdate}>
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
        </Stack>
      </Paper>
    </Container>
  );
};

export default AdminRatingDetail;
