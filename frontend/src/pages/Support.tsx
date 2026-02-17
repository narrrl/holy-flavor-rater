import React, { useState, useEffect } from 'react';
import { 
    Container, Typography, Box, Card, CardContent, Button, 
    TextField, Stack, Chip, Divider, Collapse, Paper, alpha, CircularProgress,
    IconButton
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { useTitle } from '../hooks/useTitle';
import { formatDate } from '../utils/date';

interface Message {
    id: number;
    username: string;
    text: string;
    created_at: string;
    is_admin: boolean;
}

interface Ticket {
    id: number;
    username: string;
    subject: string;
    description: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    created_at: string;
    messages: Message[];
}

const Support: React.FC = () => {
    const { t } = useTranslation();
    useTitle(t('support.title'));
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    
    // Create form
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    
    // Reply state
    const [replyText, setReplyText] = useState<{[key: number]: string}>({});
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);

    const fetchTickets = async () => {
        try {
            const [ticketRes, userRes] = await Promise.all([
                api.get('tickets/'),
                api.get('users/me/')
            ]);
            setTickets(ticketRes.data.results || ticketRes.data);
            setCurrentUser(userRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('tickets/', { subject, description });
            setSubject('');
            setDescription('');
            setShowCreate(false);
            fetchTickets();
        } catch (err) {
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
        } catch (err) {
            alert('Failed to send message');
        }
    };

    const handleUpdateStatus = async (ticketId: number, status: string) => {
        try {
            await api.post(`tickets/${ticketId}/update_status/`, { status });
            fetchTickets();
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'error';
            case 'in_progress': return 'warning';
            case 'resolved': return 'success';
            default: return 'default';
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                <Typography variant="h3" sx={{ fontWeight: 'bold' }}>{t('support.title')}</Typography>
                <Button 
                    variant="contained" 
                    startIcon={<AddIcon />} 
                    onClick={() => setShowCreate(!showCreate)}
                    sx={{ borderRadius: 2 }}
                >
                    {t('support.createTicket')}
                </Button>
            </Stack>

            <Collapse in={showCreate}>
                <Paper sx={{ p: 3, mb: 4, borderRadius: 3, border: '1px solid', borderColor: 'primary.main' }}>
                    <form onSubmit={handleCreate}>
                        <TextField 
                            fullWidth label={t('support.subject')} margin="normal" 
                            value={subject} onChange={(e) => setSubject(e.target.value)} required 
                        />
                        <TextField 
                            fullWidth multiline rows={4} label={t('support.description')} margin="normal" 
                            value={description} onChange={(e) => setDescription(e.target.value)} required 
                        />
                        <Button type="submit" variant="contained" sx={{ mt: 2, borderRadius: 2 }}>
                            {t('support.createTicket')}
                        </Button>
                    </form>
                </Paper>
            </Collapse>

            <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
                {currentUser?.is_superuser ? t('admin.users') + ' Tickets' : t('support.myTickets')}
            </Typography>
            
            {tickets.length === 0 ? (
                <Box sx={{ py: 8, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 4 }}>
                    <Typography color="text.secondary">{t('support.noTickets')}</Typography>
                </Box>
            ) : (
                <Stack spacing={2}>
                    {tickets.map((ticket: Ticket) => (
                        <Card key={ticket.id} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                            <CardContent sx={{ p: 0 }}>
                                <Box 
                                    onClick={() => setExpandedId(expandedId === ticket.id ? null : ticket.id)}
                                    sx={{ p: 2, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', '&:hover': { bgcolor: 'action.hover' } }}
                                >
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                            {ticket.subject}
                                            {currentUser?.is_superuser && (
                                                <Typography component="span" variant="caption" sx={{ ml: 1, color: 'primary.main' }}>
                                                    ({ticket.username})
                                                </Typography>
                                            )}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">{formatDate(ticket.created_at)}</Typography>
                                    </Box>
                                    <Chip label={t(`support.${ticket.status}`)} color={getStatusColor(ticket.status) as any} size="small" sx={{ fontWeight: 'bold' }} />
                                </Box>
                                
                                <Collapse in={expandedId === ticket.id}>
                                    <Divider />
                                    <Box sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.background.default, 0.5) }}>
                                        {currentUser?.is_superuser && (
                                            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                                                {['open', 'in_progress', 'resolved', 'closed'].map((s) => (
                                                    <Button 
                                                        key={s} size="small" variant={ticket.status === s ? "contained" : "outlined"} 
                                                        onClick={() => handleUpdateStatus(ticket.id, s)}
                                                        color={getStatusColor(s) as any}
                                                        sx={{ textTransform: 'none', borderRadius: 4, fontSize: '0.7rem' }}
                                                    >
                                                        {t(`support.${s}`)}
                                                    </Button>
                                                ))}
                                            </Stack>
                                        )}

                                        <Typography variant="body2" paragraph sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>
                                            {ticket.description}
                                        </Typography>
                                        
                                        <Stack spacing={2} sx={{ mb: 3 }}>
                                            {ticket.messages.map((msg: Message) => (
                                                <Box key={msg.id} sx={{ 
                                                    alignSelf: msg.is_admin ? 'flex-start' : 'flex-end',
                                                    maxWidth: '80%',
                                                    p: 1.5,
                                                    borderRadius: 2,
                                                    bgcolor: msg.is_admin ? 'primary.main' : 'action.selected',
                                                    color: msg.is_admin ? 'white' : 'inherit'
                                                }}>
                                                    <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>
                                                        {msg.username} {msg.is_admin && '(Support)'}
                                                    </Typography>
                                                    <Typography variant="body2">{msg.text}</Typography>
                                                    <Typography variant="caption" sx={{ opacity: 0.7 }}>{formatDate(msg.created_at)}</Typography>
                                                </Box>
                                            ))}
                                        </Stack>

                                        {ticket.status !== 'closed' && (
                                            <Stack direction="row" spacing={1}>
                                                <TextField 
                                                    fullWidth size="small" placeholder={t('community.writeReply')} 
                                                    value={replyText[ticket.id] || ''}
                                                    onChange={(e) => setReplyText({ ...replyText, [ticket.id]: e.target.value })}
                                                />
                                                <IconButton color="primary" onClick={() => handleReply(ticket.id)} disabled={!replyText[ticket.id]}>
                                                    <SendIcon />
                                                </IconButton>
                                            </Stack>
                                        )}
                                    </Box>
                                </Collapse>
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            )}
        </Container>
    );
};

export default Support;
