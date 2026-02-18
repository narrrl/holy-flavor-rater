import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
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
  alpha,
  useMediaQuery
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
import { formatDate } from './utils/date';
import CookieBanner from './components/CookieBanner';

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
const Support = lazy(() => import('./pages/Support'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminUserDetail = lazy(() => import('./pages/AdminUserDetail'));
const AdminRatingDetail = lazy(() => import('./pages/AdminRatingDetail'));
const AdminReplyDetail = lazy(() => import('./pages/AdminReplyDetail'));

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
    notification_type: 'reply' | 'mention' | 'ticket_new' | 'ticket_reply' | 'profile_comment';
    rating: number | null;
    reply: number | null;
    is_read: boolean;
    created_at: string;
    flavor_name: string | null;
    flavor_id: number | null;
    profile_owner_username: string | null;
}

const GlobalSearch = () => {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [options, setOptions] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useMediaQuery('(max-width:900px)');

    // Debounced search
    useEffect(() => {
        if (!query.trim()) {
            setOptions([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await api.get(`flavors/search/?q=${encodeURIComponent(query)}`);
                const results = Array.isArray(res.data) ? res.data : (res.data.results || []);
                setOptions(results);
            } catch (err) {
                console.error('Search failed');
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const q = params.get('q');
        if (q) setQuery(q);
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
        <Box sx={{ flexGrow: 1, mx: isMobile ? 1 : 4 }}>
            <Autocomplete
                fullWidth
                freeSolo
                size="small"
                loading={loading}
                options={options}
                filterOptions={(x) => x} 
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
                            endAdornment: (
                                <React.Fragment>
                                    {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                    {params.InputProps.endAdornment}
                                </React.Fragment>
                            ),
                        }}
                    />
                )}
                renderOption={(props, option) => {
                    const { key, ...optionProps } = props as any;
                    return (
                        <Box component="li" key={key} {...optionProps} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box 
                                component="img"
                                src={option.image_url || undefined}
                                sx={{ width: 32, height: 32, borderRadius: 1, objectFit: 'contain', bgcolor: 'action.hover', p: 0.5 }}
                            />
                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{option.name}</Typography>
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
  const navigate = useNavigate();
  const [themeName, setThemeName] = useState<CatppuccinTheme>((localStorage.getItem('theme') as CatppuccinTheme) || 'holy_light');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
  const [catAnchorEl, setCatAnchorEl] = useState<null | HTMLElement>(null);
  const [categories, setCategories] = useState<{name: string, slug: string}[]>([]);
  const [user, setUser] = useState<{username: string, avatar: string | null, unread_notifications_count: number, is_superuser: boolean} | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [following, setFollowing] = useState<{id: number, username: string, avatar: string | null}[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [adminMode, setAdminMode] = useState(localStorage.getItem('admin-mode') === 'true');
  const isMobile = useMediaQuery('(max-width:900px)');

  const toggleAdminMode = () => {
      const newVal = !adminMode;
      setAdminMode(newVal);
      localStorage.setItem('admin-mode', String(newVal));
  };

  const fetchNotifications = async () => {
    try {
        const res = await api.get('notifications/');
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setNotifications(data);
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
            
            try {
                const followRes = await api.get('users/following_list/');
                const followData = Array.isArray(followRes.data) ? followRes.data : (followRes.data.results || []);
                setFollowing(followData);
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

    const interval = setInterval(() => {
        if (localStorage.getItem('token')) {
            fetchNotifications();
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

        {user && (
            <ListItem disablePadding>
                <ListItemButton component={Link} to="/community" onClick={() => setDrawerOpen(false)}>
                    <ListItemText primary={t('nav.community')} />
                </ListItemButton>
            </ListItem>
        )}

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
                <ListItem disablePadding>
                    <ListItemButton component={Link} to="/support" onClick={() => setDrawerOpen(false)}>
                        <ListItemText primary={t('support.title')} />
                    </ListItemButton>
                </ListItem>

                {user.is_superuser && (
                    <ListItem disablePadding>
                        <ListItemButton onClick={toggleAdminMode}>
                            <ListItemText 
                                primary={t('admin.adminMode')} 
                                secondary={adminMode ? "ON" : "OFF"}
                                sx={{ color: adminMode ? 'primary.main' : 'inherit' }}
                            />
                        </ListItemButton>
                    </ListItem>
                )}

                {user.is_superuser && (
                    <ListItem disablePadding>
                        <ListItemButton component={Link} to="/admin-panel" onClick={() => setDrawerOpen(false)}>
                            <ListItemText primary="Admin Panel" sx={{ color: 'primary.main', fontWeight: 'bold' }} />
                        </ListItemButton>
                    </ListItem>
                )}

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

  const notificationsMenu = (
    <>
        <IconButton color="inherit" onClick={(e) => setNotifAnchorEl(e.currentTarget)} sx={{ ml: 1 }}>
            <Badge badgeContent={user?.unread_notifications_count || 0} color="error">
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
                {(user?.unread_notifications_count || 0) > 0 && (
                    <Button size="small" onClick={handleMarkAllRead}>Mark all read</Button>
                )}
            </Box>
            {notifications.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">No notifications yet</Typography>
                </Box>
            ) : (
                notifications.map(n => {
                    const handleClick = () => {
                        if (n.notification_type.startsWith('ticket')) {
                            handleNotificationClick(n);
                            navigate('/support');
                        } else if (n.notification_type === 'profile_comment') {
                            handleNotificationClick(n);
                            navigate(`/profile/${user?.username}`);
                        } else {
                            handleNotificationClick(n);
                        }
                    };

                    return (
                        <MenuItem 
                            key={n.id} 
                            onClick={handleClick}
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
                                    <strong>{n.actor_username}</strong> {
                                        n.notification_type === 'reply' ? `replied to your review on ${n.flavor_name}` :
                                        n.notification_type === 'mention' ? `mentioned you on ${n.flavor_name}` :
                                        n.notification_type === 'profile_comment' ? `left a message on your guestbook` :
                                        n.notification_type === 'ticket_new' ? t('community.notifTicketNew') :
                                        user?.is_superuser ? t('community.notifTicketReplyAdmin') : t('community.notifTicketReply')
                                    }
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {formatDate(n.created_at)}
                                </Typography>
                            </Box>
                        </MenuItem>
                    );
                })
            )}
        </Menu>
    </>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
                <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', mr: 2 }}>
                  <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
                      <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Holy Flavors Archive</Box>
                      <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>HFA</Box>
                  </Link>
                </Typography>

                <Box sx={{ display: isMobile ? 'none' : 'flex', ml: 2 }}>
                    {user && (
                        <Button 
                            color="inherit" 
                            component={Link}
                            to="/community"
                            sx={{ fontWeight: 'bold', textTransform: 'none', fontSize: '1rem', mr: 2 }}
                        >
                            {t('nav.community')}
                        </Button>
                    )}
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
                    <>
                      {user && notificationsMenu}

                      {user ? (
                        <Box sx={{ display: isMobile ? 'none' : 'flex', ml: 1 }}>
                            <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
                            <Avatar src={user.avatar || undefined} sx={{ width: 36, height: 36, border: '2px solid', borderColor: 'primary.main' }}>
                                {user.username.charAt(0).toUpperCase()}
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
                                                                                <MenuItem component={Link} to="/support" onClick={() => setAnchorEl(null)}>{t('support.title')}</MenuItem>
                                                                                {user.is_superuser && (
                                                                                    <MenuItem onClick={toggleAdminMode} sx={{ color: adminMode ? 'primary.main' : 'inherit' }}>
                                                                                        {t('admin.adminMode')}: {adminMode ? "ON" : "OFF"}
                                                                                    </MenuItem>
                                                                                )}
                                                                                {user.is_superuser && (
                                                                                    <MenuItem component={Link} to="/admin-panel" onClick={() => setAnchorEl(null)} sx={{ fontWeight: 'bold', color: 'primary.main' }}>Admin Panel</MenuItem>
                                                                                )}                                                      <Divider />
                                                      <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>{t('nav.logout')}</MenuItem>                            </Menu>
                        </Box>
                      ) : (
                        <Box sx={{ display: isMobile ? 'none' : 'block' }}>
                            <Button variant="contained" component={Link} to="/login" sx={{ borderRadius: 2 }}>Login</Button>
                        </Box>
                      )}
                    </>
                  )}

                  {isMobile && (
                      <IconButton
                          color="inherit"
                          onClick={() => setDrawerOpen(true)}
                          sx={{ ml: 1 }}
                      >
                          <MenuIcon />
                      </IconButton>
                  )}
                </Box>
            </Toolbar>
          </AppBar>

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
                    <Route path="/" element={<MainPage adminMode={adminMode} />} />
                    <Route path="/category/:slug" element={<CategoryFlavors />} />
                    <Route path="/flavor/:id" element={<FlavorDetail adminMode={adminMode} />} />
                    <Route path="/profile/:username" element={<PublicProfile adminMode={adminMode} />} />
                    <Route path="/community" element={<CommunityFeed adminMode={adminMode} />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/settings" element={<Settings themeName={themeName} onThemeChange={handleThemeChange} />} />
                    <Route path="/support" element={<Support />} />
                    <Route path="/admin-panel" element={<AdminDashboard />} />
                    <Route path="/admin-panel/user/:id" element={<AdminUserDetail />} />
                    <Route path="/admin-panel/rating/:id" element={<AdminRatingDetail />} />
                    <Route path="/admin-panel/reply/:id" element={<AdminReplyDetail />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="*" element={<Box sx={{ p: 4, textAlign: 'center' }}><Typography variant="h5">404 - Page Not Found</Typography><Button component={Link} to="/" sx={{ mt: 2 }}>Back to Home</Button></Box>} />
                </Routes>
            </Suspense>
          </Box>
          <Footer />
        </Box>
        <CookieBanner onThemeChange={handleThemeChange} currentTheme={themeName} />
    </ThemeProvider>
  );
};

export default App;
