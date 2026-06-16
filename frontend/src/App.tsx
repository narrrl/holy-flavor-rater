import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { Typography, Button, Box, CircularProgress, useTheme as useMuiTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import Footer from './components/Footer';
import CookieBanner from './components/CookieBanner';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { TopBar } from './components/layout/TopBar';
import { CategoryBar } from './components/layout/CategoryBar';
import { useCategories } from './api/queries/useCategories';
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
  const { user } = useAuth();
  const { themeName, handleThemeChange } = useTheme();

  const { data: categories = [] } = useCategories();

  useEffect(() => {
    document.body.style.backgroundColor = muiTheme.palette.background.default;
    document.body.style.color = muiTheme.palette.text.primary;
  }, [muiTheme]);

  const onThemeChange = async (name: CatppuccinTheme) => {
    await handleThemeChange(name, !!user);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100%',
      }}
    >
      <TopBar />

      <CategoryBar categories={categories} />

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
