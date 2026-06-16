import React, { useState } from 'react';
import { Typography, TextField, Button, Tab, Tabs, Alert, Stack, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useTitle } from '../hooks/useTitle';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { PageShell, GlassCard, FormCard, BackButton } from '../components/ui';

interface ApiError {
  response?: { data?: { error?: string; non_field_errors?: string[] } };
}

const readError = (err: unknown): ApiError => err as ApiError;

const Login: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refetchUser } = useAuth();
  useTitle('Login');
  const [tab, setTab] = useState(0);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      await api.post('auth/token/', { username, password });
      // Pull the new session into AuthContext, then SPA-navigate — keeps the
      // warm react-query cache instead of a full-page reload.
      await refetchUser();
      navigate('/');
    } catch (err) {
      const data = readError(err).response?.data;
      const errorMsg = data?.non_field_errors?.[0] || t('auth.loginFailed');
      if (
        errorMsg.toLowerCase().includes('inactive') ||
        errorMsg.toLowerCase().includes('verify') ||
        errorMsg.includes('disabled')
      ) {
        setMessage({ type: 'error', text: t('auth.unverifiedError') });
        setIsVerifying(true);
      } else {
        setMessage({ type: 'error', text: errorMsg });
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      await api.post('users/signup/', { username, email, password });
      setIsVerifying(true);
      setMessage({ type: 'success', text: t('auth.signupSuccess') });
    } catch (err) {
      setMessage({
        type: 'error',
        text: readError(err).response?.data?.error || t('auth.signupFailed'),
      });
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      await api.post('users/verify_signup/', { username, code: verificationCode });
      setMessage({ type: 'success', text: t('auth.verifySuccess') });
      setIsVerifying(false);
      setTab(0);
      setPassword('');
    } catch (err) {
      setMessage({
        type: 'error',
        text: readError(err).response?.data?.error || t('auth.verifyFailed'),
      });
      setShowResend(true);
    }
  };

  const handleResendCode = async () => {
    setMessage(null);
    try {
      await api.post('users/resend_verification/', { username });
      setMessage({ type: 'success', text: t('auth.resendSuccess') });
      setShowResend(false);
    } catch (err) {
      setMessage({
        type: 'error',
        text: readError(err).response?.data?.error || t('auth.resendFailed'),
      });
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      await api.post('users/request_password_reset/', { email });
      setResetStep(2);
      setMessage({ type: 'success', text: t('auth.resetRequested') });
    } catch {
      setMessage({ type: 'error', text: t('auth.genericError') });
    }
  };

  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      await api.post('users/complete_password_reset/', {
        email,
        code: verificationCode,
        password,
      });
      setMessage({ type: 'success', text: t('auth.resetSuccess') });
      setIsResetting(false);
      setResetStep(1);
      setTab(0);
      setPassword('');
      setVerificationCode('');
    } catch (err) {
      setMessage({
        type: 'error',
        text: readError(err).response?.data?.error || t('auth.resetFailed'),
      });
    }
  };

  const alertBlock = message && <Alert severity={message.type}>{message.text}</Alert>;

  const renderContent = () => {
    if (isVerifying) {
      return (
        <FormCard
          title={t('auth.verifyTitle')}
          onSubmit={handleVerify}
          actions={
            <>
              <Button
                variant={showResend ? 'contained' : 'outlined'}
                color={showResend ? 'secondary' : 'primary'}
                onClick={handleResendCode}
                sx={{ textTransform: 'none' }}
              >
                {t('auth.resendButton')}
              </Button>
              <Button
                onClick={() => {
                  setIsVerifying(false);
                  setMessage(null);
                }}
              >
                {t('auth.backToAuth')}
              </Button>
              <Button variant="contained" type="submit">
                {t('auth.verifyButton')}
              </Button>
            </>
          }
        >
          {/* i18next escapes interpolation values by default; {username} is not raw user HTML */}
          <Typography
            variant="body2"
            dangerouslySetInnerHTML={{ __html: t('auth.verifyDesc', { username }) }}
          />
          <TextField
            fullWidth
            label={t('auth.verificationCodeLabel')}
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            autoFocus
          />
        </FormCard>
      );
    }

    if (isResetting) {
      return (
        <FormCard
          title={t('auth.resetTitle')}
          onSubmit={resetStep === 1 ? handleRequestReset : handleCompleteReset}
          actions={
            <>
              <Button
                onClick={() => {
                  setIsResetting(false);
                  setResetStep(1);
                  setMessage(null);
                }}
              >
                {t('auth.backToLogin')}
              </Button>
              <Button variant="contained" type="submit">
                {resetStep === 1 ? t('auth.sendResetCode') : t('auth.resetButton')}
              </Button>
            </>
          }
        >
          <TextField
            fullWidth
            label={t('auth.emailLabel')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={resetStep === 2}
          />
          {resetStep === 2 && (
            <>
              <TextField
                fullWidth
                label={t('auth.resetCodeLabel')}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
              />
              <TextField
                fullWidth
                label={t('auth.newPasswordLabel')}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </>
          )}
        </FormCard>
      );
    }

    if (tab === 0) {
      return (
        <FormCard
          title={t('auth.loginTitle')}
          onSubmit={handleLogin}
          actions={
            <>
              <Button
                onClick={() => {
                  setIsResetting(true);
                  setMessage(null);
                }}
                sx={{ textTransform: 'none' }}
                size="small"
              >
                {t('auth.forgotPassword')}
              </Button>
              <Button variant="contained" type="submit">
                {t('auth.loginTitle')}
              </Button>
            </>
          }
        >
          <TextField
            fullWidth
            label={t('auth.usernameLabel')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            fullWidth
            label={t('auth.passwordLabel')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormCard>
      );
    }

    return (
      <FormCard
        title={t('auth.signupTitle')}
        onSubmit={handleSignup}
        actions={
          <Button variant="contained" type="submit">
            {t('auth.signupTitle')}
          </Button>
        }
      >
        <TextField
          fullWidth
          label={t('auth.usernameLabel')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <TextField
          fullWidth
          label={t('auth.emailLabel')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          fullWidth
          label={t('auth.passwordLabel')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </FormCard>
    );
  };

  const showTabs = !isVerifying && !isResetting;

  return (
    <PageShell>
      <BackButton to="/" />

      <Box sx={{ maxWidth: 480, width: '100%', mx: 'auto' }}>
        <Stack spacing={2}>
          {showTabs && (
            <GlassCard intensity="subtle" sx={{ p: 1 }}>
              <Tabs
                value={tab}
                onChange={(_, v) => {
                  setTab(v);
                  setMessage(null);
                }}
                variant="fullWidth"
              >
                <Tab label={t('auth.loginTitle')} />
                <Tab label={t('auth.signupTitle')} />
              </Tabs>
            </GlassCard>
          )}
          {alertBlock}
          {renderContent()}
        </Stack>
      </Box>
    </PageShell>
  );
};

export default Login;
