import React, { useState, useEffect, useCallback } from 'react';
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
import api from '../lib/api';
import { useTitle } from '../hooks/useTitle';
import { formatDate } from '../utils/date';
import { PageShell, SectionHeader, GlassCard, FormCard, EmptyState } from '../components/ui';

interface Message {
  id: number;
  username: string;
  text: string;
  created_at: string;
  is_admin: boolean;
}

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

interface Ticket {
  id: number;
  user: number;
  username: string;
  user_email: string;
  user_avatar: string | null;
  subject: string;
  description: string;
  status: TicketStatus;
  created_at: string;
  messages: Message[];
}

interface CurrentUser {
  id: number;
  username: string;
  is_superuser: boolean;
}

interface NotificationDTO {
  is_read: boolean;
  notification_type: string;
  ticket: number | null;
}

type ChipStatusColor = 'error' | 'warning' | 'success' | 'default';
type ButtonStatusColor = 'error' | 'warning' | 'success' | 'primary';

const Support: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  useTitle(t('support.title'));
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [unreadTicketIds, setUnreadTicketIds] = useState<Set<number>>(new Set());

  const fetchTickets = useCallback(async () => {
    try {
      const [ticketRes, userRes, notifRes] = await Promise.all([
        api.get('tickets/'),
        api.get('users/me/'),
        api.get('notifications/'),
      ]);
      setTickets(ticketRes.data.results || ticketRes.data);
      setCurrentUser(userRes.data);

      const notifs: NotificationDTO[] = notifRes.data.results || notifRes.data;
      const unreadIds = new Set<number>(
        notifs
          .filter((n) => !n.is_read && n.notification_type.startsWith('ticket') && n.ticket != null)
          .map((n) => n.ticket as number),
      );
      setUnreadTicketIds(unreadIds);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleExpand = (ticketId: number) => {
    if (expandedId === ticketId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(ticketId);
    if (unreadTicketIds.has(ticketId)) {
      const newUnread = new Set(unreadTicketIds);
      newUnread.delete(ticketId);
      setUnreadTicketIds(newUnread);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('tickets/', { subject, description });
      setSubject('');
      setDescription('');
      setShowCreate(false);
      fetchTickets();
    } catch {
      alert('Failed to create ticket');
    }
  };

  const handleReply = async (ticketId: number) => {
    const text = replyText[ticketId];
    if (!text) return;
    try {
      await api.post(`tickets/${ticketId}/add_message/`, { text });
      setReplyText({ ...replyText, [ticketId]: '' });
      fetchTickets();
    } catch {
      alert('Failed to send message');
    }
  };

  const handleUpdateStatus = async (ticketId: number, status: string) => {
    try {
      await api.post(`tickets/${ticketId}/update_status/`, { status });
      fetchTickets();
    } catch {
      alert('Failed to update status');
    }
  };

  const handleDeleteTicket = async (ticketId: number) => {
    if (!confirm('Delete this ticket?')) return;
    try {
      await api.delete(`tickets/${ticketId}/`);
      fetchTickets();
    } catch {
      alert('Failed to delete ticket');
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
                  <Box sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.background.default, 0.5) }}>
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
                          <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>
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
