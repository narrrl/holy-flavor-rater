import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { 
  ThemeProvider, 
  CssBaseline, 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Container, 
  Box,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';
import { getTheme, type CatppuccinTheme } from './theme';
import FlavorList from './pages/FlavorList';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import api from './api';

const App: React.FC = () => {
  const [themeName, setThemeName] = useState<CatppuccinTheme>((localStorage.getItem('theme') as CatppuccinTheme) || 'mocha');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [user, setUser] = useState<{username: string} | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get('users/me/');
        setUser(response.data);
        if (response.data.theme) {
            setThemeName(response.data.theme);
        }
      } catch (err) {
        setUser(null);
      }
    };
    if (localStorage.getItem('token')) {
        fetchUser();
    }
  }, []);

  const theme = useMemo(() => getTheme(themeName), [themeName]);

  const handleThemeChange = async (newTheme: CatppuccinTheme) => {
    setThemeName(newTheme);
    localStorage.setItem('theme', newTheme);
    if (user) {
        try {
            await api.patch('users/update_theme/', { theme: newTheme });
        } catch (err) {
            console.error('Failed to update theme on server');
        }
    }
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    window.location.href = '/';
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>Holy Flavors</Link>
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Button color="inherit" component={Link} to="/">Flavors</Button>
              {user ? (
                <>
                  <Button color="inherit" component={Link} to="/dashboard">Dashboard</Button>
                  <Button color="inherit" onClick={handleLogout}>Logout ({user.username})</Button>
                </>
              ) : (
                <Button color="inherit" component={Link} to="/login">Login</Button>
              )}
              
              <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
                <PaletteIcon />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
              >
                <MenuItem onClick={() => handleThemeChange('latte')}>Latte</MenuItem>
                <MenuItem onClick={() => handleThemeChange('frappe')}>Frappé</MenuItem>
                <MenuItem onClick={() => handleThemeChange('macchiato')}>Macchiato</MenuItem>
                <MenuItem onClick={() => handleThemeChange('mocha')}>Mocha</MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>

        <Container sx={{ mt: 4 }}>
          <Routes>
            <Route path="/" element={<FlavorList />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </Container>
      </Router>
    </ThemeProvider>
  );
};

export default App;
