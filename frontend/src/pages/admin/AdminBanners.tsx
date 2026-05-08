import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Box, Button, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { EmptyState, GlassCard } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { useBannersList } from '../../api/queries/useBanners';
import { useActivateBanner, useToggleBannerEnabled } from '../../api/mutations/useAdminMutations';
import BannerSettingsDialog from '../../components/BannerSettingsDialog';

interface BannerSettingSchema {
  key: string;
  label: string;
  type: 'number' | 'slider' | 'text' | 'boolean';
  min?: number;
  max?: number;
  step?: number;
  description?: string;
}

interface Banner {
  id: number;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  is_enabled: boolean;
  settings: Record<string, unknown>;
  schema: BannerSettingSchema[];
}

const AdminBanners = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { notify } = useToast();
  const { data: banners = [], isLoading } = useBannersList() as unknown as {
    data: Banner[];
    isLoading: boolean;
  };
  const activateBannerMutation = useActivateBanner();
  const toggleBannerEnabledMutation = useToggleBannerEnabled();

  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  const handleActivateBanner = async (id: number) => {
    try {
      await activateBannerMutation.mutateAsync(id);
      notify({ message: 'Banner set as default', severity: 'success' });
    } catch (err) {
      console.error(err);
      notify({ message: 'Failed to activate banner', severity: 'error' });
    }
  };

  const handleToggleEnabled = async (id: number) => {
    try {
      await toggleBannerEnabledMutation.mutateAsync(id);
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } };
      notify({
        message: error.response?.data?.error || 'Failed to toggle visibility',
        severity: 'error',
      });
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
        {t('admin.banners')} ({banners.length})
      </Typography>

      {banners.length === 0 ? (
        <EmptyState
          title="No banner models found"
          subtitle="No banners registered in the database."
          action={
            <Button
              variant="outlined"
              onClick={() => qc.invalidateQueries({ queryKey: ['banners'] })}
            >
              Retry Loading
            </Button>
          }
        />
      ) : (
        <Stack spacing={3}>
          {banners.map((banner) => (
            <GlassCard
              key={banner.id}
              sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {banner.name} (Slug: {banner.slug})
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    {!banner.is_enabled && (
                      <Chip
                        label="Hidden from Users"
                        color="warning"
                        size="small"
                        variant="outlined"
                      />
                    )}
                    {banner.is_active && (
                      <Chip label="Global Default" color="success" size="small" />
                    )}
                  </Stack>
                </Box>

                <Typography variant="body2" sx={{ mb: 2 }}>
                  {banner.description}
                </Typography>

                <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, mb: 2 }}>
                  <pre style={{ margin: 0, fontSize: '0.8rem' }}>
                    {JSON.stringify(banner.settings, null, 2)}
                  </pre>
                </Box>

                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setSelectedBanner(banner);
                      setIsSettingsDialogOpen(true);
                    }}
                  >
                    Edit Settings
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color={banner.is_enabled ? 'warning' : 'success'}
                    onClick={() => handleToggleEnabled(banner.id)}
                    disabled={banner.is_active}
                  >
                    {banner.is_enabled ? 'Disable for Users' : 'Enable for Users'}
                  </Button>
                  {!banner.is_active && (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleActivateBanner(banner.id)}
                    >
                      Set as Default
                    </Button>
                  )}
                </Stack>
              </CardContent>
            </GlassCard>
          ))}
        </Stack>
      )}

      <BannerSettingsDialog
        open={isSettingsDialogOpen}
        onClose={() => {
          setIsSettingsDialogOpen(false);
          setSelectedBanner(null);
        }}
        banner={selectedBanner}
        onSave={() => qc.invalidateQueries({ queryKey: ['banners'] })}
      />
    </Box>
  );
};

export default AdminBanners;
