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
  Badge,
  alpha
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsIcon from '@mui/icons-material/Notifications';
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

interface Notification {
    id: number;
    actor_username: string;
    actor_avatar: string | null;
    notification_type: 'reply' | 'mention';
    rating: number | null;
    reply: number | null;
    is_read: boolean;
    created_at: string;
    flavor_name: string | null;
    flavor_id: number | null;
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
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
  const [catAnchorEl, setCatAnchorEl] = useState<null | HTMLElement>(null);
  const [categories, setCategories] = useState<{name: string, slug: string}[]>([]);
  const [user, setUser] = useState<{username: string, avatar: string | null, unread_notifications_count: number} | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [following, setFollowing] = useState<{id: number, username: string, avatar: string | null}[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
        const res = await api.get('notifications/');
        setNotifications(res.data);
    } catch (err) {
        console.error('Failed to fetch notifications');
    }
  };

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
                fetchNotifications();
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

    // Poll for notifications every 60 seconds
    const interval = setInterval(() => {
        if (localStorage.getItem('token')) {
            fetchNotifications();
            // Also refresh user data for the count
            api.get('users/me/').then(res => setUser(res.data)).catch(() => {});
        }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const theme = useMemo(() => getTheme(themeName), [themeName]);

  const handleMarkAllRead = async () => {
    try {
        await api.post('notifications/mark_all_read/');
        setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        if (user) setUser({ ...user, unread_notifications_count: 0 });
    } catch (err) {
        console.error('Failed to mark all as read');
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
        try {
            await api.post(`notifications/${notif.id}/mark_read/`);
            setNotifications(notifications.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
            if (user) setUser({ ...user, unread_notifications_count: Math.max(0, user.unread_notifications_count - 1) });
        } catch (err) { /* ignore */ }
    }
    setNotifAnchorEl(null);
    if (notif.flavor_id) {
        window.location.href = `/flavor/${notif.flavor_id}`;
    }
  };

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
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              <Link to="/" onClick={() => setDrawerOpen(false)} style={{ color: 'inherit', textDecoration: 'none' }}>
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
                    <ListItemButton onClick={(e) => setNotifAnchorEl(e.currentTarget)}>
                        <ListItemText 
                            primary="Notifications" 
                            secondary={user.unread_notifications_count > 0 ? `${user.unread_notifications_count} unread` : null} 
                        />
                    </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                    <ListItemButton component={Link} to={`/profile/${user.username}`} onClick={() => setDrawerOpen(false)}>
                        <ListItemText 
                            primary={t('nav.profile')} 
                            secondary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                    <Avatar src={user.avatar || undefined} sx={{ width: 20, height: 20 }}>
                                        {user.username.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Typography variant="caption" color="text.secondary">
                                        {user.username}
                                    </Typography>
                                </Box>
                            } 
                        />
                    </ListItemButton>
                </ListItem>
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
              color: 'text.primary'
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
                      <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
                        <IconButton color="inherit" onClick={(e) => setNotifAnchorEl(e.currentTarget)} sx={{ ml: 1 }}>
                            <Badge badgeContent={user.unread_notifications_count} color="error">
                                <NotificationsIcon />
                            </Badge>
                        </IconButton>
                        <Menu
                            anchorEl={notifAnchorEl}
                            open={Boolean(notifAnchorEl)}
                            onClose={() => setNotifAnchorEl(null)}
                            elevation={3}
                            sx={{ mt: 1 }}
                            PaperProps={{ sx: { width: 320, maxHeight: 400 } }}
                        >
                            <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Notifications</Typography>
                                {user.unread_notifications_count > 0 && (
                                    <Button size="small" onClick={handleMarkAllRead}>Mark all read</Button>
                                )}
                            </Box>
                            {notifications.length === 0 ? (
                                <Box sx={{ p: 4, textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">No notifications yet</Typography>
                                </Box>
                            ) : (
                                notifications.map(n => (
                                    <MenuItem 
                                        key={n.id} 
                                        onClick={() => handleNotificationClick(n)}
                                        sx={{ 
                                            py: 1.5, 
                                            px: 2, 
                                            borderBottom: '1px solid', 
                                            borderColor: 'divider',
                                            bgcolor: n.is_read ? 'transparent' : alpha(theme.palette.primary.main, 0.05),
                                            whiteSpace: 'normal',
                                            display: 'flex',
                                            gap: 2,
                                            alignItems: 'flex-start'
                                        }}
                                    >
                                        <Avatar src={n.actor_avatar || undefined} sx={{ width: 32, height: 32 }}>
                                            {n.actor_username.charAt(0).toUpperCase()}
                                        </Avatar>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
                                                <strong>{n.actor_username}</strong> {n.notification_type === 'reply' ? 'replied to your review' : 'mentioned you'} on <strong>{n.flavor_name}</strong>
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {new Date(n.created_at).toLocaleDateString()}
                                            </Typography>
                                        </Box>
                                    </MenuItem>
                                ))
                            )}
                        </Menu>

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
                          <MenuItem component={Link} to={`/profile/${user.username}`} onClick={() => setAnchorEl(null)}>{t('nav.profile')}</MenuItem>
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
