import React, { useState, useEffect } from 'react';
import { 
    Container, Typography, Box, Grid, Card, CardContent, Button, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Stack, alpha, CircularProgress, Chip, TextField, IconButton,
    useMediaQuery, Tabs, Tab
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import EmailIcon from '@mui/icons-material/Email';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import WallpaperIcon from '@mui/icons-material/Wallpaper';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useTitle } from '../hooks/useTitle';
import { formatDate } from '../utils/date';
import BannerSettingsDialog from '../components/BannerSettingsDialog';

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

interface Banner {
    id: number;
    name: string;
    slug: string;
    description: string;
    is_active: boolean;
    settings: any;
}

const AdminDashboard: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isMobile = useMediaQuery('(max-width:900px)');
    useTitle(t('admin.title'));
    const [stats, setStats] = useState<Stats | null>(null);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [currentTab, setCurrentTab] = useState(0);
    const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);
    const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

    const fetchData = async () => {
        try {
            const [statsRes, usersRes, bannersRes] = await Promise.all([
                api.get('admin-custom/stats/'),
                api.get('admin-custom/users/'),
                api.get('banners/')
            ]);
            setStats(statsRes.data);
            setUsers(usersRes.data);
            setBanners(bannersRes.data);
        } catch (err) {
            console.error(err);
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    const handleActivateBanner = async (id: number) => {
        try {
            await api.post(`banners/${id}/activate/`);
            fetchData();
        } catch (err) {
            console.error(err);
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
            <Button 
                variant="outlined" 
                startIcon={<ArrowBackIcon />} 
                onClick={() => navigate(-1)}
                sx={{ mb: 4, borderRadius: 2 }}
            >
                {t('common.back')}
            </Button>
            <Typography variant={isMobile ? "h4" : "h3"} sx={{ fontWeight: 'bold', mb: 4 }}>{t('admin.title')}</Typography>

            <Tabs 
                value={currentTab} 
                onChange={(_, v) => setCurrentTab(v)} 
                sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}
                variant={isMobile ? "scrollable" : "standard"}
            >
                <Tab icon={<SettingsIcon />} label={t('admin.overview')} iconPosition="start" />
                <Tab icon={<PeopleIcon />} label={t('admin.users')} iconPosition="start" />
                <Tab icon={<WallpaperIcon />} label={t('admin.banners')} iconPosition="start" />
            </Tabs>

            {currentTab === 0 && (
                <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: 6 }}>
                    <Grid size={{ xs: 6, md: 3 }}>
                        <Card sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1) }}>
                            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                                <Typography variant="overline" sx={{ fontSize: '0.6rem' }}>{t('admin.totalUsers')}</Typography>
                                <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 'bold' }}>{stats?.total_users}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                        <Card sx={{ bgcolor: (theme) => alpha(theme.palette.error.main, 0.1) }}>
                            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                                <Typography variant="overline" sx={{ fontSize: '0.6rem' }}>{t('admin.openTickets')}</Typography>
                                <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 'bold', color: 'error.main' }}>{stats?.open_tickets}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Card variant="outlined">
                            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                                <Stack direction={isMobile ? "column" : "row"} justifyContent="space-between" alignItems={isMobile ? "flex-start" : "center"} spacing={2}>
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{t('admin.config')}: SMTP</Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                            {stats?.email_config.host}:{stats?.email_config.port} • 
                                            TLS: {String(stats?.email_config.use_tls)} • 
                                            Insecure: {String(stats?.email_config.skip_verify)}
                                        </Typography>
                                    </Box>
                                    <Button variant="outlined" fullWidth={isMobile} startIcon={<EmailIcon />} onClick={handleSendTestEmail} size="small">
                                        {t('admin.sendTestEmail')}
                                    </Button>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {currentTab === 1 && (
                <Box sx={{ mb: 4 }}>
                    <Stack direction={isMobile ? "column" : "row"} justifyContent="space-between" alignItems={isMobile ? "flex-start" : "center"} sx={{ mb: 2 }} spacing={2}>
                        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{t('admin.users')}</Typography>
                        <TextField 
                            size="small" placeholder="Search..." 
                            fullWidth={isMobile}
                            value={search} onChange={(e) => setSearch(e.target.value)}
                            sx={{ width: isMobile ? '100%' : 300 }}
                        />
                    </Stack>

                    {isMobile ? (
                        <Stack spacing={2}>
                            {filteredUsers.map(user => (
                                <Card key={user.id} variant="outlined" sx={{ borderRadius: 3 }}>
                                    <CardContent sx={{ p: 2 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{user.username}</Typography>
                                            <IconButton size="small" onClick={() => navigate(`/admin-panel/user/${user.id}`)}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" display="block">{user.email}</Typography>
                                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                            <Chip label={user.is_active ? 'Active' : 'Inactive'} color={user.is_active ? 'success' : 'default'} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                                            {user.is_superuser && <Chip label="Admin" color="secondary" size="small" sx={{ height: 20, fontSize: '0.65rem' }} />}
                                        </Stack>
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    ) : (
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
                                                <IconButton size="small" onClick={() => navigate(`/admin-panel/user/${user.id}`)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Box>
            )}

            {currentTab === 2 && (
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>{t('admin.banners')}</Typography>
                    <Grid container spacing={3}>
                        {banners.map((banner) => (
                            <Grid size={{ xs: 12, md: 4 }} key={banner.id}>
                                <Card sx={{ borderRadius: 3, position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    {banner.is_active && (
                                        <Chip 
                                            icon={<CheckCircleIcon />} 
                                            label="Active" 
                                            color="success" 
                                            size="small"
                                            sx={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }}
                                        />
                                    )}
                                    <CardContent sx={{ flexGrow: 1 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>{banner.name}</Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{banner.description}</Typography>
                                        
                                        <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                                            <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}>Settings:</Typography>
                                            <pre style={{ margin: 0, fontSize: '0.7rem', overflow: 'auto' }}>
                                                {JSON.stringify(banner.settings, null, 2)}
                                            </pre>
                                        </Box>
                                    </CardContent>
                                    <Box sx={{ p: 2, pt: 0 }}>
                                        <Stack direction="row" spacing={1}>
                                            <Button 
                                                fullWidth 
                                                variant="outlined" 
                                                startIcon={<EditIcon />}
                                                onClick={() => {
                                                    setSelectedBanner(banner);
                                                    setIsSettingsDialogOpen(true);
                                                }}
                                            >
                                                Edit Settings
                                            </Button>
                                            <Button 
                                                fullWidth 
                                                variant={banner.is_active ? "outlined" : "contained"} 
                                                disabled={banner.is_active}
                                                onClick={() => handleActivateBanner(banner.id)}
                                            >
                                                {banner.is_active ? "Currently Active" : "Set as Active"}
                                            </Button>
                                        </Stack>
                                    </Box>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}

            <BannerSettingsDialog 
                open={isSettingsDialogOpen} 
                onClose={() => {
                    setIsSettingsDialogOpen(false);
                    setSelectedBanner(null);
                }} 
                banner={selectedBanner} 
                onSave={fetchData} 
            />
        </Container>
    );
};

export default AdminDashboard;
