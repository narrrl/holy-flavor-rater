import React, { useState } from 'react';
import { Typography, TextField, Button, Paper, Tab, Tabs, Alert, Container } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link } from 'react-router-dom';
import api from '../api';
import { useTitle } from '../hooks/useTitle';
import { useTranslation } from 'react-i18next';

interface LoginProps {
}

const Login: React.FC<LoginProps> = () => {
  const { t } = useTranslation();
  useTitle('Login');
  const [tab, setTab] = useState(0);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: email, 2: code/new pass
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await api.post('token/', {
        username,
        password,
      });
      localStorage.setItem('token', res.data.token);
      window.location.href = '/';
    } catch (err: any) {
      const errorMsg = err.response?.data?.non_field_errors?.[0] || t('auth.loginFailed');
      if (errorMsg.toLowerCase().includes('inactive') || errorMsg.toLowerCase().includes('verify') || errorMsg.includes('disabled')) {
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
      } catch (err: any) {
          setMessage({ type: 'error', text: err.response?.data?.error || 'Signup failed' });
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
      } catch (err: any) {
          setMessage({ type: 'error', text: err.response?.data?.error || 'Verification failed' });
          setShowResend(true);
      }
  };

  const handleResendCode = async () => {
      setMessage(null);
      try {
          await api.post('users/resend_verification/', { username });
          setMessage({ type: 'success', text: t('auth.resendSuccess') });
          setShowResend(false);
      } catch (err: any) {
          setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to resend code' });
      }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
      e.preventDefault();
      setMessage(null);
      try {
          await api.post('users/request_password_reset/', { email });
          setResetStep(2);
          setMessage({ type: 'success', text: 'If an account exists, a reset code has been sent.' });
      } catch (err: any) {
          setMessage({ type: 'error', text: 'An error occurred. Please try again later.' });
      }
  };

  const handleCompleteReset = async (e: React.FormEvent) => {
      e.preventDefault();
      setMessage(null);
      try {
          await api.post('users/complete_password_reset/', { email, code: verificationCode, password });
          setMessage({ type: 'success', text: 'Password reset successful! You can now login.' });
          setIsResetting(false);
          setResetStep(1);
          setTab(0);
          setPassword('');
          setVerificationCode('');
      } catch (err: any) {
          setMessage({ type: 'error', text: err.response?.data?.error || 'Reset failed' });
      }
  };

  const renderContent = () => {
      if (isVerifying) {
          return (
            <form onSubmit={handleVerify}>
                <Typography variant="h6" gutterBottom>{t('auth.verifyTitle')}</Typography>
                <Typography variant="body2" sx={{ mb: 2 }} dangerouslySetInnerHTML={{ __html: t('auth.verifyDesc', { username }) }} />
                <TextField
                    fullWidth
                    label="Verification Code"
                    margin="normal"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    autoFocus
                />
                <Button fullWidth variant="contained" type="submit" sx={{ mt: 2 }}>
                    Verify
                </Button>
                
                <Button 
                    fullWidth 
                    variant={showResend ? "contained" : "outlined"} 
                    color={showResend ? "secondary" : "primary"}
                    onClick={handleResendCode} 
                    sx={{ mt: 2, textTransform: 'none' }}
                >
                    {t('auth.resendButton')}
                </Button>

                <Button fullWidth onClick={() => { setIsVerifying(false); setMessage(null); }} sx={{ mt: 1 }}>
                    {t('auth.backToAuth')}
                </Button>
            </form>
          );
      }

      if (isResetting) {
          return (
              <form onSubmit={resetStep === 1 ? handleRequestReset : handleCompleteReset}>
                  <Typography variant="h6" gutterBottom>Reset Password</Typography>
                  <TextField
                      fullWidth
                      label="Email"
                      margin="normal"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={resetStep === 2}
                  />
                  {resetStep === 2 && (
                      <>
                        <TextField
                            fullWidth
                            label="Reset Code"
                            margin="normal"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                        />
                        <TextField
                            fullWidth
                            label="New Password"
                            type="password"
                            margin="normal"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                      </>
                  )}
                  <Button fullWidth variant="contained" type="submit" sx={{ mt: 2 }}>
                      {resetStep === 1 ? 'Send Reset Code' : 'Reset Password'}
                  </Button>
                  <Button fullWidth onClick={() => { setIsResetting(false); setResetStep(1); setMessage(null); }} sx={{ mt: 1 }}>
                      Back to Login
                  </Button>
              </form>
          );
      }

      return (
        <>
            <Tabs value={tab} onChange={(_, v) => { setTab(v); setMessage(null); }} sx={{ mb: 2 }}>
                <Tab label={t('auth.loginTitle')} />
                <Tab label={t('auth.signupTitle')} />
            </Tabs>
            
            {tab === 0 ? (
            <form onSubmit={handleLogin}>
                <TextField
                fullWidth
                label="Username"
                margin="normal"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                />
                <TextField
                fullWidth
                label="Password"
                type="password"
                margin="normal"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                />
                <Button fullWidth variant="contained" type="submit" sx={{ mt: 2 }}>
                    {t('auth.loginTitle')}
                </Button>
                <Button fullWidth onClick={() => { setIsResetting(true); setMessage(null); }} sx={{ mt: 1, textTransform: 'none' }} size="small">
                    {t('auth.forgotPassword')}
                </Button>
            </form>
            ) : (
            <form onSubmit={handleSignup}>
                <TextField
                fullWidth
                label="Username"
                margin="normal"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                />
                <TextField
                fullWidth
                label="Email"
                type="email"
                margin="normal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                />
                <TextField
                fullWidth
                label="Password"
                type="password"
                margin="normal"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                />
                <Button fullWidth variant="contained" type="submit" sx={{ mt: 2 }}>
                    {t('auth.signupTitle')}
                </Button>
            </form>
            )}
        </>
      );
  };

  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
      <Button 
        variant="outlined" 
        component={Link} 
        to="/" 
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 4, textTransform: 'none', borderRadius: 2 }}
      >
        Back to Home
      </Button>

      <Paper sx={{ 
          p: 3,
          '& .MuiInputLabel-root': { bgcolor: 'background.paper', px: 0.5 }
      }}>
        {message && <Alert severity={message.type} sx={{ mb: 2 }}>{message.text}</Alert>}
        {renderContent()}
      </Paper>
    </Container>
  );
};

export default Login;
