import React, { useState, useEffect } from 'react';
import { 
    Container, Typography, Box, Grid, Card, CardContent, Button, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Stack, alpha, CircularProgress, Chip, TextField, IconButton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import EmailIcon from '@mui/icons-material/Email';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useTitle } from '../hooks/useTitle';
import { formatDate } from '../utils/date';

interface Stats {
    total_users: number;
    total_ratings: number;
    total_replies: number;
    open_tickets: number;
    email_config: {
        host: string;
        port: number;
        use_tls: boolean;
        use_ssl: boolean;
        skip_verify: boolean;
    };
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
}

const AdminDashboard: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    useTitle(t('admin.title'));
    const [stats, setStats] = useState<Stats | null>(null);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchData = async () => {
        try {
            const [statsRes, usersRes] = await Promise.all([
                api.get('admin-custom/stats/'),
                api.get('admin-custom/users/')
            ]);
            setStats(statsRes.data);
            setUsers(usersRes.data);
        } catch (err) {
            console.error(err);
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSendTestEmail = async () => {
        try {
            await api.post('admin-custom/send_test_email/');
            alert(t('admin.testEmailSuccess'));
        } catch (err: any) {
            alert(`Error: ${err.response?.data?.error || 'Failed to send'}`);
        }
    };

    const filteredUsers = users.filter(u => 
        u.username.toLowerCase().includes(search.toLowerCase()) || 
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 4 }}>{t('admin.title')}</Typography>

            <Grid container spacing={3} sx={{ mb: 6 }}>
                <Grid size={{ xs: 12, md: 3 }}>
                    <Card sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1) }}>
                        <CardContent>
                            <Typography variant="overline">{t('admin.totalUsers')}</Typography>
                            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{stats?.total_users}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                    <Card sx={{ bgcolor: (theme) => alpha(theme.palette.error.main, 0.1) }}>
                        <CardContent>
                            <Typography variant="overline">{t('admin.openTickets')}</Typography>
                            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'error.main' }}>{stats?.open_tickets}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card variant="outlined">
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{t('admin.config')}: SMTP</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {stats?.email_config.host}:{stats?.email_config.port} • 
                                        TLS: {String(stats?.email_config.use_tls)} • 
                                        Insecure: {String(stats?.email_config.skip_verify)}
                                    </Typography>
                                </Box>
                                <Button variant="outlined" startIcon={<EmailIcon />} onClick={handleSendTestEmail}>
                                    {t('admin.sendTestEmail')}
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Box sx={{ mb: 4 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{t('admin.users')}</Typography>
                    <TextField 
                        size="small" placeholder="Search..." 
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        sx={{ width: 300 }}
                    />
                </Stack>
                <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <Table>
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>User</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Joined</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>IP History</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredUsers.map((user) => (
                                <TableRow key={user.id} hover>
                                    <TableCell>{user.id}</TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{user.username}</Typography>
                                        {user.is_superuser && <Chip label="Superuser" size="small" color="secondary" sx={{ height: 16, fontSize: '0.6rem' }} />}
                                    </TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={user.is_active ? 'Active' : 'Inactive'} 
                                            color={user.is_active ? 'success' : 'default'} 
                                            size="small" 
                                        />
                                    </TableCell>
                                    <TableCell>{formatDate(user.date_joined)}</TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                            {user.ips.slice(0, 3).map(ip => (
                                                <Chip key={ip} label={ip} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                                            ))}
                                            {user.ips.length > 3 && <Typography variant="caption">+{user.ips.length - 3}</Typography>}
                                        </Stack>
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={() => navigate(`/admin/user/${user.id}`)}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Container>
    );
};

export default AdminDashboard;
