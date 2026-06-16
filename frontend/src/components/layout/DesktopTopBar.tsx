import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import CollectionsBookmarkOutlinedIcon from '@mui/icons-material/CollectionsBookmarkOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { useTranslation } from 'react-i18next';
import { GlassAppBar } from '../ui';
import { GlobalSearch } from '../../app/GlobalSearch';
import { useAuth } from '../../hooks/useAuth';
import { BrandMark } from './BrandMark';
import { NotificationMenu } from './NotificationMenu';

/**
 * Desktop top bar (md+). Promotes global search to the primary, centered slot;
 * notifications + an account menu sit on the right. Everything that used to be
 * a flat sidebar row (profile, dashboard, settings, support, admin, following,
 * logout) now lives behind the avatar menu so the chrome stays light.
 */
export const DesktopTopBar = () => {
  const { t } = useTranslation();
  const { user, following, logout } = useAuth();

  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
  const [acctAnchorEl, setAcctAnchorEl] = useState<null | HTMLElement>(null);
  const acctOpen = Boolean(acctAnchorEl);
  const closeAcct = () => setAcctAnchorEl(null);

  const unreadCount = user?.unread_notifications_count || 0;

  return (
    <GlassAppBar toolbarSx={{ maxWidth: 1400, width: '100%', mx: 'auto', px: { md: 6 } }}>
      <BrandMark />

      <GlobalSearch />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {user ? (
          <>
            <IconButton color="inherit" onClick={(e) => setNotifAnchorEl(e.currentTarget)}>
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
            <NotificationMenu
              anchorEl={notifAnchorEl}
              open={Boolean(notifAnchorEl)}
              onClose={() => setNotifAnchorEl(null)}
              menuSx={{ mt: 1 }}
            />

            <IconButton
              onClick={(e) => setAcctAnchorEl(e.currentTarget)}
              aria-label={t('nav.profile')}
              aria-haspopup="true"
              aria-expanded={acctOpen}
              sx={{ ml: 0.5 }}
            >
              <Avatar
                src={user.avatar || undefined}
                sx={{ width: 34, height: 34, border: '2px solid', borderColor: 'primary.main' }}
              >
                {user.username.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>

            <Menu
              anchorEl={acctAnchorEl}
              open={acctOpen}
              onClose={closeAcct}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{ paper: { sx: { mt: 1, minWidth: 240 } } }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                  {user.username}
                </Typography>
              </Box>
              <Divider />

              <MenuItem component={Link} to={`/profile/${user.username}`} onClick={closeAcct}>
                <ListItemIcon>
                  <PersonOutlineOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{t('nav.profile')}</ListItemText>
              </MenuItem>
              <MenuItem component={Link} to="/dashboard" onClick={closeAcct}>
                <ListItemIcon>
                  <CollectionsBookmarkOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{t('nav.dashboard')}</ListItemText>
              </MenuItem>
              <MenuItem component={Link} to="/settings" onClick={closeAcct}>
                <ListItemIcon>
                  <SettingsOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{t('nav.settings')}</ListItemText>
              </MenuItem>
              <MenuItem component={Link} to="/support" onClick={closeAcct}>
                <ListItemIcon>
                  <HelpOutlineOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{t('support.title')}</ListItemText>
              </MenuItem>

              {user.is_superuser && (
                <MenuItem component={Link} to="/admin-panel" onClick={closeAcct}>
                  <ListItemIcon>
                    <AdminPanelSettingsOutlinedIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primaryTypographyProps={{ sx: { color: 'primary.main', fontWeight: 700 } }}
                  >
                    {t('admin.panelTitle', { defaultValue: 'Admin Panel' })}
                  </ListItemText>
                </MenuItem>
              )}

              {following.length > 0 && (
                <>
                  <Divider />
                  <Typography
                    variant="overline"
                    sx={{ px: 2, color: 'text.secondary', display: 'block' }}
                  >
                    {t('nav.following')} ({following.length})
                  </Typography>
                  <Box sx={{ maxHeight: 220, overflowY: 'auto' }}>
                    {following.map((f) => (
                      <MenuItem
                        key={f.id}
                        component={Link}
                        to={`/profile/${f.username}`}
                        onClick={closeAcct}
                      >
                        <ListItemIcon>
                          <Avatar src={f.avatar || undefined} sx={{ width: 24, height: 24 }}>
                            {!f.avatar && f.username.charAt(0).toUpperCase()}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText primaryTypographyProps={{ variant: 'body2' }}>
                          {f.username}
                        </ListItemText>
                      </MenuItem>
                    ))}
                  </Box>
                </>
              )}

              <Divider />
              <MenuItem
                onClick={() => {
                  closeAcct();
                  logout();
                }}
              >
                <ListItemIcon sx={{ color: 'error.main' }}>
                  <LogoutOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primaryTypographyProps={{ sx: { color: 'error.main', fontWeight: 600 } }}
                >
                  {t('nav.logout')}
                </ListItemText>
              </MenuItem>
            </Menu>
          </>
        ) : (
          <Button variant="contained" component={Link} to="/login" sx={{ borderRadius: 2 }}>
            {t('nav.login')}
          </Button>
        )}
      </Box>
    </GlassAppBar>
  );
};
