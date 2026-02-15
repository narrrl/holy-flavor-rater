import React, { useState } from 'react';
import { Typography, TextField, Button, Box, Paper, Tab, Tabs } from '@mui/material';
import api from '../api';
import { useTitle } from '../hooks/useTitle';

interface LoginProps {
}

const Login: React.FC<LoginProps> = () => {
  useTitle('Login');
  const [tab, setTab] = useState(0);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('token/', {
        username,
        password,
      });
      localStorage.setItem('token', res.data.token);
      window.location.href = '/';
    } catch (err) {
      alert('Login failed');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          await api.post('users/signup/', { username, email });
          alert('Signup request sent! Check your email (or the backend console) for your temporary password.');
          setTab(0);
      } catch (err: any) {
          alert(err.response?.data?.error || 'Signup failed');
      }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 8 }}>
      <Paper sx={{ p: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Login" />
          <Tab label="Signup" />
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
              Login
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
             <Typography variant="caption" color="text.secondary">
                A password reset link will be sent to your email to set your initial password.
            </Typography>
            <Button fullWidth variant="contained" type="submit" sx={{ mt: 2 }}>
              Signup
            </Button>
          </form>
        )}
      </Paper>
      <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
              Admin? Use <a href="http://localhost:8000/admin/" target="_blank" rel="noreferrer">Django Admin</a>
          </Typography>
      </Box>
    </Box>
  );
};

export default Login;
