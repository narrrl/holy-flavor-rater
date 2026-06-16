import { Avatar, Box, Button, Menu, MenuItem, Typography, alpha, useTheme } from '@mui/material';
import type { MenuProps, SxProps, Theme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { useNotificationClick } from '../../hooks/useNotificationClick';
import { formatDate } from '../../utils/date';
import type { Notification } from '../../contexts/NotificationContext';

interface NotificationMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  /** Extra cleanup after a notification is clicked (e.g. close a drawer). */
  onItemNavigate?: () => void;
  anchorOrigin?: MenuProps['anchorOrigin'];
  transformOrigin?: MenuProps['transformOrigin'];
  menuSx?: SxProps<Theme>;
  paperSx?: SxProps<Theme>;
}

/** Human-readable line for a notification, fully i18n'd. */
const NotifText = ({ n }: { n: Notification }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  switch (n.notification_type) {
    case 'reply':
      return <>{t('community.notifReplyOn', { flavor: n.flavor_name })}</>;
    case 'mention':
      return <>{t('community.notifMentionOn', { flavor: n.flavor_name })}</>;
    case 'follow':
      return <>{t('community.notifFollow')}</>;
    case 'profile_comment':
      return <>{t('community.notifProfileComment')}</>;
    case 'ticket_new':
      return <>{t('community.notifTicketNew')}</>;
    default:
      return (
        <>
          {user?.is_superuser
            ? t('community.notifTicketReplyAdmin')
            : t('community.notifTicketReply')}
        </>
      );
  }
};

/**
 * The notification dropdown shared by the mobile AppBar and the desktop
 * sidebar. Placement differs per consumer, so anchor/transform origins and
 * paper styling are props.
 */
export const NotificationMenu = ({
  anchorEl,
  open,
  onClose,
  onItemNavigate,
  anchorOrigin,
  transformOrigin,
  menuSx,
  paperSx,
}: NotificationMenuProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user } = useAuth();
  const { notifications, markAllRead } = useNotifications();
  const handleClick = useNotificationClick();
  const unreadCount = user?.unread_notifications_count || 0;

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      elevation={3}
      sx={menuSx}
      slotProps={{ paper: { sx: { width: 320, maxHeight: 400, borderRadius: 1, ...paperSx } } }}
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
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {t('community.notifications')}
        </Typography>
        {unreadCount > 0 && (
          <Button size="small" onClick={markAllRead}>
            {t('community.markAllRead')}
          </Button>
        )}
      </Box>
      {notifications.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {t('community.noNotifications')}
          </Typography>
        </Box>
      ) : (
        notifications.map((n) => (
          <MenuItem
            key={n.id}
            onClick={() => {
              onClose();
              handleClick(n, onItemNavigate);
            }}
            sx={{
              py: 1.5,
              px: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: n.is_read ? 'transparent' : alpha(theme.palette.primary.main, 0.05),
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
                <strong>{n.actor_username}</strong> <NotifText n={n} />
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatDate(n.created_at)}
              </Typography>
            </Box>
          </MenuItem>
        ))
      )}
    </Menu>
  );
};
