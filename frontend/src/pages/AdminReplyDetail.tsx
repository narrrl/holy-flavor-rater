import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, Stack, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import { useTitle } from '../hooks/useTitle';
import MentionTextField from '../components/MentionTextField';
import { PageShell, SectionHeader, FormCard } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';

interface AdminReply {
  id: number;
  user: string;
  text: string;
}

const AdminReplyDetail: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [text, setText] = useState('');
  const [reply, setReply] = useState<AdminReply | null>(null);
  const [loading, setLoading] = useState(true);
  const { notify } = useToast();
  const { confirm } = useConfirm();

  const fetchReply = useCallback(async () => {
    try {
      const res = await api.get<AdminReply>(`replies/${id}/`);
      setReply(res.data);
      setText(res.data.text);
    } catch (err) {
      console.error(err);
      navigate('/admin-panel');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchReply();
  }, [fetchReply]);

  useTitle(reply ? `${t('admin.manageReply')}` : 'Reply Management');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch(`replies/${id}/`, { text });
      fetchReply();
      notify({ message: 'Reply updated!', severity: 'success' });
    } catch {
      notify({ message: 'Update failed', severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!(await confirm({ message: 'Delete this reply?', danger: true }))) return;
    try {
      await api.delete(`replies/${id}/`);
      navigate('/admin-panel');
    } catch {
      notify({ message: 'Delete failed', severity: 'error' });
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

  if (!reply) return null;

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

      <SectionHeader title={t('admin.manageReply')} />

      <Box sx={{ maxWidth: 560, width: '100%' }}>
        <FormCard
          title={`Reply by ${reply.user}`}
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
          <MentionTextField multiline rows={4} value={text} onChange={setText} />
        </FormCard>
      </Box>
    </PageShell>
  );
};

export default AdminReplyDetail;
