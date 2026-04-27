import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  FormGroup,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useTranslation } from 'react-i18next';
import api from '../../lib/api';
import { GlassPaper } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { useAdminConfig } from '../../api/queries/useAdminQueries';

interface SystemConfig {
  site_name: string;
  maintenance_mode: boolean;
  allow_new_signups: boolean;
  require_email_verification: boolean;
}

const blankConfig: SystemConfig = {
  site_name: '',
  maintenance_mode: false,
  allow_new_signups: true,
  require_email_verification: false,
};

const AdminConfig = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { notify } = useToast();
  const { data: config = null, isLoading } = useAdminConfig() as unknown as {
    data: SystemConfig | null | undefined;
    isLoading: boolean;
  };

  const [draft, setDraft] = useState<SystemConfig>(blankConfig);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) setDraft(config);
  }, [config]);

  const dirty = config
    ? (Object.keys(blankConfig) as Array<keyof SystemConfig>).some((k) => draft[k] !== config[k])
    : false;

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('admin-custom/config/', draft);
      qc.invalidateQueries({ queryKey: ['adminConfig'] });
      notify({
        message: t('admin.configSaved', { defaultValue: 'Configuration saved' }),
        severity: 'success',
      });
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } };
      notify({
        message: error.response?.data?.error || 'Failed to save configuration',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (config) setDraft(config);
  };

  if (isLoading || !config) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
        {t('admin.sections.config', { defaultValue: 'System Configuration' })}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Live values applied without restart. Form posts the full config on save.
      </Typography>

      <GlassPaper intensity="subtle" sx={{ p: 3, maxWidth: 720 }}>
        <Stack spacing={3} component="form" onSubmit={(e) => e.preventDefault()}>
          <TextField
            label="Site Name"
            value={draft.site_name}
            onChange={(e) => setDraft({ ...draft, site_name: e.target.value })}
            fullWidth
            helperText="Displayed in the browser tab and various headers."
          />

          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={draft.maintenance_mode}
                  onChange={(e) => setDraft({ ...draft, maintenance_mode: e.target.checked })}
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Maintenance Mode</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Block non-admin users from interacting with the site.
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  checked={draft.allow_new_signups}
                  onChange={(e) => setDraft({ ...draft, allow_new_signups: e.target.checked })}
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Allow New Signups</Typography>
                  <Typography variant="caption" color="text.secondary">
                    When off, the registration endpoint rejects new accounts.
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  checked={draft.require_email_verification}
                  onChange={(e) =>
                    setDraft({ ...draft, require_email_verification: e.target.checked })
                  }
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Require Email Verification</Typography>
                  <Typography variant="caption" color="text.secondary">
                    New accounts must confirm their email before logging in.
                  </Typography>
                </Box>
              }
            />
          </FormGroup>

          <Stack direction="row" spacing={2}>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={!dirty || saving}
              onClick={handleSave}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<RestartAltIcon />}
              onClick={handleReset}
              disabled={!dirty || saving}
            >
              Discard
            </Button>
          </Stack>
        </Stack>
      </GlassPaper>
    </Box>
  );
};

export default AdminConfig;
