import React from 'react';
import {
  Typography,
  Box,
  Container,
  Paper,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
} from '@mui/material';
import { Link } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTitle } from '../hooks/useTitle';
import { useTranslation } from 'react-i18next';

const Privacy: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('de') ? 'de' : 'en';
  useTitle(t('privacy.title'));
  const isMobile = useMediaQuery('(max-width:600px)');

  const handleLangChange = (_: any, newLang: string | null) => {
    if (newLang) {
      i18n.changeLanguage(newLang);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 }, px: { xs: 2, sm: 3 } }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Button
          variant="outlined"
          component={Link}
          to="/"
          startIcon={<ArrowBackIcon />}
          sx={{ textTransform: 'none', borderRadius: 2 }}
        >
          {t('common.back')}
        </Button>

        <ToggleButtonGroup value={lang} exclusive onChange={handleLangChange} size="small">
          <ToggleButton value="de">Deutsch</ToggleButton>
          <ToggleButton value="en">English</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Paper sx={{ p: { xs: 2.5, sm: 4, md: 6 }, borderRadius: 4, overflow: 'hidden' }}>
        <Typography variant={isMobile ? 'h4' : 'h3'} gutterBottom sx={{ fontWeight: 'bold' }}>
          {t('privacy.title')}
        </Typography>
        <Typography variant="body1" paragraph sx={{ lineHeight: 1.7 }}>
          {t('privacy.intro')}
        </Typography>

        <Typography
          variant={isMobile ? 'h6' : 'h5'}
          gutterBottom
          sx={{ mt: 4, fontWeight: 'bold' }}
        >
          {t('privacy.controllerTitle')}
        </Typography>
        <Typography variant="body2" paragraph sx={{ lineHeight: 1.7 }}>
          {t('privacy.controllerDesc')}
          <br />
          {import.meta.env.VITE_IMPRESSUM_NAME || '[Your Name]'}
          <br />
          {import.meta.env.VITE_IMPRESSUM_STREET || '[Your Street]'}
          <br />
          {import.meta.env.VITE_IMPRESSUM_CITY || '[Your City]'}
        </Typography>

        <Typography
          variant={isMobile ? 'h6' : 'h5'}
          gutterBottom
          sx={{ mt: 4, fontWeight: 'bold' }}
        >
          {t('privacy.collectionTitle')}
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {t('privacy.regTitle')}
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
            {t('privacy.regDesc')}
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {t('privacy.ipTitle')}
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
            {t('privacy.ipDesc')}
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {t('privacy.profileTitle')}
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
            {t('privacy.profileDesc')}
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {t('privacy.socialTitle')}
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
            {t('privacy.socialDesc')}
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {t('privacy.supportTitle')}
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
            {t('privacy.supportDesc')}
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {t('privacy.personalizationTitle')}
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
            {t('privacy.personalizationDesc')}
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {t('privacy.deletionTitle')}
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
            {t('privacy.deletionDesc')}
          </Typography>
        </Box>

        <Typography
          variant={isMobile ? 'h6' : 'h5'}
          gutterBottom
          sx={{ mt: 4, fontWeight: 'bold' }}
        >
          {t('privacy.transferTitle')}
        </Typography>
        <Typography variant="body2" paragraph sx={{ lineHeight: 1.7 }}>
          {t('privacy.transferDesc')}
        </Typography>

        <Typography
          variant={isMobile ? 'h6' : 'h5'}
          gutterBottom
          sx={{ mt: 4, fontWeight: 'bold' }}
        >
          {t('privacy.rightsTitle')}
        </Typography>
        <Typography variant="body2" paragraph sx={{ lineHeight: 1.7 }}>
          {t('privacy.rightsDesc')} {import.meta.env.VITE_IMPRESSUM_EMAIL}
        </Typography>
      </Paper>
    </Container>
  );
};

export default Privacy;
