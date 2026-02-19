import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Container, Paper, Typography, Box, CircularProgress, Button, Alert } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { useTitle } from '../hooks/useTitle';

const VerifyEmail: React.FC = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState('');
    
    useTitle(t('auth.verifyTitle'));

    useEffect(() => {
        const query = new URLSearchParams(location.search);
        const username = query.get('username');
        const code = query.get('code');

        if (!username || !code) {
            setStatus('error');
            setErrorMsg('Invalid verification link.');
            return;
        }

        const verify = async () => {
            try {
                await api.post('users/verify_signup/', { username, code });
                setStatus('success');
                // Optional: Auto redirect after 3 seconds
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            } catch (err: any) {
                setStatus('error');
                setErrorMsg(err.response?.data?.error || 'Verification failed.');
            }
        };

        verify();
    }, [location, navigate]);

    return (
        <Container maxWidth="sm" sx={{ py: 12 }}>
            <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4 }}>
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
                        <Button variant="contained" component={Link} to="/login" size="large" sx={{ borderRadius: 2 }}>
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
                        <Button variant="outlined" component={Link} to="/login" size="large" sx={{ borderRadius: 2 }}>
                            Back to Login / Signup
                        </Button>
                    </Box>
                )}
            </Paper>
        </Container>
    );
};

export default VerifyEmail;
