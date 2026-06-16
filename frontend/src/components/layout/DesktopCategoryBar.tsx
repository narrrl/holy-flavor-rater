import { Link, useLocation } from 'react-router-dom';
import { Box, Button, alpha } from '@mui/material';
import type { Theme } from '@mui/material';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';

export interface DesktopCategoryBarProps {
  categories: { name: string; slug: string }[];
}

/**
 * Desktop horizontal nav (md+), pinned just under the top bar. Categories are
 * the dominant browse axis here — laid out as a scrollable row of tabs — with
 * Home / Community as primary links on the left. Replaces the old left rail.
 */
export const DesktopCategoryBar = ({ categories }: DesktopCategoryBarProps) => {
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
        top: 64,
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
          px: { md: 6 },
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          minHeight: 52,
          overflowX: 'auto',
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}
      >
        <Button component={Link} to="/" disableRipple sx={tabSx(isActive('/'))}>
          <HomeOutlinedIcon sx={{ fontSize: '1.1rem', mr: 0.75 }} />
          {t('nav.home')}
        </Button>

        {user && (
          <Button component={Link} to="/community" disableRipple sx={tabSx(isActive('/community'))}>
            <GroupsOutlinedIcon sx={{ fontSize: '1.1rem', mr: 0.75 }} />
            {t('nav.community')}
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
