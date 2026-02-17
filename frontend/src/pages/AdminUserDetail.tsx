import React, { useState, useEffect } from 'react';
import { 
    Container, Typography, Box, Card, CardContent, Button, 
    Stack, alpha, CircularProgress, Chip, Paper, List, ListItem, ListItemText,
    Avatar, Grid
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import SecurityIcon from '@mui/icons-material/Security';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { useTitle } from '../hooks/useTitle';
import { formatDate } from '../utils/date';

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
    const { id } = useParams<{ id: string }>();
    const [user, setUser] = useState<AdminUser | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = async () => {
        try {
            const res = await api.get(`admin-custom/${id}/user_detail/`);
            setUser(res.data);
        } catch (err) {
            console.error(err);
            navigate('/admin');
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

    const handleDeleteRating = async (ratingId: number) => {
        if (!confirm('Delete this rating?')) return;
        try {
            await api.delete(`ratings/${ratingId}/`);
            fetchUser();
        } catch (err) { alert('Delete failed'); }
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
            navigate('/admin');
        } catch (err) { alert('Delete failed'); }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
    if (!user) return <Typography>User not found</Typography>;

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Button 
                variant="outlined" 
                startIcon={<ArrowBackIcon />} 
                onClick={() => navigate('/admin')}
                sx={{ mb: 4, borderRadius: 2 }}
            >
                {t('common.back')}
            </Button>

            <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', mb: 4 }}>
                <CardContent sx={{ p: 4 }}>
                    <Stack direction="row" spacing={3} alignItems="center">
                        <Avatar sx={{ width: 80, height: 80, fontSize: '2rem', bgcolor: 'primary.main' }}>
                            {user.username.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{user.username}</Typography>
                            <Typography variant="body1" color="text.secondary">{user.email}</Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                                Joined: {formatDate(user.date_joined)} • Last Login: {formatDate(user.last_login)}
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                <Chip label={user.is_active ? 'Active' : 'Inactive'} color={user.is_active ? 'success' : 'default'} size="small" />
                                {user.is_superuser && <Chip label="Superuser" color="secondary" size="small" />}
                            </Stack>
                        </Box>
                        <Button 
                            variant="outlined" 
                            color={user.is_active ? "warning" : "success"}
                            onClick={handleToggleActive}
                        >
                            {user.is_active ? t('admin.deactivate') : t('admin.activate')}
                        </Button>
                    </Stack>
                </CardContent>
            </Card>

            <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Stack spacing={4}>
                        <Paper sx={{ p: 3, borderRadius: 3 }}>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SecurityIcon /> {t('admin.ipHistory')}
                            </Typography>
                            <List dense>
                                {user.ips.map((ip, idx) => (
                                    <ListItem key={idx}>
                                        <ListItemText primary={ip} />
                                    </ListItem>
                                ))}
                                {user.ips.length === 0 && <Typography variant="caption">No IP history available.</Typography>}
                            </List>
                        </Paper>
                        
                        <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'error.main', bgcolor: (theme) => alpha(theme.palette.error.main, 0.05) }}>
                            <Typography variant="h6" color="error" gutterBottom sx={{ fontWeight: 'bold' }}>{t('admin.dangerZone')}</Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                Deleting this user will permanently remove their profile, ratings, replies, and all associated metadata.
                            </Typography>
                            <Button 
                                variant="contained" 
                                color="error" 
                                startIcon={<DeleteIcon />}
                                onClick={handleDelete}
                                fullWidth
                            >
                                {t('admin.deleteUser')}
                            </Button>
                        </Paper>
                    </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 8 }}>
                    <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>User Content</Typography>
                    <Stack spacing={2}>
                        {user.ratings.map(rating => (
                            <Card key={rating.id} variant="outlined" sx={{ borderRadius: 3 }}>
                                <CardContent>
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{rating.flavor_name}</Typography>
                                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                            <Chip label={`${rating.score}/10`} size="small" color="primary" />
                                            <Button size="small" color="error" onClick={() => handleDeleteRating(rating.id)}>Delete</Button>
                                        </Box>
                                    </Stack>
                                    <Typography variant="body2" color="text.secondary" paragraph>
                                        {rating.comment || <i>No comment</i>}
                                    </Typography>
                                    
                                    {rating.replies.length > 0 && (
                                        <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid', borderColor: 'divider' }}>
                                            {rating.replies.map((reply: any) => (
                                                <Box key={reply.id} sx={{ mb: 1 }}>
                                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{reply.user}</Typography>
                                                        <Button size="small" color="error" sx={{ minWidth: 0, p: 0 }} onClick={() => handleDeleteReply(reply.id)}>Delete</Button>
                                                    </Stack>
                                                    <Typography variant="caption" display="block">{reply.text}</Typography>
                                                </Box>
                                            ))}
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                        {user.ratings.length === 0 && <Typography color="text.secondary">No ratings yet.</Typography>}
                    </Stack>
                </Grid>
            </Grid>
        </Container>
    );
};

export default AdminUserDetail;
