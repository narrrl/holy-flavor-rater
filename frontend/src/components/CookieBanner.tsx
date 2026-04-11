import React, { useState, useEffect } from 'react';
import {
  Typography,
  Button,
  alpha,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Box,
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

  return (
    <Dialog
      open={open}
      onClose={() => {}} // Disable closing by clicking backdrop
      disableEscapeKeyDown
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'primary.main',
          bgcolor: (theme) => alpha(theme.palette.background.paper, 0.98),
          backdropFilter: 'blur(10px)',
          boxShadow: (theme) => `0 20px 50px ${alpha(theme.palette.primary.main, 0.2)}`,
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 'bold', fontSize: '1.5rem', pt: 3 }}>
        {t('cookieBanner.title')} 🍪
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.7 }}>
          {t('cookieBanner.description')}
        </Typography>
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
            mt: 2,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 'bold', display: 'block', mb: 1, textTransform: 'uppercase' }}
          >
            Technical Details:
          </Typography>
          <Typography variant="caption" color="text.secondary">
            • Session ID: Required for login & authentication.
            <br />
            • CSRF Token: Protects your account from malicious attacks.
            <br />• Preference Store: Remembers your theme and language choices.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3, gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
        <Button
          fullWidth
          variant="outlined"
          color="primary"
          onClick={handleToggleTheme}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold', m: '0 !important' }}
        >
          {currentTheme === 'holy_light'
            ? t('cookieBanner.switchToDark')
            : t('cookieBanner.switchToLight')}
        </Button>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          onClick={handleAccept}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 'bold',
            px: 4,
            m: '0 !important',
          }}
        >
          {t('cookieBanner.accept')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CookieBanner;
