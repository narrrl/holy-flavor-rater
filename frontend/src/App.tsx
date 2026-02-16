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
  InputAdornment,
  Autocomplete,
  ListSubheader
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

interface SearchFlavor {
    id: number;
    name: string;
    image_url: string | null;
    category_name: string;
}

const GlobalSearch = () => {
    const [query, setQuery] = useState('');
    const [options, setOptions] = useState<SearchFlavor[]>([]);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const fetchFlavors = async () => {
            try {
                const res = await api.get('flavors/');
                setOptions(res.data);
            } catch (err) {
                console.error('Failed to fetch search options');
            }
        };
        fetchFlavors();
    }, []);

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
        <Box sx={{ flexGrow: 1, maxWidth: 400, mx: 2 }}>
            <Autocomplete
                freeSolo
                size="small"
                options={options}
                getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                inputValue={query}
                onInputChange={(_, newValue) => setQuery(typeof newValue === 'string' ? newValue : '')}
                onChange={(_, newValue) => {
                    if (newValue && typeof newValue !== 'string') {
                        navigate(`/flavor/${newValue.id}`);
                    }
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        handleSearch(e as any);
                    }
                }}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        placeholder="Search catalog..."
                        sx={{ 
                            bgcolor: 'action.hover', 
                            borderRadius: 1,
                            '& .MuiOutlinedInput-root': {
                                color: 'inherit',
                                '& fieldset': { border: 'none' },
                            }
                        }}
                        InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: 'inherit', opacity: 0.7 }} />
                                </InputAdornment>
                            ),
                        }}
                    />
                )}
                renderOption={(props, option) => {
                    const { key, ...optionProps } = props as any;
                    return (
                        <Box component="li" key={key} {...optionProps} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {option.image_url && (
                                <Box component="img" src={option.image_url} sx={{ width: 32, height: 32, objectFit: 'contain' }} />
                            )}
                            <Box>
                                <Typography variant="body2">{option.name}</Typography>
                                <Typography variant="caption" color="text.secondary">{option.category_name}</Typography>
                            </Box>
                        </Box>
                    );
                }}
            />
        </Box>
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
                  sx={{ maxHeight: 500 }}
                >
                  <ListSubheader>Light Themes</ListSubheader>
                  <MenuItem onClick={() => handleThemeChange('latte')}>Latte</MenuItem>
                  <MenuItem onClick={() => handleThemeChange('pink')}>Pastel Pink</MenuItem>
                  <MenuItem onClick={() => handleThemeChange('solarized_light')}>Solarized Light</MenuItem>
                  <MenuItem onClick={() => handleThemeChange('one_light')}>One Light</MenuItem>
                  <MenuItem onClick={() => handleThemeChange('paper')}>Paper White</MenuItem>
                  
                  <Divider />
                  
                  <ListSubheader>Dark Themes</ListSubheader>
                  <MenuItem onClick={() => handleThemeChange('mocha')}>Mocha (Default)</MenuItem>
                  <MenuItem onClick={() => handleThemeChange('frappe')}>Frappé</MenuItem>
                  <MenuItem onClick={() => handleThemeChange('macchiato')}>Macchiato</MenuItem>
                  <MenuItem onClick={() => handleThemeChange('atom')}>Atom One Dark</MenuItem>
                  <MenuItem onClick={() => handleThemeChange('dracula')}>Dracula</MenuItem>
                  <MenuItem onClick={() => handleThemeChange('gruvbox')}>Gruvbox Dark</MenuItem>
                  <MenuItem onClick={() => handleThemeChange('nord')}>Nord</MenuItem>
                  <MenuItem onClick={() => handleThemeChange('cyberpunk')}>Cyberpunk</MenuItem>
                  <MenuItem onClick={() => handleThemeChange('forest')}>Forest Dark</MenuItem>
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
