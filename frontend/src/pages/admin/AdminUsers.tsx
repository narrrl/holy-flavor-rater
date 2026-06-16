import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlassPaper } from '../../components/ui';
import { formatDate } from '../../utils/date';
import { useAdminUsers } from '../../api/queries/useAdminQueries';

interface AdminUser {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_login: string;
  ips: string[];
}

const AdminUsers = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [search, setSearch] = useState('');
  const { data: users = [], isLoading } = useAdminUsers() as unknown as {
    data: AdminUser[];
    isLoading: boolean;
  };

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction={isMobile ? 'column' : 'row'}
        justifyContent="space-between"
        alignItems={isMobile ? 'flex-start' : 'center'}
        sx={{ mb: 2 }}
        spacing={2}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {t('admin.users')} ({filtered.length})
        </Typography>
        <TextField
          size="small"
          placeholder={t('common.search', { defaultValue: 'Search…' })}
          fullWidth={isMobile}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: isMobile ? '100%' : 300 }}
        />
      </Stack>

      {isMobile ? (
        <Stack spacing={2}>
          {filtered.map((user) => (
            <GlassCard key={user.id} intensity="subtle" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {user.username}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/admin-panel/users/${user.id}`)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  {user.email}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Chip
                    label={user.is_active ? t('common.active') : t('common.inactive')}
                    color={user.is_active ? 'success' : 'default'}
                    size="small"
                    sx={{ height: 20, fontSize: '0.65rem' }}
                  />
                  {user.is_superuser && (
                    <Chip
                      label={t('admin.roleAdmin')}
                      color="secondary"
                      size="small"
                      sx={{ height: 20, fontSize: '0.65rem' }}
                    />
                  )}
                </Stack>
              </CardContent>
            </GlassCard>
          ))}
        </Stack>
      ) : (
        <TableContainer component={GlassPaper} sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>{t('admin.colId')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('admin.colUser')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('admin.colEmail')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('admin.colStatus')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('admin.colJoined')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('admin.colIp')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  {t('admin.colActions')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>{user.id}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {user.username}
                    </Typography>
                    {user.is_superuser && (
                      <Chip
                        label={t('admin.roleSuperuser')}
                        size="small"
                        color="secondary"
                        sx={{ height: 16, fontSize: '0.6rem' }}
                      />
                    )}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.is_active ? t('common.active') : t('common.inactive')}
                      color={user.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatDate(user.date_joined)}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {user.ips.slice(0, 3).map((ip) => (
                        <Chip
                          key={ip}
                          label={ip}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      ))}
                      {user.ips.length > 3 && (
                        <Typography variant="caption">+{user.ips.length - 3}</Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/admin-panel/users/${user.id}`)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default AdminUsers;
