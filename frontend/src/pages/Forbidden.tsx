import { Link } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useTranslation } from 'react-i18next';
import { PageShell } from '../components/ui';

const Forbidden = () => {
  const { t } = useTranslation();
  return (
    <PageShell>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          py: { xs: 6, md: 10 },
          gap: 2,
        }}
      >
        <LockOutlinedIcon sx={{ fontSize: 72, color: 'text.secondary' }} />
        <Typography variant="h3" sx={{ fontWeight: 700 }}>
          {t('forbidden.title', { defaultValue: '403 — Forbidden' })}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 480 }}>
          {t('forbidden.message', {
            defaultValue: 'You do not have permission to view this page.',
          })}
        </Typography>
        <Button variant="contained" component={Link} to="/" sx={{ mt: 1 }}>
          {t('forbidden.back', { defaultValue: 'Back to home' })}
        </Button>
      </Box>
    </PageShell>
  );
};

export default Forbidden;
