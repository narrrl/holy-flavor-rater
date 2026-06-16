import React, { useEffect, useState } from 'react';
import { Box, Button, Stack, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useAdminReply } from '../api/queries/useAdminQueries';
import { useDeleteReply } from '../api/mutations/useRatingMutations';
import { useUpdateReply } from '../api/mutations/useReplyMutations';
import { useTitle } from '../hooks/useTitle';
import MentionTextField from '../components/MentionTextField';
import { PageShell, SectionHeader, FormCard } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';

const AdminReplyDetail: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: reply, isLoading: loading, error } = useAdminReply(id);
  const updateReply = useUpdateReply();
  const deleteReply = useDeleteReply();

  const [text, setText] = useState('');
  const { notify } = useToast();
  const { confirm } = useConfirm();

  // Seed the form from the loaded reply during render (tracking the
  // previously-synced row) so it re-fills only when the data changes.
  const [syncedReply, setSyncedReply] = useState(reply);
  if (reply && reply !== syncedReply) {
    setSyncedReply(reply);
    setText(reply.text);
  }

  useEffect(() => {
    if (error) navigate('/admin-panel');
  }, [error, navigate]);

  useTitle(reply ? `${t('admin.manageReply')}` : t('admin.replyMgmtTitle'));

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await updateReply.mutateAsync({ replyId: Number(id), text });
      notify({ message: t('admin.replyUpdated'), severity: 'success' });
    } catch {
      notify({ message: t('admin.updateFailed'), severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!(await confirm({ message: t('admin.deleteReplyConfirm'), danger: true }))) return;
    try {
      await deleteReply.mutateAsync(Number(id));
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
          title={t('admin.replyByLabel', { user: reply.user })}
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
