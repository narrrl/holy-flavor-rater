import React from 'react';
import { Typography, Box, Button, Divider } from '@mui/material';
import { Link } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslation } from 'react-i18next';
import { useTitle } from '../hooks/useTitle';
import { PageShell, HeroBackdrop, GlassCard, SectionHeader } from '../components/ui';

const About: React.FC = () => {
  const { t } = useTranslation();
  useTitle(t('nav.about'));

  return (
    <PageShell hero={<HeroBackdrop variant="minimal" />}>
      <Button
        variant="outlined"
        component={Link}
        to="/"
        startIcon={<ArrowBackIcon />}
        sx={{ alignSelf: 'flex-start', textTransform: 'none', borderRadius: 2 }}
      >
        {t('common.backToArchive')}
      </Button>

      <GlassCard intensity="subtle" sx={{ p: { xs: 2.5, sm: 4, md: 6 }, maxWidth: 900, width: '100%' }}>
        <SectionHeader title={t('about.title')} compact />
        <Typography
          variant="body1"
          paragraph
          sx={{ fontSize: { xs: '1rem', md: '1.1rem' }, lineHeight: 1.8 }}
        >
          {t('about.mission')}
        </Typography>

        <Box sx={{ my: 4 }}>
          <SectionHeader title={t('about.canDoTitle')} compact />
          <Typography component="ul" sx={{ lineHeight: 2, pl: 2, m: 0 }}>
            <li>{t('about.featureExplore')}</li>
            <li>{t('about.featureRate')}</li>
            <li>{t('about.featureCommunity')}</li>
            <li>{t('about.featureProfile')}</li>
            <li>{t('about.featurePersonalize')}</li>
            <li>{t('about.featureEngage')}</li>
            <li>{t('about.featureSupport')}</li>
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" paragraph>
          {t('about.disclaimer')}
        </Typography>

        <Divider sx={{ my: { xs: 4, md: 6 } }} />

        <SectionHeader title={t('about.impressumTitle')} compact />
        <Typography variant="body2" sx={{ lineHeight: 2 }}>
          <strong>{t('about.legalInfo')}</strong>
          <br />
          {import.meta.env.VITE_IMPRESSUM_NAME || '[Your Name or Project Name]'}
          <br />
          {import.meta.env.VITE_IMPRESSUM_STREET || '[Your Street Address]'}
          <br />
          {import.meta.env.VITE_IMPRESSUM_CITY || '[Postal Code and City]'}
          <br />
          {t('about.region')}
        </Typography>

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            {t('about.contact')}:
          </Typography>
          <Typography variant="body2">
            E-Mail: {import.meta.env.VITE_IMPRESSUM_EMAIL || '[Your Support Email Address]'}
            <br />
            {import.meta.env.VITE_IMPRESSUM_PHONE && (
              <>
                Telefon: {import.meta.env.VITE_IMPRESSUM_PHONE}
                <br />
              </>
            )}
            Internet: holy.narl.io
          </Typography>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            {t('about.responsible')}
          </Typography>
          <Typography variant="body2">
            {import.meta.env.VITE_IMPRESSUM_NAME || '[Your Name]'}
            <br />
            {import.meta.env.VITE_IMPRESSUM_STREET || '[Your Street Address]'}
            <br />
            {import.meta.env.VITE_IMPRESSUM_CITY || '[Postal Code and City]'}
          </Typography>
        </Box>

        <Box sx={{ mt: 4 }}>
          <SectionHeader title={t('about.disclaimerTitle')} compact />
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 2, lineHeight: 1.6 }}>
            <strong>{t('about.liabilityContentTitle')}</strong> {t('about.liabilityContentDesc')}
          </Typography>
          <Typography variant="caption" color="text.secondary" component="p" sx={{ lineHeight: 1.6 }}>
            <strong>{t('about.copyrightTitle')}</strong> {t('about.copyrightDesc')}
          </Typography>
        </Box>
      </GlassCard>
    </PageShell>
  );
};

export default About;
