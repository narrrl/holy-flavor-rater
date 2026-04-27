import { Link as RouterLink, Outlet, useLocation, useParams } from 'react-router-dom';
import {
  Box,
  Breadcrumbs,
  Link as MuiLink,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import WallpaperIcon from '@mui/icons-material/Wallpaper';
import TerminalIcon from '@mui/icons-material/Terminal';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import TuneIcon from '@mui/icons-material/Tune';
import { useTranslation } from 'react-i18next';
import { PageShell } from '../../components/ui';
import { useTitle } from '../../hooks/useTitle';

const SECTIONS = [
  { value: 'overview', icon: <SettingsIcon /> },
  { value: 'users', icon: <PeopleIcon /> },
  { value: 'banners', icon: <WallpaperIcon /> },
  { value: 'jobs', icon: <TerminalIcon /> },
  { value: 'tickets', icon: <HelpOutlineIcon /> },
  { value: 'config', icon: <TuneIcon /> },
] as const;

const AdminLayout = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const params = useParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  useTitle(t('admin.title'));

  const segments = location.pathname.split('/').filter(Boolean);
  const sectionSlug = segments[1] ?? 'overview';
  const detailSegment = segments[2];

  const sectionKnown = SECTIONS.some((s) => s.value === sectionSlug);
  const tabValue = sectionKnown ? sectionSlug : 'overview';

  const sectionLabel = (slug: string) =>
    t(`admin.sections.${slug}`, {
      defaultValue: slug.charAt(0).toUpperCase() + slug.slice(1),
    });

  const detailLabel = () => {
    if (!detailSegment) return null;
    if (sectionSlug === 'users' && params.id) return `User #${params.id}`;
    if (sectionSlug === 'ratings' || segments[1] === 'rating')
      return `Rating #${params.id ?? detailSegment}`;
    if (sectionSlug === 'replies' || segments[1] === 'reply')
      return `Reply #${params.id ?? detailSegment}`;
    return decodeURIComponent(detailSegment);
  };

  return (
    <PageShell>
      <Breadcrumbs sx={{ mb: 2 }} separator="›">
        <MuiLink component={RouterLink} to="/" underline="hover" color="inherit">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <HomeOutlinedIcon fontSize="small" />
            {t('common.home', { defaultValue: 'Home' })}
          </Box>
        </MuiLink>
        <MuiLink component={RouterLink} to="/admin-panel" underline="hover" color="inherit">
          {t('admin.title')}
        </MuiLink>
        {sectionKnown && (
          <MuiLink
            component={RouterLink}
            to={`/admin-panel/${sectionSlug}`}
            underline="hover"
            color={detailSegment ? 'inherit' : 'text.primary'}
          >
            {sectionLabel(sectionSlug)}
          </MuiLink>
        )}
        {detailLabel() && <Typography color="text.primary">{detailLabel()}</Typography>}
      </Breadcrumbs>

      <Typography variant={isMobile ? 'h4' : 'h3'} sx={{ fontWeight: 'bold', mb: 3 }}>
        {t('admin.title')}
      </Typography>

      <Tabs
        value={tabValue}
        variant={isMobile ? 'scrollable' : 'standard'}
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}
      >
        {SECTIONS.map((s) => (
          <Tab
            key={s.value}
            value={s.value}
            label={sectionLabel(s.value)}
            icon={s.icon}
            iconPosition="start"
            component={RouterLink}
            to={`/admin-panel/${s.value}`}
          />
        ))}
      </Tabs>

      <Outlet />
    </PageShell>
  );
};

export default AdminLayout;
