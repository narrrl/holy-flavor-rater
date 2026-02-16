import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  TextField, 
  Button, 
  Paper, 
  Alert,
  Container,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListSubheader,
  Divider
} from '@mui/material';
import api from '../api';
import { useTitle } from '../hooks/useTitle';
import type { CatppuccinTheme } from '../theme';

interface SettingsProps {
    themeName: CatppuccinTheme;
    onThemeChange: (newTheme: CatppuccinTheme) => void;
}

const Settings: React.FC<SettingsProps> = ({ themeName, onThemeChange }) => {
  useTitle('Account Settings');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
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
        setAvatar(res.data.avatar);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUser();
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
          setMessage({ type: 'error', text: 'File size exceeds 2MB limit' });
          return;
      }

      const formData = new FormData();
      formData.append('avatar', file);

      try {
          const res = await api.post('users/update_avatar/', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
          });
          setAvatar(res.data.avatar);
          setMessage({ type: 'success', text: 'Avatar updated successfully!' });
      } catch (err: any) {
          setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to upload avatar' });
      }
  };

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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4, mt: 4 }}>
          <Avatar src={avatar || undefined} sx={{ width: 80, height: 80, border: '3px solid', borderColor: 'primary.main' }}>
              {!avatar && username.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{username}</Typography>
              <Typography variant="body2" color="text.secondary">Manage your account and preferences</Typography>
          </Box>
      </Box>
      
      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Appearance</Typography>
        <FormControl fullWidth margin="normal">
            <InputLabel>Theme</InputLabel>
            <Select
                value={themeName}
                label="Theme"
                onChange={(e) => onThemeChange(e.target.value as CatppuccinTheme)}
            >
                <ListSubheader>Light Themes</ListSubheader>
                <MenuItem value="latte">Latte</MenuItem>
                <MenuItem value="pink">Pastel Pink</MenuItem>
                <MenuItem value="solarized_light">Solarized Light</MenuItem>
                <MenuItem value="one_light">One Light</MenuItem>
                <MenuItem value="paper">Paper White</MenuItem>
                
                <Divider />
                
                <ListSubheader>Dark Themes</ListSubheader>
                <MenuItem value="mocha">Mocha (Default)</MenuItem>
                <MenuItem value="frappe">Frappé</MenuItem>
                <MenuItem value="macchiato">Macchiato</MenuItem>
                <MenuItem value="atom">Atom One Dark</MenuItem>
                <MenuItem value="dracula">Dracula</MenuItem>
                <MenuItem value="gruvbox">Gruvbox Dark</MenuItem>
                <MenuItem value="nord">Nord</MenuItem>
                <MenuItem value="cyberpunk">Cyberpunk</MenuItem>
                <MenuItem value="forest">Forest Dark</MenuItem>
            </Select>
        </FormControl>
      </Paper>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Profile Picture</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
            <Avatar src={avatar || undefined} sx={{ width: 100, height: 100 }}>
                {!avatar && username.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
                <Button variant="outlined" component="label">
                    Upload New Avatar
                    <input type="file" hidden accept="image/*" onChange={handleAvatarUpload} />
                </Button>
                <Typography variant="caption" display="block" sx={{ mt: 1 }} color="text.secondary">
                    Max size: 2MB. JPG, PNG or WEBP.
                </Typography>
            </Box>
        </Box>
      </Paper>

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
