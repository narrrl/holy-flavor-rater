import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Typography, Box, CircularProgress, Button, Alert } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { useTitle } from '../hooks/useTitle';
import { PageShell, HeroBackdrop, GlassCard } from '../components/ui';

type VerifyStatus = 'loading' | 'success' | 'error';

const VerifyEmail: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  useTitle(t('auth.verifyTitle'));

  const { username, code } = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return { username: query.get('username'), code: query.get('code') };
  }, [location.search]);

  const linkValid = Boolean(username && code);
  const [status, setStatus] = useState<VerifyStatus>(linkValid ? 'loading' : 'error');
  const [errorMsg, setErrorMsg] = useState(linkValid ? '' : 'Invalid verification link.');

  useEffect(() => {
    if (!linkValid) return;
    let cancelled = false;
    let redirectTimer: number | undefined;
    (async () => {
      try {
        await api.post('users/verify_signup/', { username, code });
        if (cancelled) return;
        setStatus('success');
        redirectTimer = window.setTimeout(() => navigate('/login'), 3000);
      } catch (err) {
        if (cancelled) return;
        const response = (err as { response?: { data?: { error?: string } } }).response;
        setStatus('error');
        setErrorMsg(response?.data?.error || 'Verification failed.');
      }
    })();
    return () => {
      cancelled = true;
      if (redirectTimer) window.clearTimeout(redirectTimer);
    };
  }, [linkValid, username, code, navigate]);

  return (
    <PageShell hero={<HeroBackdrop variant="minimal" />}>
      <GlassCard
        intensity="subtle"
        sx={{ p: 6, textAlign: 'center', maxWidth: 520, width: '100%', mx: 'auto' }}
      >
        {status === 'loading' && (
          <Box>
            <CircularProgress size={60} sx={{ mb: 4 }} />
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              Verifying your account...
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Please wait while we confirm your email.
            </Typography>
          </Box>
        )}

        {status === 'success' && (
          <Box>
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: 80, mb: 2 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2 }}>
              {t('auth.verifySuccess')}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 4 }}>
              You will be redirected to the login page shortly.
            </Typography>
            <Button
              variant="contained"
              component={Link}
              to="/login"
              size="large"
              sx={{ borderRadius: 2 }}
            >
              Go to Login Now
            </Button>
          </Box>
        )}

        {status === 'error' && (
          <Box>
            <ErrorOutlineIcon color="error" sx={{ fontSize: 80, mb: 2 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2 }}>
              Verification Failed
            </Typography>
            <Alert severity="error" sx={{ mb: 4, textAlign: 'left' }}>
              {errorMsg}
            </Alert>
            <Typography color="text.secondary" sx={{ mb: 4 }}>
              The link might be expired or already used.
            </Typography>
            <Button
              variant="outlined"
              component={Link}
              to="/login"
              size="large"
              sx={{ borderRadius: 2 }}
            >
              Back to Login / Signup
            </Button>
          </Box>
        )}
      </GlassCard>
    </PageShell>
  );
};

export default VerifyEmail;
