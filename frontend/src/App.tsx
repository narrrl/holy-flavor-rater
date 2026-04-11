import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import {
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
  CircularProgress,
  ListItemAvatar,
  ListSubheader,
  Badge,
  alpha,
  useMediaQuery,
  useTheme as useMuiTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';
import api from './lib/api';
import Footer from './components/Footer';
import CookieBanner from './components/CookieBanner';
import { formatDate } from './utils/date';
import { GlobalSearch } from './app/GlobalSearch';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { useNotifications } from './hooks/useNotifications';
import type { Notification } from './contexts/NotificationContext';
import type { CatppuccinTheme } from './theme';

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
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminUserDetail = lazy(() => import('./pages/AdminUserDetail'));
const AdminRatingDetail = lazy(() => import('./pages/AdminRatingDetail'));
const AdminReplyDetail = lazy(() => import('./pages/AdminReplyDetail'));

const App: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const muiTheme = useMuiTheme();
  const { user, following, loadingUser, logout } = useAuth();
  const { themeName, handleThemeChange } = useTheme();
  const { notifications, markAllRead, markRead } = useNotifications();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
  const [catAnchorEl, setCatAnchorEl] = useState<null | HTMLElement>(null);
  const [categories, setCategories] = useState<{ name: string; slug: string }[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [adminMode, setAdminMode] = useState(localStorage.getItem('admin-mode') === 'true');
  const isMobile = useMediaQuery('(max-width:1150px)');

  useEffect(() => {
    api
      .get('categories/')
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data.results || [];
        setCategories(data);
      })
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    document.body.style.backgroundColor = muiTheme.palette.background.default;
    document.body.style.color = muiTheme.palette.text.primary;
  }, [muiTheme]);

  const toggleAdminMode = () => {
    const newVal = !adminMode;
    setAdminMode(newVal);
    localStorage.setItem('admin-mode', String(newVal));
  };

  const onThemeChange = async (name: CatppuccinTheme) => {
    await handleThemeChange(name, !!user);
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) await markRead(notif.id);
    setNotifAnchorEl(null);
    if (notif.notification_type.startsWith('ticket')) {
      navigate('/support');
    } else if (notif.notification_type === 'profile_comment') {
      navigate(`/profile/${user?.username}`);
    } else if (notif.notification_type === 'follow') {
      navigate(`/profile/${notif.actor_username}`);
    } else if (notif.flavor_id) {
      window.location.href = `/flavor/${notif.flavor_id}`;
    }
  };

  const drawer = (
    <Box sx={{ width: 280 }} role="presentation">
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          <Link
            to="/"
            onClick={() => setDrawerOpen(false)}
            style={{ color: 'inherit', textDecoration: 'none' }}
          >
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
            {categories.map((cat) => (
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
              <ListItemButton
                component={Link}
                to={`/profile/${user.username}`}
                onClick={() => setDrawerOpen(false)}
              >
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
                    secondary={adminMode ? 'ON' : 'OFF'}
                    sx={{ color: adminMode ? 'primary.main' : 'inherit' }}
                  />
                </ListItemButton>
              </ListItem>
            )}

            {user.is_superuser && (
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  to="/admin-panel"
                  onClick={() => setDrawerOpen(false)}
                >
                  <ListItemText
                    primary="Admin Panel"
                    sx={{ color: 'primary.main', fontWeight: 'bold' }}
                  />
                </ListItemButton>
              </ListItem>
            )}

            {following.length > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                <ListSubheader
                  sx={{ bgcolor: 'transparent', fontWeight: 'bold', lineHeight: '32px' }}
                >
                  {t('nav.following')}
                </ListSubheader>
                {following.map((f) => (
                  <ListItem key={f.id} disablePadding>
                    <ListItemButton
                      component={Link}
                      to={`/profile/${f.username}`}
                      onClick={() => setDrawerOpen(false)}
                    >
                      <ListItemAvatar>
                        <Avatar src={f.avatar || undefined} sx={{ width: 32, height: 32 }}>
                          {!f.avatar && f.username.charAt(0).toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={f.username}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </>
            )}

            <ListItem disablePadding>
              <ListItemButton onClick={logout}>
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
        PaperProps={{ sx: { width: 320, maxHeight: 400, borderRadius: 1 } }}
      >
        <Box
          sx={{
            p: 1.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            Notifications
          </Typography>
          {(user?.unread_notifications_count || 0) > 0 && (
            <Button size="small" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </Box>
        {notifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No notifications yet
            </Typography>
          </Box>
        ) : (
          notifications.map((n) => (
            <MenuItem
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              sx={{
                py: 1.5,
                px: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: n.is_read ? 'transparent' : alpha(muiTheme.palette.primary.main, 0.05),
                whiteSpace: 'normal',
                display: 'flex',
                gap: 2,
                alignItems: 'flex-start',
              }}
            >
              <Avatar src={n.actor_avatar || undefined} sx={{ width: 32, height: 32 }}>
                {n.actor_username.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
                  <strong>{n.actor_username}</strong>{' '}
                  {n.notification_type === 'reply'
                    ? `replied to your review on ${n.flavor_name}`
                    : n.notification_type === 'mention'
                      ? `mentioned you on ${n.flavor_name}`
                      : n.notification_type === 'follow'
                        ? t('community.notifFollow')
                        : n.notification_type === 'profile_comment'
                          ? `left a message on your guestbook`
                          : n.notification_type === 'ticket_new'
                            ? t('community.notifTicketNew')
                            : user?.is_superuser
                              ? t('community.notifTicketReplyAdmin')
                              : t('community.notifTicketReply')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(n.created_at)}
                </Typography>
              </Box>
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100%',
        overflowX: 'hidden',
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: (th) => alpha(th.palette.background.paper, 0.8),
          backdropFilter: 'blur(12px)',
          color: 'text.primary',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 1, sm: 4, md: 6 } }}>
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 'bold',
              mr: { xs: 0, sm: 2 },
              display: { xs: 'none', sm: 'block' },
            }}
          >
            <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                Holy Flavors Archive
              </Box>
              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                HFA
              </Box>
            </Link>
          </Typography>

          <Box sx={{ display: isMobile ? 'none' : 'flex', ml: 2 }}>
            {user && (
              <Button
                color="inherit"
                component={Link}
                to="/community"
                sx={{
                  fontWeight: 'bold',
                  textTransform: 'none',
                  fontSize: '1rem',
                  mr: 2,
                }}
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
              {categories.map((cat) => (
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
                      <Avatar
                        src={user.avatar || undefined}
                        sx={{
                          width: 36,
                          height: 36,
                          border: '2px solid',
                          borderColor: 'primary.main',
                        }}
                      >
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
                      <MenuItem
                        component={Link}
                        to={`/profile/${user.username}`}
                        onClick={() => setAnchorEl(null)}
                      >
                        {t('nav.profile')}
                      </MenuItem>
                      <MenuItem component={Link} to="/dashboard" onClick={() => setAnchorEl(null)}>
                        {t('nav.dashboard')}
                      </MenuItem>
                      <MenuItem component={Link} to="/settings" onClick={() => setAnchorEl(null)}>
                        {t('nav.settings')}
                      </MenuItem>
                      <MenuItem component={Link} to="/support" onClick={() => setAnchorEl(null)}>
                        {t('support.title')}
                      </MenuItem>
                      {user.is_superuser && (
                        <MenuItem
                          onClick={toggleAdminMode}
                          sx={{ color: adminMode ? 'primary.main' : 'inherit' }}
                        >
                          {t('admin.adminMode')}: {adminMode ? 'ON' : 'OFF'}
                        </MenuItem>
                      )}
                      {user.is_superuser && (
                        <MenuItem
                          component={Link}
                          to="/admin-panel"
                          onClick={() => setAnchorEl(null)}
                          sx={{ fontWeight: 'bold', color: 'primary.main' }}
                        >
                          Admin Panel
                        </MenuItem>
                      )}
                      <Divider />
                      <MenuItem onClick={logout} sx={{ color: 'error.main' }}>
                        {t('nav.logout')}
                      </MenuItem>
                    </Menu>
                  </Box>
                ) : (
                  <Box sx={{ display: isMobile ? 'none' : 'block' }}>
                    <Button
                      variant="contained"
                      component={Link}
                      to="/login"
                      sx={{ borderRadius: 2 }}
                    >
                      Login
                    </Button>
                  </Box>
                )}
              </>
            )}

            {isMobile && (
              <IconButton color="inherit" onClick={() => setDrawerOpen(true)} sx={{ ml: 1 }}>
                <MenuIcon />
              </IconButton>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {drawer}
      </Drawer>

      <Box sx={{ flexGrow: 1, width: '100%' }}>
        <Suspense
          fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
              <CircularProgress />
            </Box>
          }
        >
          <Routes>
            <Route path="/" element={<MainPage adminMode={adminMode} />} />
            <Route path="/category/:slug" element={<CategoryFlavors />} />
            <Route path="/flavor/:id" element={<FlavorDetail adminMode={adminMode} />} />
            <Route path="/profile/:username" element={<PublicProfile adminMode={adminMode} />} />
            <Route path="/community" element={<CommunityFeed adminMode={adminMode} />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route
              path="/settings"
              element={<Settings themeName={themeName} onThemeChange={onThemeChange} />}
            />
            <Route path="/support" element={<Support />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/admin-panel" element={<AdminDashboard />} />
            <Route path="/admin-panel/user/:id" element={<AdminUserDetail />} />
            <Route path="/admin-panel/rating/:id" element={<AdminRatingDetail />} />
            <Route path="/admin-panel/reply/:id" element={<AdminReplyDetail />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="*"
              element={
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="h5">404 - Page Not Found</Typography>
                  <Button component={Link} to="/" sx={{ mt: 2 }}>
                    Back to Home
                  </Button>
                </Box>
              }
            />
          </Routes>
        </Suspense>
      </Box>
      <Footer />
      <CookieBanner onThemeChange={(name) => onThemeChange(name)} currentTheme={themeName} />
    </Box>
  );
};

export default App;
