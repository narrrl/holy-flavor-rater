import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  TextField, 
  Button, 
  Paper, 
  Alert,
  Container
} from '@mui/material';
import api from '../api';
import { useTitle } from '../hooks/useTitle';

const Settings: React.FC = () => {
  useTitle('Account Settings');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('users/me/');
        setUsername(res.data.username);
        setEmail(res.data.email);
        setCurrentEmail(res.data.email);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUser();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.patch('users/update_profile/', { username, email });
      if (res.data.message) {
        setPendingConfirmation(true);
        setMessage({ type: 'success', text: `Profile updated.${res.data.message}` });
      } else {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setCurrentEmail(email);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update profile' });
    }
  };

  const handleConfirmEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('users/confirm_email/', { code: confirmationCode });
      setMessage({ type: 'success', text: 'Email confirmed and updated!' });
      setCurrentEmail(res.data.email);
      setPendingConfirmation(false);
      setConfirmationCode('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Confirmation failed' });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('users/change_password/', { old_password: oldPassword, new_password: newPassword });
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setOldPassword('');
      setNewPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to change password' });
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mt: 4 }}>Account Settings</Typography>
      
      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Profile Information</Typography>
        <form onSubmit={handleUpdateProfile}>
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
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            helperText={email !== currentEmail ? "Change will require confirmation" : ""}
          />
          <Button variant="contained" type="submit" sx={{ mt: 2 }}>
            Update Profile
          </Button>
        </form>

        {pendingConfirmation && (
          <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
            <Typography variant="h6" color="primary" gutterBottom>Confirm Email Change</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>Enter the 6-digit code sent to {email}</Typography>
            <form onSubmit={handleConfirmEmail}>
              <TextField
                fullWidth
                label="Confirmation Code"
                margin="normal"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
              />
              <Button variant="contained" type="submit" sx={{ mt: 1 }} color="secondary">
                Verify & Update Email
              </Button>
            </form>
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Change Password</Typography>
        <form onSubmit={handleChangePassword}>
          <TextField
            fullWidth
            label="Old Password"
            type="password"
            margin="normal"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
          <TextField
            fullWidth
            label="New Password"
            type="password"
            margin="normal"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Button variant="contained" type="submit" sx={{ mt: 2 }} color="warning">
            Change Password
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default Settings;
