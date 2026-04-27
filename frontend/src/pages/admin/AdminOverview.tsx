import {
  alpha,
  Box,
  Button,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import InfoIcon from '@mui/icons-material/Info';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlassPaper } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { useAdminStats } from '../../api/queries/useAdminQueries';
import { useSendTestEmail } from '../../api/mutations/useAdminMutations';

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

const AdminOverview = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { notify } = useToast();
  const { data: stats = null, isLoading } = useAdminStats() as unknown as {
    data: Stats | null | undefined;
    isLoading: boolean;
  };
  const sendTestEmailMutation = useSendTestEmail();

  const handleSendTestEmail = async () => {
    try {
      await sendTestEmailMutation.mutateAsync();
      notify({ message: t('admin.testEmailSuccess'), severity: 'success' });
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } };
      notify({
        message: `Error: ${error.response?.data?.error || 'Failed to send'}`,
        severity: 'error',
      });
    }
  };

  if (isLoading || !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: 6 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <GlassCard
            intensity="subtle"
            sx={{ bgcolor: (th) => alpha(th.palette.primary.main, 0.1) }}
          >
            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              <Typography variant="overline" sx={{ fontSize: '0.6rem' }}>
                {t('admin.totalUsers')}
              </Typography>
              <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 'bold' }}>
                {stats.total_users}
              </Typography>
            </CardContent>
          </GlassCard>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <GlassCard intensity="subtle" sx={{ bgcolor: (th) => alpha(th.palette.error.main, 0.1) }}>
            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              <Typography variant="overline" sx={{ fontSize: '0.6rem' }}>
                {t('admin.openTickets')}
              </Typography>
              <Typography
                variant={isMobile ? 'h5' : 'h4'}
                sx={{ fontWeight: 'bold', color: 'error.main' }}
              >
                {stats.open_tickets}
              </Typography>
            </CardContent>
          </GlassCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <GlassCard intensity="subtle">
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
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {stats.email_config.host}:{stats.email_config.port} • TLS:{' '}
                    {String(stats.email_config.use_tls)} • Insecure:{' '}
                    {String(stats.email_config.skip_verify)}
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
          </GlassCard>
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
        Environment Info (.env)
      </Typography>
      <GlassPaper intensity="subtle" sx={{ p: 3 }}>
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
              DEBUG={String(stats.server_info.debug)}
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
              {stats.server_info.frontend_url}
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
              {stats.server_info.allowed_hosts.join(', ')}
            </Typography>
          </Box>
          <Divider />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <InfoIcon fontSize="small" color="primary" />
            <Typography variant="caption" color="text.secondary">
              These values are read from your server environment or .env file. To change them, you
              must update the file and restart the backend container.
            </Typography>
          </Box>
        </Stack>
      </GlassPaper>
    </Box>
  );
};

export default AdminOverview;
