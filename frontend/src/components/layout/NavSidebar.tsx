import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Box,
  Collapse,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import CollectionsBookmarkOutlinedIcon from '@mui/icons-material/CollectionsBookmarkOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import PeopleOutlineOutlinedIcon from '@mui/icons-material/PeopleOutlineOutlined';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { GlobalSearch } from '../../app/GlobalSearch';
import { NotificationMenu } from './NotificationMenu';
import { BrandMark } from './BrandMark';

export const NAV_SIDEBAR_WIDTH = 280;

export interface NavSidebarProps {
  categories: { name: string; slug: string }[];
  onNavigate?: () => void;
  showSearch?: boolean;
  showNotifications?: boolean;
}

export const NavSidebar = ({
  categories,
  onNavigate,
  showSearch = false,
  showNotifications = false,
}: NavSidebarProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, following, logout } = useAuth();
  // Categories are the primary browse axis — open by default so they're
  // discoverable without an extra click (UX audit #4).
  const [catOpen, setCatOpen] = useState(true);
  const [followingOpen, setFollowingOpen] = useState(false);
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);

  const close = () => onNavigate?.();
  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const unreadCount = user?.unread_notifications_count || 0;

  return (
    <Box
      sx={{
        width: NAV_SIDEBAR_WIDTH,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
      role="presentation"
    >
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <BrandMark onNavigate={close} />
      </Box>

      {user ? (
        <Box
          component={Link}
          to={`/profile/${user.username}`}
          onClick={close}
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            color: 'inherit',
            textDecoration: 'none',
            borderBottom: '1px solid',
            borderColor: 'divider',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Avatar
            src={user.avatar || undefined}
            sx={{
              width: 44,
              height: 44,
              border: '2px solid',
              borderColor: 'primary.main',
            }}
          >
            {user.username.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.username}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('nav.profile')}
            </Typography>
          </Box>
        </Box>
      ) : null}

      {showSearch && (
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <GlobalSearch compact />
        </Box>
      )}

      <List sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/" onClick={close} selected={isActive('/')}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <HomeOutlinedIcon />
            </ListItemIcon>
            <ListItemText primary={t('nav.home')} />
          </ListItemButton>
        </ListItem>

        {user && (
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              to="/community"
              onClick={close}
              selected={isActive('/community')}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <GroupsOutlinedIcon />
              </ListItemIcon>
              <ListItemText primary={t('nav.community')} />
            </ListItemButton>
          </ListItem>
        )}

        {user && showNotifications && (
          <ListItem disablePadding>
            <ListItemButton onClick={(e) => setNotifAnchorEl(e.currentTarget)}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsOutlinedIcon />
                </Badge>
              </ListItemIcon>
              <ListItemText primary={t('nav.notifications', { defaultValue: 'Notifications' })} />
            </ListItemButton>
          </ListItem>
        )}

        <ListItemButton
          onClick={() => setCatOpen(!catOpen)}
          selected={location.pathname.startsWith('/category/')}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <CategoryOutlinedIcon />
          </ListItemIcon>
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
                onClick={close}
                selected={location.pathname === `/category/${cat.slug}`}
                sx={{ pl: 7 }}
              >
                <ListItemText primary={t(`categories.${cat.slug}`, { defaultValue: cat.name })} />
              </ListItemButton>
            ))}
          </List>
        </Collapse>

        {user && (
          <>
            <Divider sx={{ my: 1 }} />

            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to={`/profile/${user.username}`}
                onClick={close}
                selected={location.pathname === `/profile/${user.username}`}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <PersonOutlineOutlinedIcon />
                </ListItemIcon>
                <ListItemText primary={t('nav.profile')} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/dashboard"
                onClick={close}
                selected={isActive('/dashboard')}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <CollectionsBookmarkOutlinedIcon />
                </ListItemIcon>
                <ListItemText primary={t('nav.dashboard')} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/settings"
                onClick={close}
                selected={isActive('/settings')}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <SettingsOutlinedIcon />
                </ListItemIcon>
                <ListItemText primary={t('nav.settings')} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/support"
                onClick={close}
                selected={isActive('/support')}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <HelpOutlineOutlinedIcon />
                </ListItemIcon>
                <ListItemText primary={t('support.title')} />
              </ListItemButton>
            </ListItem>

            {user.is_superuser && (
              <>
                <Divider sx={{ my: 1 }} />
                <ListItem disablePadding>
                  <ListItemButton
                    component={Link}
                    to="/admin-panel"
                    onClick={close}
                    selected={isActive('/admin-panel')}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <AdminPanelSettingsOutlinedIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={t('admin.panelTitle', { defaultValue: 'Admin Panel' })}
                      primaryTypographyProps={{ sx: { color: 'primary.main', fontWeight: 700 } }}
                    />
                  </ListItemButton>
                </ListItem>
              </>
            )}

            {following.length > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                <ListItemButton onClick={() => setFollowingOpen(!followingOpen)}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <PeopleOutlineOutlinedIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>{t('nav.following')}</span>
                        <Typography variant="caption" color="text.secondary">
                          {following.length}
                        </Typography>
                      </Box>
                    }
                  />
                  {followingOpen ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                <Collapse in={followingOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {following.map((f) => (
                      <ListItem key={f.id} disablePadding>
                        <ListItemButton
                          component={Link}
                          to={`/profile/${f.username}`}
                          onClick={close}
                          selected={location.pathname === `/profile/${f.username}`}
                          sx={{ pl: 5 }}
                        >
                          <ListItemAvatar sx={{ minWidth: 40 }}>
                            <Avatar src={f.avatar || undefined} sx={{ width: 28, height: 28 }}>
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
                  </List>
                </Collapse>
              </>
            )}
          </>
        )}

        {!user && (
          <>
            <Divider sx={{ my: 1 }} />
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/login"
                onClick={close}
                selected={isActive('/login')}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <LoginOutlinedIcon />
                </ListItemIcon>
                <ListItemText primary={t('nav.login')} />
              </ListItemButton>
            </ListItem>
          </>
        )}
      </List>

      {user && (
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
          <ListItemButton
            onClick={() => {
              close();
              logout();
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'error.main' }}>
              <LogoutOutlinedIcon />
            </ListItemIcon>
            <ListItemText
              primary={t('nav.logout')}
              primaryTypographyProps={{ sx: { color: 'error.main', fontWeight: 600 } }}
            />
          </ListItemButton>
        </Box>
      )}

      {showNotifications && (
        <NotificationMenu
          anchorEl={notifAnchorEl}
          open={Boolean(notifAnchorEl)}
          onClose={() => setNotifAnchorEl(null)}
          onItemNavigate={close}
          anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
          transformOrigin={{ vertical: 'center', horizontal: 'left' }}
          paperSx={{ ml: 1 }}
        />
      )}
    </Box>
  );
};
