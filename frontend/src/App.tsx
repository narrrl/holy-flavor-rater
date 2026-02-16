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
  Divider,
  TextField,
  InputAdornment,
  Autocomplete
} from '@mui/material';
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
        <Box sx={{ flexGrow: 1, maxWidth: { xs: 'none', sm: 400 }, mx: { xs: 1, sm: 2 } }}>
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
                        placeholder="Search..."
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
  const [catAnchorEl, setCatAnchorEl] = useState<null | HTMLElement>(null);
  const [categories, setCategories] = useState<{name: string, slug: string}[]>([]);
  const [user, setUser] = useState<{username: string, avatar: string | null} | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, catRes] = await Promise.all([
            localStorage.getItem('token') ? api.get('users/me/') : Promise.resolve({ data: null }),
            api.get('categories/')
        ]);
        
        if (userRes.data) {
            setUser(userRes.data);
            if (userRes.data.theme) setThemeName(userRes.data.theme);
        }
        setCategories(catRes.data);
      } catch (err) {
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    };
    fetchData();
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
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
          <AppBar position="fixed" elevation={0} sx={{ 
              borderBottom: '1px solid', 
              borderColor: 'divider',
              bgcolor: 'background.paper',
              color: 'text.primary',
              zIndex: (theme) => theme.zIndex.drawer + 1
          }}>
            <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 1, sm: 4, md: 6 } }}>
                {/* Brand Logo - Responsive */}
                <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', mr: { xs: 1, sm: 2 } }}>
                  <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
                      <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Holy Flavors</Box>
                      <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Holy</Box>
                  </Link>
                </Typography>

                {/* Categories Dropdown - Works on both mobile and desktop */}
                <Box sx={{ ml: { xs: 0, sm: 1 } }}>
                    <Button 
                        color="inherit" 
                        endIcon={<ArrowDropDownIcon />}
                        onClick={(e) => setCatAnchorEl(e.currentTarget)}
                        sx={{ 
                            fontWeight: 'bold', 
                            textTransform: 'none', 
                            fontSize: { xs: '0.85rem', sm: '1rem' },
                            minWidth: 'auto',
                            px: 1
                        }}
                    >
                        <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>Categories</Box>
                        <Box component="span" sx={{ display: { xs: 'inline', md: 'none' } }}>Cats</Box>
                    </Button>
                    <Menu
                        anchorEl={catAnchorEl}
                        open={Boolean(catAnchorEl)}
                        onClose={() => setCatAnchorEl(null)}
                        elevation={3}
                        sx={{ mt: 1 }}
                    >
                        {categories.map(cat => (
                            <MenuItem 
                                key={cat.slug} 
                                component={Link} 
                                to={`/category/${cat.slug}`}
                                onClick={() => setCatAnchorEl(null)}
                            >
                                {cat.name}
                            </MenuItem>
                        ))}
                    </Menu>
                </Box>
                
                {/* Global Search */}
                <GlobalSearch />

                <Box sx={{ flexGrow: 1 }} />

                {/* User Menu - Aligned Right */}
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {!loadingUser && (
                    user ? (
                      <>
                        <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ ml: { xs: 0, sm: 1 } }}>
                          <Avatar 
                            src={user.avatar || undefined} 
                            sx={{ 
                                width: { xs: 32, sm: 36 }, 
                                height: { xs: 32, sm: 36 }, 
                                border: '2px solid', 
                                borderColor: 'primary.main' 
                            }}
                          >
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
                          <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary', fontWeight: 'bold' }}>
                              Logged in as {user.username}
                          </Typography>
                          <Divider />
                          <MenuItem component={Link} to="/dashboard" onClick={() => setAnchorEl(null)}>Dashboard</MenuItem>
                          <MenuItem component={Link} to="/settings" onClick={() => setAnchorEl(null)}>Settings</MenuItem>
                          <Divider />
                          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>Logout</MenuItem>
                        </Menu>
                      </>
                    ) : (
                      <Button variant="contained" component={Link} to="/login" sx={{ borderRadius: 2, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                          Login
                      </Button>
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
        </Box>
      </Router>
    </ThemeProvider>
  );
};

export default App;
