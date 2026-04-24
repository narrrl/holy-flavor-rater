import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListSubheader,
  Divider,
  Grid,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useTranslation } from 'react-i18next';
import { useTitle } from '../hooks/useTitle';
import type { CatppuccinTheme } from '../theme';
import { PageShell, GlassCard, FormCard } from '../components/ui';
import { useConfirm } from '../hooks/useConfirm';

interface SettingsProps {
  themeName: CatppuccinTheme;
  onThemeChange: (newTheme: CatppuccinTheme) => void;
}

interface Banner {
  id: number;
  name: string;
}

const readErr = (err: unknown): string | undefined =>
  (err as { response?: { data?: { error?: string } } }).response?.data?.error;

const Settings: React.FC<SettingsProps> = ({ themeName, onThemeChange }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  useTitle(t('nav.settings'));
  const { confirm } = useConfirm();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [language, setLanguage] = useState(i18n.language.split('-')[0]);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deletionCode, setDeletionCode] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [selectedBannerId, setSelectedBannerId] = useState<number | string>('');

  const handleGoBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const [userRes, bannersRes] = await Promise.all([
          api.get('users/me/'),
          api.get('banners/'),
        ]);

        setUsername(userRes.data.username);
        setEmail(userRes.data.email);
        setCurrentEmail(userRes.data.email);
        setAvatar(userRes.data.avatar);
        setSelectedBannerId(userRes.data.selected_banner || '');

        if (userRes.data.language) {
          setLanguage(userRes.data.language);
        }

        const bannersData: Banner[] = Array.isArray(bannersRes.data)
          ? bannersRes.data
          : bannersRes.data.results || [];
        setBanners(bannersData);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUser();
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File size exceeds 2MB limit' });
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await api.post('users/update_avatar/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAvatar(res.data.avatar);
      setMessage({ type: 'success', text: t('settings.avatarSuccess') });
    } catch (err) {
      setMessage({ type: 'error', text: readErr(err) || 'Failed to upload avatar' });
    }
  };

  const handleLanguageChange = async (newLang: string) => {
    setLanguage(newLang);
    i18n.changeLanguage(newLang);
    try {
      await api.patch('users/update_preferences/', { language: newLang });
    } catch {
      console.error('Failed to update language on server');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.patch('users/update_profile/', { username, email });
      if (res.data.message) {
        setPendingConfirmation(true);
        setMessage({ type: 'success', text: `${t('settings.updateSuccess')} ${res.data.message}` });
      } else {
        setMessage({ type: 'success', text: t('settings.updateSuccess') });
        setCurrentEmail(email);
      }
    } catch (err) {
      setMessage({ type: 'error', text: readErr(err) || 'Failed to update profile' });
    }
  };

  const handleConfirmEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('users/confirm_email/', { code: confirmationCode });
      setMessage({ type: 'success', text: t('settings.updateSuccess') });
      setCurrentEmail(res.data.email);
      setPendingConfirmation(false);
      setConfirmationCode('');
    } catch (err) {
      setMessage({ type: 'error', text: readErr(err) || 'Confirmation failed' });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('users/change_password/', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      setMessage({ type: 'success', text: t('settings.passwordSuccess') });
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      setMessage({ type: 'error', text: readErr(err) || 'Failed to change password' });
    }
  };

  const handleRequestDeletion = async () => {
    try {
      await api.post('users/request_account_deletion/');
      setIsDeleting(true);
      setMessage({ type: 'success', text: t('settings.codeSent') });
    } catch {
      setMessage({ type: 'error', text: 'Failed to request deletion.' });
    }
  };

  const handleConfirmDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await confirm({
      title: 'Delete account',
      message: 'Are you absolutely sure? This cannot be undone.',
      confirmLabel: 'Delete forever',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.post('users/confirm_account_deletion/', { code: deletionCode });
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
      window.location.href = '/';
    } catch {
      setMessage({ type: 'error', text: 'Invalid code. Deletion failed.' });
    }
  };

  return (
    <PageShell>
      <Button
        variant="outlined"
        onClick={handleGoBack}
        startIcon={<ArrowBackIcon />}
        sx={{ alignSelf: 'flex-start', borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
      >
        {window.history.length > 1 ? t('common.back') : t('common.backToHome')}
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <Avatar
          src={avatar || undefined}
          sx={{ width: 80, height: 80, border: '3px solid', borderColor: 'primary.main' }}
        >
          {!avatar && username.charAt(0).toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            {username}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('settings.subtitle')}
          </Typography>
        </Box>
      </Box>

      {message && (
        <Alert severity={message.type} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Left Column: Visuals, Avatar */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <GlassCard sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                {t('settings.appearanceTitle')}
              </Typography>
              <FormControl fullWidth margin="normal">
                <InputLabel>{t('settings.themeLabel')}</InputLabel>
                <Select
                  value={themeName}
                  label={t('settings.themeLabel')}
                  onChange={(e) => onThemeChange(e.target.value as CatppuccinTheme)}
                >
                  <ListSubheader>Holy Archive</ListSubheader>
                  <MenuItem value="holy_light">Holy Light</MenuItem>
                  <MenuItem value="holy_dark">Holy Dark</MenuItem>

                  <ListSubheader>Light Themes</ListSubheader>
                  <MenuItem value="latte">Catppuccin Latte</MenuItem>
                  <MenuItem value="pink_pastel">Pink Pastel</MenuItem>
                  <MenuItem value="mint_pastel">Mint Pastel</MenuItem>
                  <MenuItem value="lavender_pastel">Lavender Pastel</MenuItem>
                  <MenuItem value="t0p_sai">Scaled and Icy (T0P)</MenuItem>

                  <Divider />

                  <ListSubheader>Dark Themes</ListSubheader>
                  <MenuItem value="mocha">Catppuccin Mocha</MenuItem>
                  <MenuItem value="frappe">Catppuccin Frappé</MenuItem>
                  <MenuItem value="macchiato">Catppuccin Macchiato</MenuItem>
                  <MenuItem value="dracula">Dracula</MenuItem>
                  <MenuItem value="nord">Nordic Frost</MenuItem>
                  <MenuItem value="gruvbox">Gruvbox Retro</MenuItem>
                  <MenuItem value="oceanic">Oceanic Deep</MenuItem>
                  <MenuItem value="t0p_trench">Trench (T0P)</MenuItem>
                  <MenuItem value="t0p_blurryface">Blurryface (T0P)</MenuItem>
                  <MenuItem value="t0p_clancy">Clancy (T0P)</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth margin="normal">
                <InputLabel>{t('settings.bannerLabel')}</InputLabel>
                <Select
                  value={selectedBannerId}
                  label={t('settings.bannerLabel')}
                  onChange={async (e) => {
                    const newId = e.target.value;
                    setSelectedBannerId(newId);
                    try {
                      await api.patch('users/update_preferences/', { selected_banner: newId });
                    } catch {
                      console.error('Failed to update banner preference');
                    }
                  }}
                >
                  <MenuItem value="">{t('settings.bannerDefault')}</MenuItem>
                  {banners.map((b) => (
                    <MenuItem key={b.id} value={b.id}>
                      {b.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth margin="normal">
                <InputLabel>{t('settings.langLabel')}</InputLabel>
                <Select
                  value={language}
                  label={t('settings.langLabel')}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="de">Deutsch</MenuItem>
                </Select>
              </FormControl>
            </GlassCard>

            {/* Avatar: NOT a FormCard — file input lives outside any form */}
            <GlassCard sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                {t('settings.avatarTitle')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, my: 2 }}>
                <Avatar src={avatar || undefined} sx={{ width: 100, height: 100 }}>
                  {!avatar && username.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Button variant="outlined" component="label" size="small">
                    {t('settings.avatarButton')}
                    <input type="file" hidden accept="image/*" onChange={handleAvatarUpload} />
                  </Button>
                  <Typography
                    variant="caption"
                    display="block"
                    sx={{ mt: 1 }}
                    color="text.secondary"
                  >
                    {t('settings.avatarHint')}
                  </Typography>
                </Box>
              </Box>
            </GlassCard>
          </Box>
        </Grid>

        {/* Right Column: Info / Password / Danger */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormCard
              title={t('settings.infoTitle')}
              onSubmit={handleUpdateProfile}
              actions={
                <Button variant="contained" type="submit" sx={{ borderRadius: 2 }}>
                  {t('settings.updateButton')}
                </Button>
              }
            >
              <TextField
                fullWidth
                label={t('settings.usernameLabel')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                fullWidth
                label={t('settings.emailLabel')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                helperText={email !== currentEmail ? t('settings.emailHint') : ''}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </FormCard>

            {pendingConfirmation && (
              <FormCard
                title={t('settings.confirmEmailTitle')}
                subtitle={t('settings.confirmEmailHint', { email })}
                onSubmit={handleConfirmEmail}
                actions={
                  <Button
                    variant="contained"
                    color="secondary"
                    type="submit"
                    sx={{ borderRadius: 2 }}
                  >
                    {t('settings.confirmButton')}
                  </Button>
                }
              >
                <TextField
                  fullWidth
                  label={t('settings.deletionCodeLabel')}
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </FormCard>
            )}

            <FormCard
              title={t('settings.passwordTitle')}
              onSubmit={handleChangePassword}
              actions={
                <Button variant="contained" color="warning" type="submit" sx={{ borderRadius: 2 }}>
                  {t('settings.passwordButton')}
                </Button>
              }
            >
              <TextField
                fullWidth
                label={t('settings.oldPasswordLabel')}
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                fullWidth
                label={t('settings.newPasswordLabel')}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </FormCard>

            {!isDeleting ? (
              <FormCard
                title={t('settings.dangerTitle')}
                subtitle={t('settings.dangerDesc')}
                danger
                asForm={false}
                actions={
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleRequestDeletion}
                    sx={{ borderRadius: 2 }}
                  >
                    {t('settings.deleteButton')}
                  </Button>
                }
              >
                <Box />
              </FormCard>
            ) : (
              <FormCard
                title={t('settings.dangerTitle')}
                subtitle={t('settings.deletionCodeHint')}
                danger
                onSubmit={handleConfirmDeletion}
                actions={
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button onClick={() => setIsDeleting(false)} sx={{ borderRadius: 2 }}>
                      {t('settings.cancelButton')}
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      type="submit"
                      disabled={!deletionCode}
                      sx={{ borderRadius: 2 }}
                    >
                      {t('settings.confirmDeleteButton')}
                    </Button>
                  </Box>
                }
              >
                <TextField
                  fullWidth
                  size="small"
                  label={t('settings.deletionCodeLabel')}
                  value={deletionCode}
                  onChange={(e) => setDeletionCode(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </FormCard>
            )}
          </Box>
        </Grid>
      </Grid>
    </PageShell>
  );
};

export default Settings;
