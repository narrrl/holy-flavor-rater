import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  alpha,
  CircularProgress,
  Chip,
  TextField,
  IconButton,
  useMediaQuery,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Switch,
  Divider,
  Alert,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import EmailIcon from '@mui/icons-material/Email';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import WallpaperIcon from '@mui/icons-material/Wallpaper';
import TerminalIcon from '@mui/icons-material/Terminal';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import InfoIcon from '@mui/icons-material/Info';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
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
  server_info: {
    debug: boolean;
    allowed_hosts: string[];
    frontend_url: string;
    media_root: string;
    static_root: string;
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
  is_enabled: boolean;
  settings: any;
  schema: any[];
}

interface Job {
  id: number;
  name: string;
  name_display: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  last_run: string | null;
  next_run: string | null;
  interval_hours: number;
  last_output: string;
  error_message: string;
}

interface SystemConfig {
  site_name: string;
  maintenance_mode: boolean;
  allow_new_signups: boolean;
  require_email_verification: boolean;
}

const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:900px)');
  useTitle(t('admin.title'));
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [statsRes, usersRes, bannersRes, jobsRes, configRes] = await Promise.all([
        api.get('admin-custom/stats/'),
        api.get('admin-custom/users/'),
        api.get('banners/'),
        api.get('admin-custom/jobs/'),
        api.get('admin-custom/config/'),
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data);

      const bannersData = Array.isArray(bannersRes.data)
        ? bannersRes.data
        : bannersRes.data.results || [];
      setBanners(bannersData);

      setJobs(jobsRes.data);
      setConfig(configRes.data);
    } catch (err) {
      console.error('Data fetch error:', err);
    }

    if (!silent) setLoading(false);
  };

  // Poll for job updates if any are running or pending
  useEffect(() => {
    const anyRunning = jobs.some((j) => j.status === 'running' || j.status === 'pending');
    if (anyRunning && currentTab === 3) {
      const interval = setInterval(() => fetchData(true), 3000);
      return () => clearInterval(interval);
    }
  }, [jobs, currentTab]);

  const handleUpdateConfig = async (key: string, value: any) => {
    try {
      const res = await api.patch('admin-custom/config/', { [key]: value });
      setConfig(res.data);
    } catch (err) {
      alert('Failed to update configuration');
    }
  };

  const handleTriggerJob = async (id: number) => {
    try {
      await api.post(`admin-custom/${id}/trigger_job/`);
      fetchData(true);
    } catch (err) {
      alert('Failed to trigger job');
    }
  };

  const handleUpdateJobSchedule = async (id: number, interval: number, nextRun?: string) => {
    try {
      const data: any = { interval_hours: interval };
      if (nextRun) data.next_run = nextRun;
      await api.patch(`admin-custom/${id}/update_job_schedule/`, data);
      fetchData(true);
    } catch (err) {
      alert('Failed to update schedule');
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

  const handleToggleEnabled = async (id: number) => {
    try {
      await api.post(`banners/${id}/toggle_enabled/`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to toggle visibility');
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

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );

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
      <Typography variant={isMobile ? 'h4' : 'h3'} sx={{ fontWeight: 'bold', mb: 4 }}>
        {t('admin.title')}
      </Typography>

      <Tabs
        value={currentTab}
        onChange={(_, v) => setCurrentTab(v)}
        sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}
        variant={isMobile ? 'scrollable' : 'standard'}
      >
        <Tab icon={<SettingsIcon />} label={t('admin.overview')} iconPosition="start" />
        <Tab icon={<PeopleIcon />} label={t('admin.users')} iconPosition="start" />
        <Tab icon={<WallpaperIcon />} label={t('admin.banners')} iconPosition="start" />
        <Tab icon={<TerminalIcon />} label="Jobs & Workers" iconPosition="start" />
      </Tabs>

      {currentTab === 0 && (
        <Box>
          <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: 6 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1) }}>
                <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                  <Typography variant="overline" sx={{ fontSize: '0.6rem' }}>
                    {t('admin.totalUsers')}
                  </Typography>
                  <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 'bold' }}>
                    {stats?.total_users}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card sx={{ bgcolor: (theme) => alpha(theme.palette.error.main, 0.1) }}>
                <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                  <Typography variant="overline" sx={{ fontSize: '0.6rem' }}>
                    {t('admin.openTickets')}
                  </Typography>
                  <Typography
                    variant={isMobile ? 'h5' : 'h4'}
                    sx={{ fontWeight: 'bold', color: 'error.main' }}
                  >
                    {stats?.open_tickets}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card variant="outlined">
                <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                  <Stack
                    direction={isMobile ? 'column' : 'row'}
                    justifyContent="space-between"
                    alignItems={isMobile ? 'flex-start' : 'center'}
                    spacing={2}
                  >
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {t('admin.config')}: SMTP
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block' }}
                      >
                        {stats?.email_config.host}:{stats?.email_config.port} • TLS:{' '}
                        {String(stats?.email_config.use_tls)} • Insecure:{' '}
                        {String(stats?.email_config.skip_verify)}
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      fullWidth={isMobile}
                      startIcon={<EmailIcon />}
                      onClick={handleSendTestEmail}
                      size="small"
                    >
                      {t('admin.sendTestEmail')}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={4}>
            {/* Live Config */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                System Configuration (Live)
              </Typography>
              <Paper variant="outlined" sx={{ p: 0, borderRadius: 3, overflow: 'hidden' }}>
                <List disablePadding>
                  {[
                    { key: 'site_name', label: 'Site Name', type: 'text' },
                    { key: 'maintenance_mode', label: 'Maintenance Mode', type: 'switch' },
                    { key: 'allow_new_signups', label: 'Allow Signups', type: 'switch' },
                    {
                      key: 'require_email_verification',
                      label: 'Require Email Verify',
                      type: 'switch',
                    },
                  ].map((item, idx) => (
                    <ListItem key={item.key} divider={idx < 3} sx={{ py: 2 }}>
                      <ListItemText
                        primary={item.label}
                        secondary={item.type === 'text' ? (config as any)?.[item.key] : null}
                      />
                      {item.type === 'switch' ? (
                        <Switch
                          checked={(config as any)?.[item.key] || false}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleUpdateConfig(item.key, e.target.checked)
                          }
                        />
                      ) : (
                        <Button
                          size="small"
                          onClick={() => {
                            const val = prompt(
                              `Enter new value for ${item.label}:`,
                              (config as any)?.[item.key],
                            );
                            if (val !== null) handleUpdateConfig(item.key, val);
                          }}
                        >
                          Edit
                        </Button>
                      )}
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>

            {/* Environment Info */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                Environment Info (.env)
              </Typography>
              <Paper
                variant="outlined"
                sx={{ p: 3, borderRadius: 3, bgcolor: alpha('#000', 0.02) }}
              >
                <Stack spacing={2.5}>
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}
                    >
                      API Status
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      DEBUG={String(stats?.server_info.debug)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}
                    >
                      Frontend URL
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {stats?.server_info.frontend_url}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}
                    >
                      Allowed Hosts
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {stats?.server_info.allowed_hosts.join(', ')}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <InfoIcon fontSize="small" color="primary" />
                    <Typography variant="caption" color="text.secondary">
                      These values are read from your server environment or .env file. To change
                      them, you must update the file and restart the backend container.
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {currentTab === 1 && (
        <Box sx={{ mb: 4 }}>
          <Stack
            direction={isMobile ? 'column' : 'row'}
            justifyContent="space-between"
            alignItems={isMobile ? 'flex-start' : 'center'}
            sx={{ mb: 2 }}
            spacing={2}
          >
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              {t('admin.users')}
            </Typography>
            <TextField
              size="small"
              placeholder="Search..."
              fullWidth={isMobile}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: isMobile ? '100%' : 300 }}
            />
          </Stack>

          {isMobile ? (
            <Stack spacing={2}>
              {filteredUsers.map((user) => (
                <Card key={user.id} variant="outlined" sx={{ borderRadius: 3 }}>
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {user.username}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/admin-panel/user/${user.id}`)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {user.email}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Chip
                        label={user.is_active ? 'Active' : 'Inactive'}
                        color={user.is_active ? 'success' : 'default'}
                        size="small"
                        sx={{ height: 20, fontSize: '0.65rem' }}
                      />
                      {user.is_superuser && (
                        <Chip
                          label="Admin"
                          color="secondary"
                          size="small"
                          sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            <TableContainer
              component={Paper}
              sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
            >
              <Table>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>User</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Joined</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>IP History</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>{user.id}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {user.username}
                        </Typography>
                        {user.is_superuser && (
                          <Chip
                            label="Superuser"
                            size="small"
                            color="secondary"
                            sx={{ height: 16, fontSize: '0.6rem' }}
                          />
                        )}
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
                          {user.ips.slice(0, 3).map((ip) => (
                            <Chip
                              key={ip}
                              label={ip}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          ))}
                          {user.ips.length > 3 && (
                            <Typography variant="caption">+{user.ips.length - 3}</Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/admin-panel/user/${user.id}`)}
                        >
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
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
            {t('admin.banners')} ({banners.length})
          </Typography>

          {banners.length === 0 ? (
            <Card variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
              <Typography color="text.secondary">
                No banner models found in the database.
              </Typography>
              <Button variant="outlined" sx={{ mt: 2 }} onClick={() => fetchData()}>
                Retry Loading
              </Button>
            </Card>
          ) : (
            <Stack spacing={3}>
              {banners.map((banner) => (
                <Card
                  key={banner.id}
                  sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 2,
                      }}
                    >
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {banner.name} (Slug: {banner.slug})
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        {!banner.is_enabled && (
                          <Chip
                            label="Hidden from Users"
                            color="warning"
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {banner.is_active && (
                          <Chip label="Global Default" color="success" size="small" />
                        )}
                      </Stack>
                    </Box>

                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {banner.description}
                    </Typography>

                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, mb: 2 }}>
                      <pre style={{ margin: 0, fontSize: '0.8rem' }}>
                        {JSON.stringify(banner.settings, null, 2)}
                      </pre>
                    </Box>

                    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setSelectedBanner(banner);
                          setIsSettingsDialogOpen(true);
                        }}
                      >
                        Edit Settings
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        color={banner.is_enabled ? 'warning' : 'success'}
                        onClick={() => handleToggleEnabled(banner.id)}
                        disabled={banner.is_active}
                      >
                        {banner.is_enabled ? 'Disable for Users' : 'Enable for Users'}
                      </Button>
                      {!banner.is_active && (
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleActivateBanner(banner.id)}
                        >
                          Set as Default
                        </Button>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Box>
      )}

      {currentTab === 3 && (
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
            Background Worker Jobs
          </Typography>
          <Stack spacing={3}>
            {jobs.map((job) => (
              <Card
                key={job.id}
                sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 2,
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {job.name_display}
                    </Typography>
                    <Chip
                      label={job.status === 'pending' ? 'QUEUED' : job.status.toUpperCase()}
                      size="small"
                      color={
                        job.status === 'completed'
                          ? 'success'
                          : job.status === 'running'
                            ? 'info'
                            : job.status === 'failed'
                              ? 'error'
                              : 'default'
                      }
                      variant={job.status === 'running' ? 'filled' : 'outlined'}
                    />
                  </Box>

                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Last Run
                      </Typography>
                      <Typography variant="body2">
                        {job.last_run ? formatDate(job.last_run) : 'Never'}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Next Run
                      </Typography>
                      <Typography variant="body2">
                        {job.next_run
                          ? formatDate(job.next_run)
                          : job.interval_hours > 0
                            ? 'Queued...'
                            : 'Disabled'}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        sx={{ mb: 0.5 }}
                      >
                        Schedule
                      </Typography>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={job.interval_hours}
                          onChange={(e) => handleUpdateJobSchedule(job.id, Number(e.target.value))}
                          sx={{ height: 32, fontSize: '0.875rem' }}
                        >
                          <MenuItem value={0}>Disabled</MenuItem>
                          <MenuItem value={1}>Hourly</MenuItem>
                          <MenuItem value={6}>Every 6 Hours</MenuItem>
                          <MenuItem value={12}>Every 12 Hours</MenuItem>
                          <MenuItem value={24}>Daily</MenuItem>
                          <MenuItem value={168}>Weekly</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>

                  {job.last_output && (
                    <Box sx={{ mb: 2 }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        gutterBottom
                      >
                        Last Run Output
                      </Typography>
                      <Box
                        sx={{
                          p: 1.5,
                          bgcolor: '#1e1e1e',
                          color: '#d4d4d4',
                          borderRadius: 2,
                          maxHeight: 150,
                          overflowY: 'auto',
                          border: '1px solid #333',
                        }}
                      >
                        <pre
                          style={{
                            margin: 0,
                            fontSize: '0.75rem',
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {job.last_output}
                        </pre>
                      </Box>
                    </Box>
                  )}

                  {job.error_message && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="error" display="block" gutterBottom>
                        Last Error
                      </Typography>
                      <Alert severity="error" sx={{ py: 0 }}>
                        {job.error_message}
                      </Alert>
                    </Box>
                  )}

                  <Button
                    variant="contained"
                    startIcon={<PlayArrowIcon />}
                    disabled={job.status === 'running'}
                    onClick={() => handleTriggerJob(job.id)}
                  >
                    Trigger Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Stack>
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
