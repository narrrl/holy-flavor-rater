import React, { useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../hooks/useToast';
import { useFlavorsList } from '../../api/queries/useFlavorsList';
import api from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../api/keys';

const AdminFlavors: React.FC = () => {
  const { t } = useTranslation();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const { data: flavors = [], isLoading } = useFlavorsList();

  const [keepFlavor, setKeepFlavor] = useState<any>(null);
  const [removeFlavor, setRemoveFlavor] = useState<any>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  const handleMerge = async () => {
    if (!keepFlavor || !removeFlavor) return;

    setIsMerging(true);
    try {
      await api.post('admin-custom/merge_flavors/', {
        keep_id: keepFlavor.id,
        remove_id: removeFlavor.id,
      });

      notify({
        message: t('admin.mergeSuccess', { defaultValue: 'Flavors merged successfully' }),
        severity: 'success',
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: queryKeys.flavors({ scope: 'all' }) });

      // Reset selection
      setKeepFlavor(null);
      setRemoveFlavor(null);
      setConfirmOpen(false);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message;
      notify({ message: `Error: ${errorMsg}`, severity: 'error' });
    } finally {
      setIsMerging(false);
    }
  };

  const canMerge = keepFlavor && removeFlavor && keepFlavor.id !== removeFlavor.id;

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
        {t('admin.manageFlavors', { defaultValue: 'Manage Flavors' })}
      </Typography>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('admin.mergeFlavors', { defaultValue: 'Merge Flavors' })}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t('admin.mergeFlavorsDesc', {
              defaultValue:
                'Combine two flavors into one. Ratings from the source flavor will be moved to the target flavor. If a user rated both, the more detailed review is kept.',
            })}
          </Typography>

          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 5 }}>
              <Autocomplete
                options={flavors}
                getOptionLabel={(option) => `${option.name} (${option.category_name})`}
                value={removeFlavor}
                onChange={(_, newValue) => setRemoveFlavor(newValue)}
                loading={isLoading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('admin.flavorToRemove', { defaultValue: 'Flavor to Remove (Source)' })}
                    helperText={t('admin.flavorToRemoveHint', {
                      defaultValue: 'This flavor will be DELETED',
                    })}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 2 }} sx={{ textAlign: 'center' }}>
              <Typography variant="h4">→</Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
              <Autocomplete
                options={flavors}
                getOptionLabel={(option) => `${option.name} (${option.category_name})`}
                value={keepFlavor}
                onChange={(_, newValue) => setKeepFlavor(newValue)}
                loading={isLoading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('admin.flavorToKeep', { defaultValue: 'Flavor to Keep (Target)' })}
                    helperText={t('admin.flavorToKeepHint', {
                      defaultValue: 'This flavor will PRESERVED',
                    })}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="contained"
                  color="warning"
                  disabled={!canMerge}
                  onClick={() => setConfirmOpen(true)}
                >
                  {t('admin.startMerge', { defaultValue: 'Start Merge' })}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onClose={() => !isMerging && setConfirmOpen(false)}>
        <DialogTitle>
          {t('admin.confirmMergeTitle', { defaultValue: 'Confirm Flavor Merge' })}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('admin.confirmMergeText', {
              defaultValue:
                'Are you sure you want to merge "{{remove}}" into "{{keep}}"? This action is irreversible. "{{remove}}" will be deleted, and all its ratings will be transferred.',
              remove: removeFlavor?.name,
              keep: keepFlavor?.name,
            })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={isMerging}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            onClick={handleMerge}
            color="warning"
            variant="contained"
            autoFocus
            disabled={isMerging}
          >
            {isMerging
              ? t('common.processing', { defaultValue: 'Processing...' })
              : t('admin.confirmMerge', { defaultValue: 'Merge Flavors' })}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminFlavors;
