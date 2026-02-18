import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, Button, 
    TextField, Box, Typography, Alert, Slider, Stack,
    Tooltip, IconButton
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useTranslation } from 'react-i18next';
import api from '../api';

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
    settings: any;
    schema: BannerSettingSchema[];
}

interface BannerSettingsDialogProps {
    open: boolean;
    onClose: () => void;
    banner: Banner | null;
    onSave: () => void;
}

const BannerSettingsDialog: React.FC<BannerSettingsDialogProps> = ({ open, onClose, banner, onSave }) => {
    const { t } = useTranslation();
    const [localSettings, setLocalSettings] = useState<any>({});
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (banner) {
            setLocalSettings(banner.settings || {});
            setError('');
        }
    }, [banner]);

    const handleSave = async () => {
        if (!banner) return;
        
        try {
            setSaving(true);
            await api.patch(`banners/${banner.id}/`, { settings: localSettings });
            onSave();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const updateSetting = (key: string, value: any) => {
        setLocalSettings((prev: any) => ({
            ...prev,
            [key]: value
        }));
    };

    const renderField = (schema: BannerSettingSchema) => {
        const value = localSettings[schema.key] ?? '';

        return (
            <Box key={schema.key} sx={{ mb: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {schema.label}
                    </Typography>
                    {schema.description && (
                        <Tooltip title={schema.description} arrow>
                            <IconButton size="small" sx={{ p: 0.5 }}>
                                <HelpOutlineIcon sx={{ fontSize: '1rem', opacity: 0.6 }} />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>

                {schema.type === 'slider' ? (
                    <Box sx={{ px: 1 }}>
                        <Slider
                            value={Number(value)}
                            min={schema.min ?? 0}
                            max={schema.max ?? 100}
                            step={schema.step ?? 1}
                            onChange={(_, val) => updateSetting(schema.key, val)}
                            valueLabelDisplay="auto"
                        />
                    </Box>
                ) : schema.type === 'number' ? (
                    <TextField
                        type="number"
                        fullWidth
                        size="small"
                        value={value}
                        inputProps={{ min: schema.min, max: schema.max, step: schema.step }}
                        onChange={(e) => updateSetting(schema.key, Number(e.target.value))}
                    />
                ) : (
                    <TextField
                        fullWidth
                        size="small"
                        value={value}
                        onChange={(e) => updateSetting(schema.key, e.target.value)}
                    />
                )}
                
                {schema.description && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {schema.description}
                    </Typography>
                )}
            </Box>
        );
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 'bold' }}>
                Banner Settings: {banner?.name}
            </DialogTitle>
            <DialogContent dividers>
                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
                
                {banner?.schema && banner.schema.length > 0 ? (
                    <Box sx={{ mt: 1 }}>
                        {banner.schema.map(field => renderField(field))}
                    </Box>
                ) : (
                    <Typography color="text.secondary" sx={{ fontStyle: 'italic', py: 2 }}>
                        No dynamic schema defined for this banner. Please use the JSON editor or check the banner configuration files.
                    </Typography>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} color="inherit">{t('common.cancel')}</Button>
                <Button 
                    onClick={handleSave} 
                    variant="contained" 
                    disabled={saving}
                    sx={{ px: 4 }}
                >
                    {saving ? t('common.loading') : t('common.save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default BannerSettingsDialog;
