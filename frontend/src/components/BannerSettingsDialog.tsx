import React, { useState } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, Button, 
    TextField, Box, Typography, Alert
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import api from '../api';

interface Banner {
    id: number;
    name: string;
    slug: string;
    description: string;
    is_active: boolean;
    settings: any;
}

interface BannerSettingsDialogProps {
    open: boolean;
    onClose: () => void;
    banner: Banner | null;
    onSave: () => void;
}

const BannerSettingsDialog: React.FC<BannerSettingsDialogProps> = ({ open, onClose, banner, onSave }) => {
    const { t } = useTranslation();
    const [settingsStr, setSettingsStr] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    React.useEffect(() => {
        if (banner) {
            setSettingsStr(JSON.stringify(banner.settings, null, 2));
            setError('');
        }
    }, [banner]);

    const handleSave = async () => {
        if (!banner) return;
        
        try {
            const parsedSettings = JSON.parse(settingsStr);
            setSaving(true);
            await api.patch(`banners/${banner.id}/`, { settings: parsedSettings });
            onSave();
            onClose();
        } catch (err: any) {
            setError(err instanceof SyntaxError ? 'Invalid JSON format' : (err.response?.data?.error || 'Failed to save settings'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                Edit Settings: {banner?.name}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                        Modify the JSON configuration for this banner model. Changes take effect immediately for all users.
                    </Typography>
                    
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    
                    <TextField
                        multiline
                        rows={12}
                        fullWidth
                        variant="outlined"
                        value={settingsStr}
                        onChange={(e) => setSettingsStr(e.target.value)}
                        placeholder='{ "key": "value" }'
                        sx={{ 
                            '& .MuiInputBase-root': { 
                                fontFamily: 'monospace',
                                fontSize: '0.85rem'
                            } 
                        }}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">{t('common.cancel')}</Button>
                <Button 
                    onClick={handleSave} 
                    variant="contained" 
                    disabled={saving}
                >
                    {saving ? t('common.loading') : t('common.save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default BannerSettingsDialog;
