import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ThemeProvider, 
  CssBaseline, 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Drawer,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  InputAdornment,
  Autocomplete
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
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
        if (query.trim()) {
            navigate(`/?q=${encodeURIComponent(query.trim())}`);
        } else {
            navigate('/');
        }
    };

    return (
        <Box sx={{ flexGrow: 1, maxWidth: { xs: 'none', sm: 400 }, mx: { xs: 1, sm: 4 } }}>
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
                        placeholder="Search flavors..."
                        sx={{ 
                            bgcolor: 'action.hover', 
                            borderRadius: 2,
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
  const [user, setUser] = useState<{username: string, avatar: string | null} | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const drawer = (
    <Box onClick={() => setDrawerOpen(false)} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2 }}>Holy Flavors</Typography>
      <Divider />
      <List>
        <ListItem disablePadding>
            <ListItemButton component={Link} to="/" sx={{ textAlign: 'center' }}>
                <ListItemText primary="Catalog" />
            </ListItemButton>
        </ListItem>
        {user && (
            <>
                <ListItem disablePadding>
                    <ListItemButton component={Link} to="/dashboard" sx={{ textAlign: 'center' }}>
                        <ListItemText primary="Dashboard" />
                    </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                    <ListItemButton component={Link} to="/settings" sx={{ textAlign: 'center' }}>
                        <ListItemText primary="Settings" />
                    </ListItemButton>
                </ListItem>
                <Divider />
                <ListItem disablePadding>
                    <ListItemButton onClick={handleLogout} sx={{ textAlign: 'center' }}>
                        <ListItemText primary="Logout" />
                    </ListItemButton>
                </ListItem>
            </>
        )}
        {!user && !loadingUser && (
            <ListItem disablePadding>
                <ListItemButton component={Link} to="/login" sx={{ textAlign: 'center' }}>
                    <ListItemText primary="Login" />
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
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
          <AppBar position="fixed" elevation={0} sx={{ 
              borderBottom: '1px solid', 
              borderColor: 'divider',
              bgcolor: 'background.paper',
              color: 'text.primary'
          }}>
            <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 1, sm: 4, md: 6 } }}>
                <IconButton
                  color="inherit"
                  edge="start"
                  onClick={() => setDrawerOpen(true)}
                  sx={{ mr: { xs: 0, sm: 2 }, display: { md: 'none' } }}
                >
                  <MenuIcon />
                </IconButton>
                
                <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', display: { xs: 'none', sm: 'block' } }}>
                  <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>Holy Flavors</Link>
                </Typography>
                
                <GlobalSearch />

                <Box sx={{ flexGrow: 1 }} />

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {!loadingUser && (
                    user ? (
                      <>
                        <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
                          <Avatar src={user.avatar || undefined} sx={{ width: 36, height: 36, border: '2px solid', borderColor: 'primary.main' }}>
                              {!user.avatar && user.username.charAt(0).toUpperCase()}
                          </Avatar>
                        </IconButton>
                        <Menu
                          anchorEl={anchorEl}
                          open={Boolean(anchorEl)}
                          onClose={() => setAnchorEl(null)}
                          elevation={3}
                          sx={{ mt: 1 }}
                        >
                          <MenuItem component={Link} to="/dashboard" onClick={() => setAnchorEl(null)}>Dashboard</MenuItem>
                          <MenuItem component={Link} to="/settings" onClick={() => setAnchorEl(null)}>Settings</MenuItem>
                          <Divider />
                          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>Logout</MenuItem>
                        </Menu>
                      </>
                    ) : (
                      <Button variant="contained" component={Link} to="/login" sx={{ borderRadius: 2 }}>Login</Button>
                    )
                  )}
                </Box>
            </Toolbar>
          </AppBar>
          <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }} />

          <Box sx={{ flexGrow: 1, width: '100%' }}>
            <Routes>
              <Route path="/" element={<CategoryList />} />
              <Route path="/category/:slug" element={<CategoryFlavors />} />
              <Route path="/flavor/:id" element={<FlavorDetail />} />
              <Route path="/profile/:username" element={<PublicProfile />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/settings" element={<Settings themeName={themeName} onThemeChange={handleThemeChange} />} />
              <Route path="/login" element={<Login />} />
            </Routes>
          </Box>

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
        </Box>
      </Router>
    </ThemeProvider>
  );
};

export default App;
