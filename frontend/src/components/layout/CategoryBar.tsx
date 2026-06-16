import { Link, useLocation } from 'react-router-dom';
import { Box, Button, alpha } from '@mui/material';
import type { Theme } from '@mui/material';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import CollectionsBookmarkOutlinedIcon from '@mui/icons-material/CollectionsBookmarkOutlined';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';

export interface CategoryBarProps {
  categories: { name: string; slug: string }[];
}

/**
 * Horizontal nav pinned just under the top bar on every breakpoint. Categories
 * are the dominant browse axis — laid out as a scrollable row of tabs — with
 * Home / Community / Dashboard as primary links on the left. Replaces the old
 * left rail on desktop and mirrors the same sticky chrome on mobile.
 */
export const CategoryBar = ({ categories }: CategoryBarProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const tabSx = (active: boolean) => ({
    flexShrink: 0,
    borderRadius: 2,
    px: 1.75,
    py: 0.75,
    fontWeight: active ? 700 : 500,
    color: active ? 'primary.main' : 'text.secondary',
    bgcolor: active ? (theme: Theme) => alpha(theme.palette.primary.main, 0.12) : 'transparent',
    '&:hover': {
      color: 'text.primary',
      bgcolor: 'action.hover',
    },
  });

  return (
    <Box
      component="nav"
      sx={{
        position: 'sticky',
        top: { xs: 56, sm: 64 },
        zIndex: (theme) => theme.zIndex.appBar - 1,
        borderBottom: '1px solid',
        borderColor: (theme) => theme.tokens.glass.border,
        backgroundColor: (theme) =>
          alpha(theme.palette.background.default, theme.palette.mode === 'light' ? 0.8 : 0.6),
        backdropFilter: (theme) => theme.tokens.glass.blurStrong,
        WebkitBackdropFilter: (theme) => theme.tokens.glass.blurStrong,
      }}
    >
      <Box
        sx={{
          maxWidth: 1400,
          mx: 'auto',
          px: { xs: 1, sm: 4, md: 6 },
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 0.5, md: 1 },
          minHeight: { xs: 46, md: 52 },
          overflowX: 'auto',
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}
      >
        <Button
          component={Link}
          to="/"
          disableRipple
          sx={{ ...tabSx(isActive('/')), ml: { xs: -0.5, md: -1.75 } }}
        >
          <HomeOutlinedIcon sx={{ fontSize: '1.1rem', mr: 0.75 }} />
          {t('nav.home')}
        </Button>

        {user && (
          <Button component={Link} to="/community" disableRipple sx={tabSx(isActive('/community'))}>
            <GroupsOutlinedIcon sx={{ fontSize: '1.1rem', mr: 0.75 }} />
            {t('nav.community')}
          </Button>
        )}

        {user && (
          <Button component={Link} to="/dashboard" disableRipple sx={tabSx(isActive('/dashboard'))}>
            <CollectionsBookmarkOutlinedIcon sx={{ fontSize: '1.1rem', mr: 0.75 }} />
            {t('nav.dashboard')}
          </Button>
        )}

        <Box
          sx={{
            alignSelf: 'stretch',
            my: 1.25,
            mx: 0.5,
            borderLeft: '1px solid',
            borderColor: 'divider',
          }}
        />

        {categories.map((cat) => {
          const path = `/category/${cat.slug}`;
          return (
            <Button
              key={cat.slug}
              component={Link}
              to={path}
              disableRipple
              sx={tabSx(location.pathname === path)}
            >
              {t(`categories.${cat.slug}`, { defaultValue: cat.name })}
            </Button>
          );
        })}
      </Box>
    </Box>
  );
};
