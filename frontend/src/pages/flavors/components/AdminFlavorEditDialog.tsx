import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  FormControlLabel,
  Switch,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useUpdateFlavor } from '../../../api/mutations/useFlavorMutations';
import { useToast } from '../../../hooks/useToast';
import type { FlavorDetailData } from '../../../api/queries/useFlavorDetail';

export interface AdminFlavorEditDialogProps {
  open: boolean;
  onClose: () => void;
  flavorId: string;
  flavor: FlavorDetailData;
}

/**
 * Superuser-only product editor. Lifted out of the product card (UX audit #6) so
 * the read view stays clean — admin affordances live in a focused dialog instead
 * of swapping the card body inline.
 */
const AdminFlavorEditDialog: React.FC<AdminFlavorEditDialogProps> = ({
  open,
  onClose,
  flavorId,
  flavor,
}) => {
  const { t } = useTranslation();
  const { notify } = useToast();
  const updateFlavor = useUpdateFlavor();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [data, setData] = useState({
    name: flavor.name,
    description: flavor.description,
    shop_url: flavor.shop_url || '',
    is_available: flavor.is_available,
    is_legacy: flavor.is_legacy,
  });

  // Re-sync form when the dialog reopens or the underlying flavor changes.
  useEffect(() => {
    if (open) {
      setData({
        name: flavor.name,
        description: flavor.description,
        shop_url: flavor.shop_url || '',
        is_available: flavor.is_available,
        is_legacy: flavor.is_legacy,
      });
    }
  }, [open, flavor]);

  const handleSave = async () => {
    try {
      await updateFlavor.mutateAsync({ id: flavorId, data });
      onClose();
    } catch {
      notify({ message: t('flavorDetail.adminUpdateFailed'), severity: 'error' });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      setUploadingImage(true);
      await updateFlavor.mutateAsync({ id: flavorId, data: formData, isFormData: true });
    } catch {
      notify({ message: t('flavorDetail.imageUploadFailed'), severity: 'error' });
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('flavorDetail.editProductAdmin')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label={t('flavorDetail.nameLabel')}
            fullWidth
            size="small"
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
          />
          <TextField
            label={t('flavorDetail.descriptionLabel')}
            fullWidth
            size="small"
            multiline
            rows={4}
            value={data.description}
            onChange={(e) => setData({ ...data, description: e.target.value })}
          />
          <TextField
            label={t('flavorDetail.shopUrlLabel')}
            fullWidth
            size="small"
            value={data.shop_url}
            onChange={(e) => setData({ ...data, shop_url: e.target.value })}
          />
          <Button variant="outlined" component="label" size="small" disabled={uploadingImage}>
            {uploadingImage ? t('flavorDetail.uploading') : t('flavorDetail.uploadImage')}
            <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
          </Button>
          <FormControlLabel
            control={
              <Switch
                checked={data.is_available}
                onChange={(e) => setData({ ...data, is_available: e.target.checked })}
              />
            }
            label={t('flavorDetail.inStock')}
          />
          <FormControlLabel
            control={
              <Switch
                checked={data.is_legacy}
                onChange={(e) => setData({ ...data, is_legacy: e.target.checked })}
              />
            }
            label={t('flavorDetail.legacyLimited')}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={updateFlavor.isPending}
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminFlavorEditDialog;
