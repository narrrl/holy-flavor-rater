import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
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
  MenuItem,
  Drawer,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  useMediaQuery,
  TextField,
  InputAdornment
} from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import { getTheme, type CatppuccinTheme } from './theme';
import CategoryList from './pages/CategoryList';
import CategoryFlavors from './pages/categories/CategoryFlavors';
import FlavorDetail from './pages/flavors/FlavorDetail';
import Dashboard from './pages/Dashboard';
import PublicProfile from './pages/PublicProfile';
import Login from './pages/Login';
import Settings from './pages/Settings';
import api from './api';

const GlobalSearch = () => {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        setQuery(params.get('q') || '');
    }, [location.search]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // Redirect to categories page with search query
        if (query.trim()) {
            navigate(`/?q=${encodeURIComponent(query.trim())}`);
        } else {
            navigate('/');
        }
    };

    return (
        <form onSubmit={handleSearch} style={{ flexGrow: 1, maxWidth: 400, marginLeft: 16, marginRight: 16 }}>
            <TextField
                size="small"
                fullWidth
                placeholder="Search catalog..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                sx={{ 
                    bgcolor: 'rgba(255,255,255,0.1)', 
                    borderRadius: 1,
                    '& .MuiOutlinedInput-root': {
                        color: 'white',
                        '& fieldset': { border: 'none' },
                    }
                }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon sx={{ color: 'white', opacity: 0.7 }} />
                        </InputAdornment>
                    ),
                }}
            />
        </form>
    );
};

const App: React.FC = () => {
  const [themeName, setThemeName] = useState<CatppuccinTheme>((localStorage.getItem('theme') as CatppuccinTheme) || 'mocha');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [user, setUser] = useState<{username: string} | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width:900px)');

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
      } finally {
        setLoadingUser(false);
      }
    };
    if (localStorage.getItem('token')) {
        fetchUser();
    } else {
        setLoadingUser(false);
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

  const navItems = user ? [
    { label: 'Catalog', path: '/' },
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Settings', path: '/settings' },
  ] : [
    { label: 'Catalog', path: '/' },
    { label: 'Login', path: '/login' },
  ];

  const drawer = (
    <Box onClick={() => setDrawerOpen(false)} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2 }}>Holy Flavors</Typography>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.label} disablePadding>
            <ListItemButton component={Link} to={item.path} sx={{ textAlign: 'center' }}>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
        {user && (
          <ListItem disablePadding>
            <ListItemButton onClick={handleLogout} sx={{ textAlign: 'center' }}>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </ListItem>
        )}
      </List>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppBar position="fixed" elevation={1}>
          <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 2, sm: 4, md: 6 } }}>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={() => setDrawerOpen(true)}
                sx={{ mr: 2, display: { md: 'none' } }}
              >
                <MenuIcon />
              </IconButton>
              
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', display: { xs: 'none', sm: 'block' } }}>
                <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>Holy Flavors</Link>
              </Typography>
              
              <GlobalSearch />

              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {!isMobile && !loadingUser && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {navItems.map((item) => (
                      <Button key={item.label} color="inherit" component={Link} to={item.path}>{item.label}</Button>
                    ))}
                    {user && (
                      <Button color="inherit" onClick={handleLogout} sx={{ ml: 1 }}>Logout</Button>
                    )}
                  </Box>
                )}
                
                <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ ml: 1 }}>
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
                  <MenuItem onClick={() => handleThemeChange('pink')}>Pastel Pink</MenuItem>
                </Menu>
              </Box>
          </Toolbar>
        </AppBar>
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }} />

        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
          }}
        >
          {drawer}
        </Drawer>

        <Container maxWidth={false} sx={{ mt: 4, pb: 4, px: { xs: 2, sm: 4, md: 6 } }}>
          <Routes>
            <Route path="/" element={<CategoryList />} />
            <Route path="/category/:slug" element={<CategoryFlavors />} />
            <Route path="/flavor/:id" element={<FlavorDetail />} />
            <Route path="/profile/:username" element={<PublicProfile />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </Container>
      </Router>
    </ThemeProvider>
  );
};

export default App;
