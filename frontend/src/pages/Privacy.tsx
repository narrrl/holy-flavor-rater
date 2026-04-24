import React from 'react';
import {
  Typography,
  Box,
  Button,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { Link } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTitle } from '../hooks/useTitle';
import { useTranslation } from 'react-i18next';
import { PageShell, HeroBackdrop, GlassCard, SectionHeader } from '../components/ui';

const Privacy: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('de') ? 'de' : 'en';
  useTitle(t('privacy.title'));

  const handleLangChange = (_: React.MouseEvent<HTMLElement>, newLang: string | null) => {
    if (newLang) {
      i18n.changeLanguage(newLang);
    }
  };

  return (
    <PageShell hero={<HeroBackdrop variant="minimal" />}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
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

      <GlassCard intensity="subtle" sx={{ p: { xs: 2.5, sm: 4, md: 6 }, maxWidth: 900, width: '100%' }}>
        <SectionHeader title={t('privacy.title')} />
        <Typography variant="body1" paragraph sx={{ lineHeight: 1.7 }}>
          {t('privacy.intro')}
        </Typography>

        <Box sx={{ mt: 4 }}>
          <SectionHeader title={t('privacy.controllerTitle')} compact />
          <Typography variant="body2" paragraph sx={{ lineHeight: 1.7 }}>
            {t('privacy.controllerDesc')}
            <br />
            {import.meta.env.VITE_IMPRESSUM_NAME || '[Your Name]'}
            <br />
            {import.meta.env.VITE_IMPRESSUM_STREET || '[Your Street]'}
            <br />
            {import.meta.env.VITE_IMPRESSUM_CITY || '[Your City]'}
          </Typography>
        </Box>

        <Box sx={{ mt: 4 }}>
          <SectionHeader title={t('privacy.collectionTitle')} compact />

          {(
            [
              ['regTitle', 'regDesc'],
              ['ipTitle', 'ipDesc'],
              ['profileTitle', 'profileDesc'],
              ['socialTitle', 'socialDesc'],
              ['supportTitle', 'supportDesc'],
              ['personalizationTitle', 'personalizationDesc'],
              ['deletionTitle', 'deletionDesc'],
            ] as const
          ).map(([titleKey, descKey]) => (
            <Box key={titleKey} sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {t(`privacy.${titleKey}`)}
              </Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                {t(`privacy.${descKey}`)}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ mt: 4 }}>
          <SectionHeader title={t('privacy.transferTitle')} compact />
          <Typography variant="body2" paragraph sx={{ lineHeight: 1.7 }}>
            {t('privacy.transferDesc')}
          </Typography>
        </Box>

        <Box sx={{ mt: 4 }}>
          <SectionHeader title={t('privacy.rightsTitle')} compact />
          <Typography variant="body2" paragraph sx={{ lineHeight: 1.7 }}>
            {t('privacy.rightsDesc')} {import.meta.env.VITE_IMPRESSUM_EMAIL}
          </Typography>
        </Box>
      </GlassCard>
    </PageShell>
  );
};

export default Privacy;
