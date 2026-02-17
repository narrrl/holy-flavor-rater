import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
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
  Collapse,
  TextField,
  InputAdornment,
  Autocomplete,
  CircularProgress,
  ListItemAvatar,
  ListSubheader,
  alpha
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { getTheme, type CatppuccinTheme } from './theme';
import api from './api';
import './i18n';
import { useTranslation } from 'react-i18next';
import Footer from './components/Footer';

// Code splitting
const MainPage = lazy(() => import('./pages/MainPage'));
const CategoryFlavors = lazy(() => import('./pages/categories/CategoryFlavors'));
const FlavorDetail = lazy(() => import('./pages/flavors/FlavorDetail'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const CommunityFeed = lazy(() => import('./pages/CommunityFeed'));
const About = lazy(() => import('./pages/About'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Login = lazy(() => import('./pages/Login'));
const Settings = lazy(() => import('./pages/Settings'));

interface SearchResult {
    id: number;
    name: string;
    type: 'flavor' | 'category' | 'user';
    subtitle: string;
    image_url: string | null;
    slug: string | null;
}

const GlobalSearch = () => {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [options, setOptions] = useState<SearchResult[]>([]);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const fetchSearchOptions = async () => {
            try {
                // Fetch unified results: flavors, categories, and users
                const res = await api.get('flavors/search/');
                // Filter to only flavors
                const results = (Array.isArray(res.data) ? res.data : (res.data.results || []))
                    .filter((item: any) => item.type === 'flavor');
                setOptions(results);
            } catch (err) {
                console.error('Failed to fetch search options');
            }
        };
        fetchSearchOptions();
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
        <Box sx={{ flexGrow: 1, mx: { xs: 1, sm: 2, md: 4 } }}>
            <Autocomplete
                fullWidth
                freeSolo
                size="small"
                options={options}
                getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    return option.name || '';
                }}
                inputValue={query}
                onInputChange={(_, newValue) => setQuery(typeof newValue === 'string' ? newValue : '')}
                onChange={(_, newValue) => {
                    if (newValue && typeof newValue !== 'string') {
                        if (newValue.type === 'flavor') navigate(`/flavor/${newValue.id}`);
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
                        fullWidth
                        placeholder={t('common.search')}
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
                            {option.image_url ? (
                                <Avatar src={option.image_url} sx={{ width: 32, height: 32, borderRadius: 1 }} />
                            ) : (
                                <Avatar sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: 'primary.main', fontSize: '0.8rem' }}>
                                    {option.name.charAt(0).toUpperCase()}
                                </Avatar>
                            )}
                            <Box>
                                <Typography variant="body2">{option.name}</Typography>
                                <Typography variant="caption" color="text.secondary">{option.subtitle}</Typography>
                            </Box>
                        </Box>
                    );
                }}
            />
        </Box>
    );
};

const App: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [themeName, setThemeName] = useState<CatppuccinTheme>((localStorage.getItem('theme') as CatppuccinTheme) || 'holy_light');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [catAnchorEl, setCatAnchorEl] = useState<null | HTMLElement>(null);
  const [categories, setCategories] = useState<{name: string, slug: string}[]>([]);
  const [user, setUser] = useState<{username: string, avatar: string | null} | null>(null);
  const [following, setFollowing] = useState<{id: number, username: string, avatar: string | null}[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const [userRes, catRes] = await Promise.all([
            token ? api.get('users/me/') : Promise.resolve({ data: null }),
            api.get('categories/')
        ]);
        
        if (userRes.data && userRes.data.username) {
            setUser(userRes.data);
            if (userRes.data.theme) setThemeName(userRes.data.theme);
            if (userRes.data.language) i18n.changeLanguage(userRes.data.language);
            
            // Also fetch following list for the mobile sidebar
            try {
                const followRes = await api.get('users/following_list/');
                setFollowing(followRes.data);
            } catch (err) {
                console.error('Failed to fetch following list');
            }
        } else {
            setUser(null);
        }
        
        const catData = Array.isArray(catRes.data) ? catRes.data : (catRes.data.results || []);
        setCategories(catData);
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
            await api.patch('users/update_preferences/', { theme: newTheme });
        } catch (err) {
            console.error('Failed to update theme on server');
        }
    }
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setFollowing([]);
    i18n.changeLanguage(navigator.language.split('-')[0] || 'en');
    window.location.href = '/';
  };

  const drawer = (
    <Box sx={{ width: 280 }} role="presentation">
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar src={user?.avatar || undefined} sx={{ width: 40, height: 40, border: '2px solid', borderColor: 'primary.main' }}>
              {user?.username ? user.username.charAt(0).toUpperCase() : '?'}
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              <Link to="/" onClick={() => setDrawerOpen(false)} style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Box component="img" src="/favicon.svg" sx={{ width: 24, height: 24 }} />
                  Holy Flavors Archive
              </Link>
          </Typography>
      </Box>
      <Divider />
      <List>
        <ListItem disablePadding>
            <ListItemButton component={Link} to="/" onClick={() => setDrawerOpen(false)}>
                <ListItemText primary={t('nav.home')} />
            </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
            <ListItemButton component={Link} to="/community" onClick={() => setDrawerOpen(false)}>
                <ListItemText primary={t('nav.community')} />
            </ListItemButton>
        </ListItem>

        <ListItemButton onClick={() => setCatOpen(!catOpen)}>
            <ListItemText primary={t('nav.categories')} />
            {catOpen ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <Collapse in={catOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
                {categories.map(cat => (
                    <ListItemButton 
                        key={cat.slug} 
                        component={Link} 
                        to={`/category/${cat.slug}`} 
                        onClick={() => setDrawerOpen(false)}
                        sx={{ pl: 4 }}
                    >
                        <ListItemText primary={t(`categories.${cat.slug}`, { defaultValue: cat.name })} />
                    </ListItemButton>
                ))}
            </List>
        </Collapse>

        <Divider sx={{ my: 1 }} />
        
        {user ? (
            <>
                <ListItem disablePadding>
                    <ListItemButton component={Link} to="/dashboard" onClick={() => setDrawerOpen(false)}>
                        <ListItemText primary={t('nav.dashboard')} />
                    </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                    <ListItemButton component={Link} to="/settings" onClick={() => setDrawerOpen(false)}>
                        <ListItemText primary={t('nav.settings')} />
                    </ListItemButton>
                </ListItem>

                {following.length > 0 && (
                    <>
                        <Divider sx={{ my: 1 }} />
                        <ListSubheader sx={{ bgcolor: 'transparent', fontWeight: 'bold', lineHeight: '32px' }}>{t('nav.following')}</ListSubheader>
                        {following.map(f => (
                            <ListItem key={f.id} disablePadding>
                                <ListItemButton component={Link} to={`/profile/${f.username}`} onClick={() => setDrawerOpen(false)}>
                                    <ListItemAvatar>
                                        <Avatar src={f.avatar || undefined} sx={{ width: 32, height: 32 }}>
                                            {!f.avatar && f.username.charAt(0).toUpperCase()}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText primary={f.username} primaryTypographyProps={{ variant: 'body2' }} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </>
                )}

                <ListItem disablePadding>
                    <ListItemButton onClick={handleLogout}>
                        <ListItemText primary={t('nav.logout')} sx={{ color: 'error.main' }} />
                    </ListItemButton>
                </ListItem>
            </>
        ) : (
            <ListItem disablePadding>
                <ListItemButton component={Link} to="/login" onClick={() => setDrawerOpen(false)}>
                    <ListItemText primary={t('nav.login')} />
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
          <AppBar 
            position="sticky" 
            elevation={0} 
            sx={{ 
              borderBottom: '1px solid', 
              borderColor: 'divider',
              bgcolor: (theme) => alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(12px)',
              color: 'text.primary',
              zIndex: (theme) => theme.zIndex.drawer + 1
            }}
          >
            <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 1, sm: 4, md: 6 } }}>
                <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                  <Link to="/" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Box component="img" src="/favicon.svg" sx={{ width: { xs: 32, sm: 24 }, height: { xs: 32, sm: 24 } }} />
                      <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Holy Flavors Archive</Box>
                  </Link>
                </Typography>

                <Box sx={{ display: { xs: 'none', md: 'flex' }, ml: 4 }}>
                    <Button 
                        color="inherit" 
                        component={Link}
                        to="/community"
                        sx={{ fontWeight: 'bold', textTransform: 'none', fontSize: '1rem', mr: 2 }}
                    >
                        {t('nav.community')}
                    </Button>
                    <Button 
                        color="inherit" 
                        endIcon={<ArrowDropDownIcon />}
                        onClick={(e) => setCatAnchorEl(e.currentTarget)}
                        sx={{ fontWeight: 'bold', textTransform: 'none', fontSize: '1rem' }}
                    >
                        {t('nav.categories')}
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
                                {t(`categories.${cat.slug}`, { defaultValue: cat.name })}
                            </MenuItem>
                        ))}
                    </Menu>
                </Box>
                
                <GlobalSearch />

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {!loadingUser && (
                    user ? (
                      <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
                        <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ ml: 1 }}>
                          <Avatar src={user.avatar || undefined} sx={{ width: 36, height: 36, border: '2px solid', borderColor: 'primary.main' }}>
                              {user.username ? user.username.charAt(0).toUpperCase() : '?'}
                          </Avatar>
                        </IconButton>
                        <Menu
                          anchorEl={anchorEl}
                          open={Boolean(anchorEl)}
                          onClose={() => setAnchorEl(null)}
                          elevation={3}
                          sx={{ mt: 1 }}
                        >
                          <MenuItem component={Link} to="/dashboard" onClick={() => setAnchorEl(null)}>{t('nav.dashboard')}</MenuItem>
                          <MenuItem component={Link} to="/settings" onClick={() => setAnchorEl(null)}>{t('nav.settings')}</MenuItem>
                          <Divider />
                          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>{t('nav.logout')}</MenuItem>
                        </Menu>
                      </Box>
                    ) : (
                      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                        <Button variant="contained" component={Link} to="/login" sx={{ borderRadius: 2 }}>Login</Button>
                      </Box>
                    )
                  )}

                  <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
                      <IconButton
                          color="inherit"
                          aria-label="open drawer"
                          onClick={() => setDrawerOpen(true)}
                          sx={{ ml: 1 }}
                      >
                          <MenuIcon />
                      </IconButton>
                  </Box>
                </Box>
            </Toolbar>
          </AppBar>
          <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }} />

          <Drawer
            anchor="right"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
          >
            {drawer}
          </Drawer>

          <Box sx={{ flexGrow: 1, width: '100%' }}>
            <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>}>
                <Routes>
                    <Route path="/" element={<MainPage />} />
                    <Route path="/category/:slug" element={<CategoryFlavors />} />
                    <Route path="/flavor/:id" element={<FlavorDetail />} />
                    <Route path="/profile/:username" element={<PublicProfile />} />
                    <Route path="/community" element={<CommunityFeed />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/settings" element={<Settings themeName={themeName} onThemeChange={handleThemeChange} />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="*" element={<Box sx={{ p: 4, textAlign: 'center' }}><Typography variant="h5">404 - Page Not Found</Typography><Button component={Link} to="/" sx={{ mt: 2 }}>Back to Home</Button></Box>} />
                </Routes>
            </Suspense>
          </Box>
          <Footer />
        </Box>
      </Router>
    </ThemeProvider>
  );
};

export default App;
