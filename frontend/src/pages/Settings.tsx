import React, { useState, useEffect } from 'react';
import { useMe } from '../api/queries/useMe';
import { useBannersList } from '../api/queries/useBanners';
import {
  useChangePassword,
  useConfirmAccountDeletion,
  useConfirmEmail,
  useRequestAccountDeletion,
  useUpdateAvatar,
  useUpdatePreferences,
  useUpdateProfile,
} from '../api/mutations/useSettingsMutations';
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
  FormControlLabel,
  Switch,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useTitle } from '../hooks/useTitle';
import type { CatppuccinTheme } from '../theme';
import { PageShell, GlassCard, FormCard } from '../components/ui';
import { useConfirm } from '../hooks/useConfirm';
import { useDrawerAnchor } from '../hooks/useDrawerAnchor';

interface SettingsProps {
  themeName: CatppuccinTheme;
  onThemeChange: (newTheme: CatppuccinTheme) => void;
}

const readErr = (err: unknown): string | undefined =>
  (err as { response?: { data?: { error?: string } } }).response?.data?.error;

const Settings: React.FC<SettingsProps> = ({ themeName, onThemeChange }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { refetchUser } = useAuth();
  useTitle(t('nav.settings'));
  const { confirm } = useConfirm();
  const { anchor: drawerAnchor, setAnchor: setDrawerAnchor } = useDrawerAnchor();
  const { data: me } = useMe();
  const { data: banners = [] } = useBannersList();
  const updateAvatarMutation = useUpdateAvatar();
  const updatePrefs = useUpdatePreferences();
  const updateProfileMutation = useUpdateProfile();
  const confirmEmailMutation = useConfirmEmail();
  const changePasswordMutation = useChangePassword();
  const requestDeletion = useRequestAccountDeletion();
  const confirmDeletion = useConfirmAccountDeletion();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [language, setLanguage] = useState(i18n.language.split('-')[0]);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deletionCode, setDeletionCode] = useState(() => searchParams.get('deletion_code') ?? '');
  const [isDeleting, setIsDeleting] = useState(() => searchParams.has('deletion_code'));
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedBannerId, setSelectedBannerId] = useState<number | string>('');

  // Deep link from the deletion email: ?deletion_code=NNNNNN pre-fills the code
  // and opens the confirm form (see the lazy useState initializers above). The
  // user still has to click "Delete" — the link is a convenience, not a
  // one-click destruct. Strip the param after reading so it doesn't linger in
  // the URL / browser history.
  useEffect(() => {
    if (!searchParams.has('deletion_code')) return;
    searchParams.delete('deletion_code');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleGoBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  // Seed the editable form fields from the loaded profile. Done during render
  // (tracking the previously-synced `me`) rather than in an effect so the
  // inputs reflect server data without an extra commit/paint, and re-sync only
  // when the query data actually changes.
  const [syncedMe, setSyncedMe] = useState<typeof me>(undefined);
  if (me && me !== syncedMe) {
    setSyncedMe(me);
    setUsername(me.username);
    setEmail(me.email);
    setCurrentEmail(me.email);
    setAvatar(me.avatar);
    setSelectedBannerId(me.selected_banner || '');
    if (me.language) setLanguage(me.language);
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File size exceeds 2MB limit' });
      return;
    }

    try {
      const res = await updateAvatarMutation.mutateAsync(file);
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
      await updatePrefs.mutateAsync({ language: newLang });
    } catch {
      console.error('Failed to update language on server');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await updateProfileMutation.mutateAsync({ username, email });
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
      const res = await confirmEmailMutation.mutateAsync(confirmationCode);
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
      await changePasswordMutation.mutateAsync({
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
      await requestDeletion.mutateAsync();
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
      await confirmDeletion.mutateAsync(deletionCode);
      // Account gone: clear AuthContext + wipe every cached query (stale user
      // data must not survive), then SPA-navigate home.
      queryClient.clear();
      await refetchUser();
      navigate('/');
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
        sx={{ alignSelf: 'flex-start', borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
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
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
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
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
                {t('settings.appearanceTitle')}
              </Typography>
              <FormControl fullWidth margin="normal">
                <InputLabel>{t('settings.themeLabel')}</InputLabel>
                <Select
                  value={themeName}
                  label={t('settings.themeLabel')}
                  onChange={(e) => onThemeChange(e.target.value as CatppuccinTheme)}
                >
                  <ListSubheader>{t('settings.themeGroupHoly')}</ListSubheader>
                  <MenuItem value="holy_light">Holy Light</MenuItem>
                  <MenuItem value="holy_dark">Holy Dark</MenuItem>

                  <ListSubheader>{t('settings.themeGroupLight')}</ListSubheader>
                  <MenuItem value="latte">Catppuccin Latte</MenuItem>
                  <MenuItem value="pink_pastel">Pink Pastel</MenuItem>
                  <MenuItem value="mint_pastel">Mint Pastel</MenuItem>
                  <MenuItem value="lavender_pastel">Lavender Pastel</MenuItem>
                  <MenuItem value="t0p_sai">Scaled and Icy (T0P)</MenuItem>

                  <Divider />

                  <ListSubheader>{t('settings.themeGroupDark')}</ListSubheader>
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
                      await updatePrefs.mutateAsync({ selected_banner: newId });
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

              <Divider sx={{ my: 2 }} />

              <FormControlLabel
                control={
                  <Switch
                    checked={drawerAnchor === 'left'}
                    onChange={(e) => setDrawerAnchor(e.target.checked ? 'left' : 'right')}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">
                      {t('settings.leftHandMode', { defaultValue: 'Left-hand mode' })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('settings.leftHandModeHint', {
                        defaultValue:
                          'Mobile drawer slides in from the left (better for left-handed thumb reach).',
                      })}
                    </Typography>
                  </Box>
                }
                sx={{ alignItems: 'flex-start', mt: 1 }}
              />
            </GlassCard>

            {/* Avatar: NOT a FormCard — file input lives outside any form */}
            <GlassCard sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
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
