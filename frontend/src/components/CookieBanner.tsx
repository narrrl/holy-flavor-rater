import React, { useState, useEffect } from 'react';
import { 
    Paper, 
    Typography, 
    Button, 
    Stack, 
    alpha,
    Slide
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { CatppuccinTheme } from '../theme';

interface CookieBannerProps {
    onThemeChange: (newTheme: CatppuccinTheme) => void;
    currentTheme: CatppuccinTheme;
}

const CookieBanner: React.FC<CookieBannerProps> = ({ onThemeChange, currentTheme }) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookie-consent');
        if (!consent) {
            setOpen(true);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookie-consent', 'true');
        setOpen(false);
    };

    const handleToggleTheme = () => {
        const newTheme = currentTheme === 'holy_light' ? 'holy_dark' : 'holy_light';
        onThemeChange(newTheme);
    };

    if (!open) return null;

    return (
        <Slide direction="up" in={open} mountOnEnter unmountOnExit>
            <Paper 
                elevation={10} 
                sx={{ 
                    position: 'fixed', 
                    bottom: { xs: 16, sm: 24 }, 
                    left: { xs: 16, sm: 24 }, 
                    right: { xs: 16, sm: 24 }, 
                    maxWidth: 600, 
                    margin: '0 auto',
                    zIndex: 3000,
                    p: 3,
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: 'primary.main',
                    bgcolor: (theme) => alpha(theme.palette.background.paper, 0.95),
                    backdropFilter: 'blur(10px)',
                }}
            >
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {t('cookieBanner.title')} 🍪
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                    {t('cookieBanner.description')}
                </Typography>
                
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end">
                    <Button 
                        variant="outlined" 
                        color="primary" 
                        onClick={handleToggleTheme}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                    >
                        {currentTheme === 'holy_light' ? t('cookieBanner.switchToDark') : t('cookieBanner.switchToLight')}
                    </Button>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={handleAccept}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold', px: 4 }}
                    >
                        {t('cookieBanner.accept')}
                    </Button>
                </Stack>
            </Paper>
        </Slide>
    );
};

export default CookieBanner;
