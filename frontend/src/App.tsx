import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import {
  Typography,
  Button,
  Box,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  SwipeableDrawer,
  CircularProgress,
  Badge,
  alpha,
  useMediaQuery,
  useTheme as useMuiTheme,
} from '@mui/material';
import { GlassAppBar } from './components/ui';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useTranslation } from 'react-i18next';
import api from './lib/api';
import Footer from './components/Footer';
import CookieBanner from './components/CookieBanner';
import { formatDate } from './utils/date';
import { GlobalSearch } from './app/GlobalSearch';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { useNotifications } from './hooks/useNotifications';
import { useDrawerAnchor } from './hooks/useDrawerAnchor';
import { NavSidebar, NAV_SIDEBAR_WIDTH } from './components/layout/NavSidebar';
import { RequireSuperuser } from './components/auth/RequireSuperuser';
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
const Forbidden = lazy(() => import('./pages/Forbidden'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminBanners = lazy(() => import('./pages/admin/AdminBanners'));
const AdminJobs = lazy(() => import('./pages/admin/AdminJobs'));
const AdminTickets = lazy(() => import('./pages/admin/AdminTickets'));
const AdminConfig = lazy(() => import('./pages/admin/AdminConfig'));
const AdminUserDetail = lazy(() => import('./pages/AdminUserDetail'));
const AdminRatingDetail = lazy(() => import('./pages/AdminRatingDetail'));
const AdminReplyDetail = lazy(() => import('./pages/AdminReplyDetail'));

const App: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const muiTheme = useMuiTheme();
  const { user, loadingUser } = useAuth();
  const { themeName, handleThemeChange } = useTheme();
  const { notifications, markAllRead, markRead } = useNotifications();
  const { anchor: mobileAnchor } = useDrawerAnchor();

  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
  const [categories, setCategories] = useState<{ name: string; slug: string }[]>([]);
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const onThemeChange = async (name: CatppuccinTheme) => {
    await handleThemeChange(name, !!user);
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) await markRead(notif.id);
    setNotifAnchorEl(null);
    if (notif.notification_type.startsWith('ticket')) {
      navigate(user?.is_superuser ? '/admin-panel/tickets' : '/support');
    } else if (notif.notification_type === 'profile_comment') {
      navigate(`/profile/${user?.username}`);
    } else if (notif.notification_type === 'follow') {
      navigate(`/profile/${notif.actor_username}`);
    } else if (notif.flavor_id) {
      window.location.href = `/flavor/${notif.flavor_id}`;
    }
  };

  const hamburger = (
    <IconButton
      color="inherit"
      onClick={() => setDrawerOpen((o) => !o)}
      aria-label="toggle navigation"
      sx={{ mx: 0.5 }}
    >
      <MenuIcon />
    </IconButton>
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
      {isMobile && (
        <GlassAppBar>
          {mobileAnchor === 'left' && hamburger}

          <GlobalSearch />

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {!loadingUser && (
              <>
                {user && notificationsMenu}

                {!user && (
                  <Button
                    variant="contained"
                    component={Link}
                    to="/login"
                    sx={{ borderRadius: 2, ml: 1 }}
                  >
                    {t('nav.login')}
                  </Button>
                )}
              </>
            )}

            {mobileAnchor === 'right' && hamburger}
          </Box>
        </GlassAppBar>
      )}

      {isMobile && (
        <SwipeableDrawer
          anchor={mobileAnchor}
          open={drawerOpen}
          onOpen={() => setDrawerOpen(true)}
          onClose={() => setDrawerOpen(false)}
          disableBackdropTransition
          disableDiscovery
        >
          <NavSidebar categories={categories} onNavigate={() => setDrawerOpen(false)} />
        </SwipeableDrawer>
      )}

      <Box sx={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>
        {!isMobile && (
          <Box
            component="aside"
            sx={{
              width: NAV_SIDEBAR_WIDTH,
              flexShrink: 0,
              position: 'sticky',
              top: 0,
              alignSelf: 'flex-start',
              height: '100vh',
              borderRight: '1px solid',
              borderColor: (theme) => theme.tokens.glass.border,
              bgcolor: (theme) =>
                alpha(theme.palette.background.default, theme.palette.mode === 'light' ? 0.65 : 0.45),
              backdropFilter: (theme) => theme.tokens.glass.blurStrong,
              WebkitBackdropFilter: (theme) => theme.tokens.glass.blurStrong,
              zIndex: 1,
            }}
          >
            <NavSidebar categories={categories} showSearch showNotifications />
          </Box>
        )}

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ flexGrow: 1, width: '100%' }}>
            <Suspense
              fallback={
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
                  <CircularProgress />
                </Box>
              }
            >
              <Routes>
                <Route path="/" element={<MainPage />} />
                <Route path="/category/:slug" element={<CategoryFlavors />} />
                <Route path="/flavor/:id" element={<FlavorDetail />} />
                <Route path="/profile/:username" element={<PublicProfile />} />
                <Route path="/community" element={<CommunityFeed />} />
                <Route path="/about" element={<About />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route
                  path="/settings"
                  element={<Settings themeName={themeName} onThemeChange={onThemeChange} />}
                />
                <Route path="/support" element={<Support />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/forbidden" element={<Forbidden />} />

                <Route
                  path="/admin-panel"
                  element={
                    <RequireSuperuser>
                      <AdminLayout />
                    </RequireSuperuser>
                  }
                >
                  <Route index element={<Navigate to="overview" replace />} />
                  <Route path="overview" element={<AdminOverview />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="users/:id" element={<AdminUserDetail />} />
                  <Route path="user/:id" element={<AdminUserDetail />} />
                  <Route path="banners" element={<AdminBanners />} />
                  <Route path="jobs" element={<AdminJobs />} />
                  <Route path="tickets" element={<AdminTickets />} />
                  <Route path="config" element={<AdminConfig />} />
                  <Route path="ratings/:id" element={<AdminRatingDetail />} />
                  <Route path="rating/:id" element={<AdminRatingDetail />} />
                  <Route path="replies/:id" element={<AdminReplyDetail />} />
                  <Route path="reply/:id" element={<AdminReplyDetail />} />
                </Route>

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
        </Box>
      </Box>

      <CookieBanner onThemeChange={(name) => onThemeChange(name)} currentTheme={themeName} />
    </Box>
  );
};

export default App;
