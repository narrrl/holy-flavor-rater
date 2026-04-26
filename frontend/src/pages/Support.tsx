import React, { useState, useMemo } from 'react';
import {
  Typography,
  Box,
  CardContent,
  Button,
  TextField,
  Stack,
  Chip,
  Divider,
  Collapse,
  CircularProgress,
  IconButton,
  Avatar,
  alpha,
  useTheme,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../api/queries/useTickets';
import { useMe } from '../api/queries/useMe';
import { useNotificationsQuery } from '../api/queries/useNotifications';
import {
  useAddTicketMessage,
  useCreateTicket,
  useDeleteTicket,
  useUpdateTicketStatus,
} from '../api/mutations/useTicketMutations';
import { useTitle } from '../hooks/useTitle';
import { formatDate } from '../utils/date';
import { PageShell, SectionHeader, GlassCard, FormCard, EmptyState } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';

type ChipStatusColor = 'error' | 'warning' | 'success' | 'default';
type ButtonStatusColor = 'error' | 'warning' | 'success' | 'primary';

const Support: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  useTitle(t('support.title'));
  const { data: tickets = [], isLoading: loading } = useTickets();
  const { data: currentUser = null } = useMe();
  const { data: notifications = [] } = useNotificationsQuery(true);
  const createTicketMutation = useCreateTicket();
  const addMessage = useAddTicketMessage();
  const updateStatusMutation = useUpdateTicketStatus();
  const deleteTicketMutation = useDeleteTicket();

  const [showCreate, setShowCreate] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [readTicketIds, setReadTicketIds] = useState<Set<number>>(new Set());
  const { notify } = useToast();
  const { confirm } = useConfirm();

  const unreadTicketIds = useMemo(() => {
    const ids = new Set<number>();
    notifications.forEach((n) => {
      // Notification carries .reply or .rating in its current shape; tickets
      // arrive as ticket_new / ticket_reply with the ticket id encoded in
      // .reply (legacy field name re-purposed by the serializer).
      const ticketId = (n as unknown as { ticket?: number | null }).ticket;
      if (!n.is_read && n.notification_type.startsWith('ticket') && ticketId != null) {
        if (!readTicketIds.has(ticketId)) ids.add(ticketId);
      }
    });
    return ids;
  }, [notifications, readTicketIds]);

  const handleExpand = (ticketId: number) => {
    if (expandedId === ticketId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(ticketId);
    if (unreadTicketIds.has(ticketId)) {
      setReadTicketIds((prev) => new Set(prev).add(ticketId));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTicketMutation.mutateAsync({ subject, description });
      setSubject('');
      setDescription('');
      setShowCreate(false);
    } catch {
      notify({ message: 'Failed to create ticket', severity: 'error' });
    }
  };

  const handleReply = async (ticketId: number) => {
    const text = replyText[ticketId];
    if (!text) return;
    try {
      await addMessage.mutateAsync({ ticketId, text });
      setReplyText({ ...replyText, [ticketId]: '' });
    } catch {
      notify({ message: 'Failed to send message', severity: 'error' });
    }
  };

  const handleUpdateStatus = async (ticketId: number, status: string) => {
    try {
      await updateStatusMutation.mutateAsync({ ticketId, status });
    } catch {
      notify({ message: 'Failed to update status', severity: 'error' });
    }
  };

  const handleDeleteTicket = async (ticketId: number) => {
    if (!(await confirm({ message: 'Delete this ticket?', danger: true }))) return;
    try {
      await deleteTicketMutation.mutateAsync(ticketId);
    } catch {
      notify({ message: 'Failed to delete ticket', severity: 'error' });
    }
  };

  const getChipColor = (status: string): ChipStatusColor => {
    switch (status) {
      case 'open':
        return 'error';
      case 'in_progress':
        return 'warning';
      case 'resolved':
        return 'success';
      default:
        return 'default';
    }
  };

  const getButtonColor = (status: string): ButtonStatusColor => {
    switch (status) {
      case 'open':
        return 'error';
      case 'in_progress':
        return 'warning';
      case 'resolved':
        return 'success';
      default:
        return 'primary';
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

      <SectionHeader
        title={t('support.title')}
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowCreate(!showCreate)}
            sx={{ borderRadius: 2 }}
          >
            {t('support.createTicket')}
          </Button>
        }
      />

      <Collapse in={showCreate}>
        <FormCard
          title={t('support.createTicket')}
          onSubmit={handleCreate}
          actions={
            <Button type="submit" variant="contained" sx={{ borderRadius: 2 }}>
              {t('support.createTicket')}
            </Button>
          }
        >
          <TextField
            fullWidth
            label={t('support.subject')}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
          <TextField
            fullWidth
            multiline
            rows={4}
            label={t('support.description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </FormCard>
      </Collapse>

      <SectionHeader
        title={currentUser?.is_superuser ? `${t('admin.users')} Tickets` : t('support.myTickets')}
        compact
      />

      {tickets.length === 0 ? (
        <EmptyState title={t('support.noTickets')} />
      ) : (
        <Stack spacing={2}>
          {tickets.map((ticket) => (
            <GlassCard
              key={ticket.id}
              sx={{
                borderColor: unreadTicketIds.has(ticket.id) ? 'primary.main' : undefined,
              }}
            >
              <CardContent sx={{ p: 0 }}>
                <Box
                  onClick={() => handleExpand(ticket.id)}
                  sx={{ p: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {unreadTicketIds.has(ticket.id) && (
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            bgcolor: 'primary.main',
                            borderRadius: '50%',
                          }}
                        />
                      )}
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          {ticket.subject}
                          {currentUser?.is_superuser && (
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{ ml: 1, color: 'primary.main' }}
                            >
                              ({ticket.username})
                            </Typography>
                          )}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(ticket.created_at)}
                        </Typography>
                      </Box>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {unreadTicketIds.has(ticket.id) && (
                        <Chip
                          label={t('support.unread')}
                          color="primary"
                          size="small"
                          sx={{ fontWeight: 'bold', height: 20, fontSize: '0.6rem' }}
                        />
                      )}
                      <Chip
                        label={t(`support.${ticket.status}`)}
                        color={getChipColor(ticket.status)}
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                      {currentUser?.is_superuser && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTicket(ticket.id);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Stack>
                  </Box>

                  {currentUser?.is_superuser && (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        mt: 1,
                        p: 1,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.action.active, 0.05),
                      }}
                    >
                      <Avatar
                        src={ticket.user_avatar || undefined}
                        sx={{ width: 24, height: 24, fontSize: '0.7rem' }}
                      >
                        {ticket.username.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 'bold',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {ticket.username} •{' '}
                          <span style={{ opacity: 0.7 }}>{ticket.user_email}</span>
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/profile/${ticket.username}`);
                        }}
                        sx={{ minWidth: 0, py: 0, textTransform: 'none', fontSize: '0.7rem' }}
                      >
                        View Profile
                      </Button>
                      <Button
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin-panel/user/${ticket.user}`);
                        }}
                        sx={{ minWidth: 0, py: 0, textTransform: 'none', fontSize: '0.7rem' }}
                      >
                        {t('admin.manageUser')}
                      </Button>
                    </Box>
                  )}
                </Box>

                <Collapse in={expandedId === ticket.id}>
                  <Divider />
                  <Box
                    sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.background.default, 0.5) }}
                  >
                    {currentUser?.is_superuser && (
                      <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: 'auto', pb: 1 }}>
                        {(['open', 'in_progress', 'resolved', 'closed'] as const).map((s) => (
                          <Button
                            key={s}
                            size="small"
                            variant={ticket.status === s ? 'contained' : 'outlined'}
                            onClick={() => handleUpdateStatus(ticket.id, s)}
                            color={getButtonColor(s)}
                            sx={{
                              textTransform: 'none',
                              borderRadius: 4,
                              fontSize: '0.7rem',
                              flexShrink: 0,
                            }}
                          >
                            {t(`support.${s}`)}
                          </Button>
                        ))}
                      </Stack>
                    )}

                    <Typography
                      variant="body2"
                      paragraph
                      sx={{
                        whiteSpace: 'pre-wrap',
                        mb: 3,
                        bgcolor: 'background.paper',
                        p: 2,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      {ticket.description}
                    </Typography>

                    <Stack spacing={2} sx={{ mb: 3 }}>
                      {ticket.messages.map((msg) => (
                        <Box
                          key={msg.id}
                          sx={{
                            alignSelf: msg.is_admin ? 'flex-start' : 'flex-end',
                            maxWidth: '85%',
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: msg.is_admin ? 'primary.main' : 'action.selected',
                            color: msg.is_admin ? 'white' : 'inherit',
                            boxShadow: msg.is_admin ? 2 : 0,
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 'bold', display: 'block' }}
                          >
                            {msg.username} {msg.is_admin && '(Support)'}
                          </Typography>
                          <Typography variant="body2" sx={{ my: 0.5 }}>
                            {msg.text}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ opacity: 0.7, display: 'block', textAlign: 'right' }}
                          >
                            {formatDate(msg.created_at)}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>

                    {ticket.status !== 'closed' && (
                      <Stack direction="row" spacing={1}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder={t('community.writeReply')}
                          value={replyText[ticket.id] || ''}
                          onChange={(e) =>
                            setReplyText({ ...replyText, [ticket.id]: e.target.value })
                          }
                          onKeyDown={(e) =>
                            e.key === 'Enter' && !e.shiftKey && handleReply(ticket.id)
                          }
                        />
                        <IconButton
                          color="primary"
                          onClick={() => handleReply(ticket.id)}
                          disabled={!replyText[ticket.id]}
                        >
                          <SendIcon />
                        </IconButton>
                      </Stack>
                    )}
                  </Box>
                </Collapse>
              </CardContent>
            </GlassCard>
          ))}
        </Stack>
      )}
    </PageShell>
  );
};

export default Support;
