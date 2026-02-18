import React, { useState, useEffect } from 'react';
import { 
    Container, Typography, Box, Card, CardContent, Button, 
    Stack, alpha, useTheme, CircularProgress, Chip, Paper, List, ListItem, ListItemText,
    Avatar, Grid, TextField, Tabs, Tab, Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import SecurityIcon from '@mui/icons-material/Security';
import HistoryIcon from '@mui/icons-material/History';
import RateReviewIcon from '@mui/icons-material/RateReview';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { useTitle } from '../hooks/useTitle';
import { formatDate } from '../utils/date';
import MentionTextField from '../components/MentionTextField';
import RichText from '../components/RichText';

interface AdminUser {
    id: number;
    username: string;
    email: string;
    is_active: boolean;
    is_superuser: boolean;
    date_joined: string;
    last_login: string;
    ips: string[];
    ratings: any[];
}

const AdminUserDetail: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const theme = useTheme();
    const { id } = useParams<{ id: string }>();
    const [user, setUser] = useState<AdminUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);

    // Edit state for Ratings
    const [editingRatingId, setEditingRatingId] = useState<number | null>(null);
    const [editScore, setEditScore] = useState(0);
    const [editComment, setEditComment] = useState('');

    // Edit state for Replies
    const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
    const [editReplyText, setEditReplyText] = useState('');

    const fetchUser = async () => {
        try {
            const res = await api.get(`admin-custom/${id}/user_detail/`);
            setUser(res.data);
        } catch (err) {
            console.error(err);
            navigate('/admin-panel');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, [id]);

    useTitle(user ? `${t('admin.manageUser')}: ${user.username}` : 'User Management');

    const handleToggleActive = async () => {
        if (!user) return;
        try {
            await api.patch(`admin-custom/${id}/user_detail/`, { is_active: !user.is_active });
            fetchUser();
        } catch (err) { alert('Action failed'); }
    };

    const handleUpdateRating = async (ratingId: number) => {
        try {
            await api.patch(`ratings/${ratingId}/`, { score: editScore, comment: editComment });
            setEditingRatingId(null);
            fetchUser();
        } catch (err) { alert('Update failed'); }
    };

    const handleDeleteRating = async (ratingId: number) => {
        if (!confirm('Delete this rating?')) return;
        try {
            await api.delete(`ratings/${ratingId}/`);
            fetchUser();
        } catch (err) { alert('Delete failed'); }
    };

    const handleUpdateReply = async (replyId: number) => {
        try {
            await api.patch(`replies/${replyId}/`, { text: editReplyText });
            setEditingReplyId(null);
            fetchUser();
        } catch (err) { alert('Update failed'); }
    };

    const handleDeleteReply = async (replyId: number) => {
        if (!confirm('Delete this reply?')) return;
        try {
            await api.delete(`replies/${replyId}/`);
            fetchUser();
        } catch (err) { alert('Delete failed'); }
    };

    const handleDelete = async () => {
        if (!window.confirm('PERMANENTLY DELETE THIS USER AND ALL DATA? This cannot be undone.')) return;
        try {
            await api.delete(`admin-custom/${id}/user_detail/`);
            navigate('/admin-panel');
        } catch (err) { alert('Delete failed'); }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
    if (!user) return <Typography>User not found</Typography>;

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Button 
                variant="outlined" 
                startIcon={<ArrowBackIcon />} 
                onClick={() => navigate('/admin-panel')}
                sx={{ mb: 4, borderRadius: 2 }}
            >
                {t('common.back')}
            </Button>

            {/* Profile Header */}
            <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', mb: 4 }}>
                <CardContent sx={{ p: { xs: 2, md: 4 } }}>
                    <Grid container spacing={3} alignItems="center">
                        <Grid size={{ xs: 12, sm: 'auto' }}>
                            <Avatar sx={{ width: 80, height: 80, fontSize: '2rem', bgcolor: 'primary.main', mx: 'auto' }}>
                                {user.username.charAt(0).toUpperCase()}
                            </Avatar>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 8, md: 9 }}>
                            <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{user.username}</Typography>
                                <Typography variant="body1" color="text.secondary">{user.email}</Typography>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                    Joined: {formatDate(user.date_joined)} • Last Login: {formatDate(user.last_login)}
                                </Typography>
                                <Stack direction="row" spacing={1} sx={{ mt: 1.5, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                                    <Chip label={user.is_active ? 'Active' : 'Inactive'} color={user.is_active ? 'success' : 'default'} size="small" />
                                    {user.is_superuser && <Chip label="Superuser" color="secondary" size="small" />}
                                </Stack>
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 'auto' }}>
                            <Button 
                                fullWidth
                                variant="contained" 
                                color={user.is_active ? "warning" : "success"}
                                onClick={handleToggleActive}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                            >
                                {user.is_active ? t('admin.deactivate') : t('admin.activate')}
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Content Tabs */}
            <Box sx={{ mb: 4 }}>
                <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="fullWidth">
                    <Tab icon={<RateReviewIcon />} label={`Content (${user.ratings.length})`} sx={{ fontWeight: 'bold' }} />
                    <Tab icon={<HistoryIcon />} label="Security & IP" sx={{ fontWeight: 'bold' }} />
                    <Tab icon={<SecurityIcon />} label="Danger Zone" sx={{ fontWeight: 'bold', color: 'error.main' }} />
                </Tabs>
                <Divider />
            </Box>

            {/* TAB 0: USER CONTENT (Ratings & Replies) */}
            {activeTab === 0 && (
                <Box>
                    <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>User Ratings & Discussion</Typography>
                    <Stack spacing={2}>
                        {user.ratings.map(rating => (
                            <Card key={rating.id} variant="outlined" sx={{ borderRadius: 3, bgcolor: alpha(theme.palette.background.paper, 0.4) }}>
                                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                                    {editingRatingId === rating.id ? (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Typography variant="body2">Score:</Typography>
                                                <TextField 
                                                    type="number" size="small" 
                                                    slotProps={{ input: { inputProps: { min: 1, max: 10 } } }}
                                                    value={editScore} onChange={(e) => setEditScore(Number(e.target.value))} 
                                                    sx={{ width: 80 }}
                                                />
                                            </Stack>
                                            <MentionTextField 
                                                multiline rows={3} 
                                                value={editComment} 
                                                onChange={setEditComment} 
                                            />
                                            <Stack direction="row" spacing={1}>
                                                <Button variant="contained" size="small" onClick={() => handleUpdateRating(rating.id)}>{t('common.save')}</Button>
                                                <Button variant="outlined" size="small" onClick={() => setEditingRatingId(null)}>{t('common.cancel')}</Button>
                                            </Stack>
                                        </Box>
                                    ) : (
                                        <>
                                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{rating.flavor_name}</Typography>
                                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                                    <Chip label={`${rating.score}/10`} size="small" color="primary" sx={{ fontWeight: '900' }} />
                                                    <Button size="small" onClick={() => { setEditingRatingId(rating.id); setEditScore(rating.score); setEditComment(rating.comment || ''); }}>Edit</Button>
                                                    <Button size="small" color="error" onClick={() => handleDeleteRating(rating.id)}>Delete</Button>
                                                </Box>
                                            </Stack>
                                            <Box sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 2, mb: 2 }}>
                                                {rating.comment ? (
                                                    <Typography variant="body2" color="text.primary">
                                                        <RichText text={rating.comment} />
                                                    </Typography>
                                                ) : (
                                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>No comment</Typography>
                                                )}
                                            </Box>
                                            
                                            {rating.replies.length > 0 && (
                                                <Box sx={{ pl: 2, borderLeft: '2px solid', borderColor: 'divider' }}>
                                                    {rating.replies.map((reply: any) => (
                                                        <Box key={reply.id} sx={{ mb: 1.5 }}>
                                                            {editingReplyId === reply.id ? (
                                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                                    <MentionTextField value={editReplyText} onChange={setEditReplyText} />
                                                                    <Stack direction="row" spacing={1}>
                                                                        <Button variant="contained" size="small" onClick={() => handleUpdateReply(reply.id)}>{t('common.save')}</Button>
                                                                        <Button variant="outlined" size="small" onClick={() => setEditingReplyId(null)}>{t('common.cancel')}</Button>
                                                                    </Stack>
                                                                </Box>
                                                            ) : (
                                                                <>
                                                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: reply.user === user.username ? 'primary.main' : 'text.secondary' }}>
                                                                            {reply.user}
                                                                        </Typography>
                                                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                                            <Button size="small" sx={{ minWidth: 0, p: 0, fontSize: '0.7rem' }} onClick={() => { setEditingReplyId(reply.id); setEditReplyText(reply.text); }}>Edit</Button>
                                                                            <Button size="small" color="error" sx={{ minWidth: 0, p: 0, fontSize: '0.7rem' }} onClick={() => handleDeleteReply(reply.id)}>Delete</Button>
                                                                        </Box>
                                                                    </Stack>
                                                                    <Typography variant="caption" display="block" sx={{ mt: 0.2 }}><RichText text={reply.text} /></Typography>
                                                                </>
                                                            )}
                                                        </Box>
                                                    ))}
                                                </Box>
                                            )}
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                        {user.ratings.length === 0 && (
                            <Box sx={{ py: 6, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 3, border: '1px dashed', borderColor: 'divider' }}>
                                <Typography color="text.secondary">No ratings yet.</Typography>
                            </Box>
                        )}
                    </Stack>
                </Box>
            )}

            {/* TAB 1: SECURITY & IP */}
            {activeTab === 1 && (
                <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
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
                        {user.ips.length === 0 && <Typography variant="caption">No IP history available.</Typography>}
                    </List>
                </Paper>
            )}

            {/* TAB 2: DANGER ZONE */}
            {activeTab === 2 && (
                <Paper sx={{ p: 4, borderRadius: 3, border: '1px solid', borderColor: 'error.main', bgcolor: (theme) => alpha(theme.palette.error.main, 0.05) }}>
                    <Typography variant="h5" color="error" gutterBottom sx={{ fontWeight: 'bold' }}>{t('admin.dangerZone')}</Typography>
                    <Typography variant="body1" sx={{ mb: 4, maxWidth: 600 }}>
                        Deleting this user will permanently remove their profile, all their ratings, replies, and IP history. 
                        <strong> This action is irreversible.</strong>
                    </Typography>
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
                </Paper>
            )}
        </Container>
    );
};

export default AdminUserDetail;
