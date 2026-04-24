import React, { useCallback, useEffect, useState } from 'react';
import {
  Typography,
  Box,
  CardContent,
  Button,
  Stack,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Grid,
  TextField,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import SecurityIcon from '@mui/icons-material/Security';
import HistoryIcon from '@mui/icons-material/History';
import RateReviewIcon from '@mui/icons-material/RateReview';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import { useTitle } from '../hooks/useTitle';
import { formatDate } from '../utils/date';
import MentionTextField from '../components/MentionTextField';
import RichText from '../components/RichText';
import {
  PageShell,
  SectionHeader,
  GlassCard,
  GlassPaper,
  FormCard,
  EmptyState,
} from '../components/ui';

interface AdminReply {
  id: number;
  user: string;
  text: string;
  created_at: string;
}

interface AdminRating {
  id: number;
  flavor_name: string;
  score: number;
  comment: string;
  created_at: string;
  replies: AdminReply[];
}

interface AdminUser {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_login: string;
  ips: string[];
  ratings: AdminRating[];
}

const AdminUserDetail: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  const [editingRatingId, setEditingRatingId] = useState<number | null>(null);
  const [editScore, setEditScore] = useState(0);
  const [editComment, setEditComment] = useState('');

  const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
  const [editReplyText, setEditReplyText] = useState('');

  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get(`admin-custom/${id}/user_detail/`);
      setUser(res.data);
    } catch (err) {
      console.error(err);
      navigate('/admin-panel');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useTitle(user ? `${t('admin.manageUser')}: ${user.username}` : 'User Management');

  const handleToggleActive = async () => {
    if (!user) return;
    try {
      await api.patch(`admin-custom/${id}/user_detail/`, { is_active: !user.is_active });
      fetchUser();
    } catch {
      alert('Action failed');
    }
  };

  const handleUpdateRating = async (ratingId: number) => {
    try {
      await api.patch(`ratings/${ratingId}/`, { score: editScore, comment: editComment });
      setEditingRatingId(null);
      fetchUser();
    } catch {
      alert('Update failed');
    }
  };

  const handleDeleteRating = async (ratingId: number) => {
    if (!confirm('Delete this rating?')) return;
    try {
      await api.delete(`ratings/${ratingId}/`);
      fetchUser();
    } catch {
      alert('Delete failed');
    }
  };

  const handleUpdateReply = async (replyId: number) => {
    try {
      await api.patch(`replies/${replyId}/`, { text: editReplyText });
      setEditingReplyId(null);
      fetchUser();
    } catch {
      alert('Update failed');
    }
  };

  const handleDeleteReply = async (replyId: number) => {
    if (!confirm('Delete this reply?')) return;
    try {
      await api.delete(`replies/${replyId}/`);
      fetchUser();
    } catch {
      alert('Delete failed');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('PERMANENTLY DELETE THIS USER AND ALL DATA? This cannot be undone.'))
      return;
    try {
      await api.delete(`admin-custom/${id}/user_detail/`);
      navigate('/admin-panel');
    } catch {
      alert('Delete failed');
    }
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  if (!user) return <Typography>User not found</Typography>;

  return (
    <PageShell>
      <Button
        variant="outlined"
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 3, borderRadius: 2 }}
      >
        {t('common.back')}
      </Button>

      <GlassCard intensity="strong" sx={{ mb: 4 }}>
        <CardContent sx={{ p: { xs: 2, md: 4 } }}>
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, sm: 'auto' }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  fontSize: '2rem',
                  bgcolor: 'primary.main',
                  mx: 'auto',
                }}
              >
                {user.username.charAt(0).toUpperCase()}
              </Avatar>
            </Grid>
            <Grid size={{ xs: 12, sm: 8, md: 9 }}>
              <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {user.username}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {user.email}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  sx={{ mt: 0.5 }}
                >
                  Joined: {formatDate(user.date_joined)} • Last Login: {formatDate(user.last_login)}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ mt: 1.5, justifyContent: { xs: 'center', sm: 'flex-start' } }}
                >
                  <Chip
                    label={user.is_active ? 'Active' : 'Inactive'}
                    color={user.is_active ? 'success' : 'default'}
                    size="small"
                  />
                  {user.is_superuser && <Chip label="Superuser" color="secondary" size="small" />}
                </Stack>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 'auto' }}>
              <Button
                fullWidth
                variant="contained"
                color={user.is_active ? 'warning' : 'success'}
                onClick={handleToggleActive}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
              >
                {user.is_active ? t('admin.deactivate') : t('admin.activate')}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </GlassCard>

      <Box sx={{ mb: 4 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="fullWidth">
          <Tab
            icon={<RateReviewIcon />}
            label={`Content (${user.ratings.length})`}
            sx={{ fontWeight: 'bold' }}
          />
          <Tab icon={<HistoryIcon />} label="Security & IP" sx={{ fontWeight: 'bold' }} />
          <Tab
            icon={<SecurityIcon />}
            label="Danger Zone"
            sx={{ fontWeight: 'bold', color: 'error.main' }}
          />
        </Tabs>
        <Divider />
      </Box>

      {activeTab === 0 && (
        <Box>
          <SectionHeader title="User Ratings & Discussion" compact />
          <Stack spacing={2}>
            {user.ratings.map((rating) => (
              <GlassCard key={rating.id} intensity="subtle">
                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                  {editingRatingId === rating.id ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="body2">Score:</Typography>
                        <TextField
                          type="number"
                          size="small"
                          slotProps={{ input: { inputProps: { min: 1, max: 10 } } }}
                          value={editScore}
                          onChange={(e) => setEditScore(Number(e.target.value))}
                          sx={{ width: 80 }}
                        />
                      </Stack>
                      <MentionTextField
                        multiline
                        rows={3}
                        value={editComment}
                        onChange={setEditComment}
                      />
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleUpdateRating(rating.id)}
                        >
                          {t('common.save')}
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setEditingRatingId(null)}
                        >
                          {t('common.cancel')}
                        </Button>
                      </Stack>
                    </Box>
                  ) : (
                    <>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        sx={{ mb: 1 }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          {rating.flavor_name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Chip
                            label={`${rating.score}/10`}
                            size="small"
                            color="primary"
                            sx={{ fontWeight: '900' }}
                          />
                          <Button
                            size="small"
                            onClick={() => {
                              setEditingRatingId(rating.id);
                              setEditScore(rating.score);
                              setEditComment(rating.comment || '');
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleDeleteRating(rating.id)}
                          >
                            Delete
                          </Button>
                        </Box>
                      </Stack>
                      <Box sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 2, mb: 2 }}>
                        {rating.comment ? (
                          <Typography variant="body2" color="text.primary">
                            <RichText text={rating.comment} />
                          </Typography>
                        ) : (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ fontStyle: 'italic' }}
                          >
                            No comment
                          </Typography>
                        )}
                      </Box>

                      {rating.replies.length > 0 && (
                        <Box sx={{ pl: 2, borderLeft: '2px solid', borderColor: 'divider' }}>
                          {rating.replies.map((reply) => (
                            <Box key={reply.id} sx={{ mb: 1.5 }}>
                              {editingReplyId === reply.id ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                  <MentionTextField
                                    value={editReplyText}
                                    onChange={setEditReplyText}
                                  />
                                  <Stack direction="row" spacing={1}>
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
                                  </Stack>
                                </Box>
                              ) : (
                                <>
                                  <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontWeight: 'bold',
                                        color:
                                          reply.user === user.username
                                            ? 'primary.main'
                                            : 'text.secondary',
                                      }}
                                    >
                                      {reply.user}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                      <Button
                                        size="small"
                                        sx={{ minWidth: 0, p: 0, fontSize: '0.7rem' }}
                                        onClick={() => {
                                          setEditingReplyId(reply.id);
                                          setEditReplyText(reply.text);
                                        }}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        size="small"
                                        color="error"
                                        sx={{ minWidth: 0, p: 0, fontSize: '0.7rem' }}
                                        onClick={() => handleDeleteReply(reply.id)}
                                      >
                                        Delete
                                      </Button>
                                    </Box>
                                  </Stack>
                                  <Typography variant="caption" display="block" sx={{ mt: 0.2 }}>
                                    <RichText text={reply.text} />
                                  </Typography>
                                </>
                              )}
                            </Box>
                          ))}
                        </Box>
                      )}
                    </>
                  )}
                </CardContent>
              </GlassCard>
            ))}
            {user.ratings.length === 0 && <EmptyState title="No ratings yet." />}
          </Stack>
        </Box>
      )}

      {activeTab === 1 && (
        <GlassPaper intensity="subtle" sx={{ p: 3 }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <SecurityIcon /> {t('admin.ipHistory')}
          </Typography>
          <List dense>
            {user.ips.map((ip, idx) => (
              <ListItem key={idx} divider={idx < user.ips.length - 1}>
                <ListItemText
                  primary={ip}
                  primaryTypographyProps={{ sx: { fontWeight: 'bold', fontFamily: 'monospace' } }}
                />
              </ListItem>
            ))}
            {user.ips.length === 0 && (
              <Typography variant="caption">No IP history available.</Typography>
            )}
          </List>
        </GlassPaper>
      )}

      {activeTab === 2 && (
        <FormCard
          title={t('admin.dangerZone')}
          subtitle="Deleting this user will permanently remove their profile, all their ratings, replies, and IP history. This action is irreversible."
          danger
          asForm={false}
          actions={
            <Button
              variant="contained"
              color="error"
              size="large"
              startIcon={<DeleteIcon />}
              onClick={handleDelete}
              sx={{ borderRadius: 2, fontWeight: 'bold', px: 4 }}
            >
              {t('admin.deleteUser')}
            </Button>
          }
        >
          <Typography variant="body2" color="text.secondary">
            Proceed only if the user has been reviewed for policy violations or requested deletion.
          </Typography>
        </FormCard>
      )}
    </PageShell>
  );
};

export default AdminUserDetail;
