import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import {
  Typography,
  Button,
  Box,
  IconButton,
  SwipeableDrawer,
  CircularProgress,
  Badge,
  useMediaQuery,
  useTheme as useMuiTheme,
} from '@mui/material';
import { GlassAppBar } from './components/ui';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useTranslation } from 'react-i18next';
import Footer from './components/Footer';
import CookieBanner from './components/CookieBanner';
import { GlobalSearch } from './app/GlobalSearch';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { useDrawerAnchor } from './hooks/useDrawerAnchor';
import { NavSidebar } from './components/layout/NavSidebar';
import { BrandMark } from './components/layout/BrandMark';
import { DesktopTopBar } from './components/layout/DesktopTopBar';
import { DesktopCategoryBar } from './components/layout/DesktopCategoryBar';
import { useCategories } from './api/queries/useCategories';
import { NotificationMenu } from './components/layout/NotificationMenu';
import { RequireSuperuser } from './components/auth/RequireSuperuser';
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
const AdminFlavors = lazy(() => import('./pages/admin/AdminFlavors'));
const AdminUserDetail = lazy(() => import('./pages/AdminUserDetail'));
const AdminRatingDetail = lazy(() => import('./pages/AdminRatingDetail'));
const AdminReplyDetail = lazy(() => import('./pages/AdminReplyDetail'));

const App: React.FC = () => {
  const { t } = useTranslation();
  const muiTheme = useMuiTheme();
  const { user, loadingUser } = useAuth();
  const { themeName, handleThemeChange } = useTheme();
  const { anchor: mobileAnchor } = useDrawerAnchor();

  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
  const { data: categories = [] } = useCategories();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    document.body.style.backgroundColor = muiTheme.palette.background.default;
    document.body.style.color = muiTheme.palette.text.primary;
  }, [muiTheme]);

  const onThemeChange = async (name: CatppuccinTheme) => {
    await handleThemeChange(name, !!user);
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
      <NotificationMenu
        anchorEl={notifAnchorEl}
        open={Boolean(notifAnchorEl)}
        onClose={() => setNotifAnchorEl(null)}
        menuSx={{ mt: 1 }}
      />
    </>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100%',
      }}
    >
      {isMobile && (
        <GlassAppBar>
          {mobileAnchor === 'left' && hamburger}

          <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
            <BrandMark compact />
          </Box>

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

      {!isMobile && <DesktopTopBar />}

      {isMobile && (
        <SwipeableDrawer
          anchor={mobileAnchor}
          open={drawerOpen}
          onOpen={() => setDrawerOpen(true)}
          onClose={() => setDrawerOpen(false)}
          disableBackdropTransition
          disableDiscovery
          slotProps={{
            paper: {
              sx: {
                height: '100vh',
                maxHeight: '100vh',
                top: 0,
                bottom: 0,
              },
            },
          }}
        >
          <NavSidebar categories={categories} onNavigate={() => setDrawerOpen(false)} />
        </SwipeableDrawer>
      )}

      {!isMobile && <DesktopCategoryBar categories={categories} />}

      <Box sx={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>
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
                  <Route path="flavors" element={<AdminFlavors />} />
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
                      <Typography variant="h5">{t('common.notFoundTitle')}</Typography>
                      <Button component={Link} to="/" sx={{ mt: 2 }}>
                        {t('common.backToHome')}
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
