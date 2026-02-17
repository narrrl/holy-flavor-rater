import React from 'react';
import { Typography, Box, Container, Paper, Divider, Button, useMediaQuery } from '@mui/material';
import { Link } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslation } from 'react-i18next';
import { useTitle } from '../hooks/useTitle';

const About: React.FC = () => {
  const { t } = useTranslation();
  useTitle(t('nav.about'));
  const isMobile = useMediaQuery('(max-width:600px)');

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 }, px: { xs: 2, sm: 3 } }}>
      <Button 
        variant="outlined" 
        component={Link} 
        to="/" 
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 4, textTransform: 'none', borderRadius: 2 }}
      >
        {t('common.backToArchive')}
      </Button>

      <Paper sx={{ p: { xs: 2.5, sm: 4, md: 6 }, borderRadius: 4, overflow: 'hidden' }}>
        <Typography variant={isMobile ? "h4" : "h3"} gutterBottom sx={{ fontWeight: 'bold' }}>{t('about.title')}</Typography>
        <Typography variant="body1" paragraph sx={{ fontSize: { xs: '1rem', md: '1.1rem' }, lineHeight: 1.8 }}>
            {t('about.mission')}
        </Typography>
        
        <Box sx={{ my: 4 }}>
            <Typography variant={isMobile ? "h6" : "h5"} gutterBottom sx={{ fontWeight: 'bold' }}>{t('about.canDoTitle')}</Typography>
            <Typography component="ul" sx={{ lineHeight: 2, pl: 2 }}>
                <li>{t('about.featureExplore')}</li>
                <li>{t('about.featureRate')}</li>
                <li>{t('about.featureCommunity')}</li>
                <li>{t('about.featureProfile')}</li>
            </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" paragraph>
            {t('about.disclaimer')}
        </Typography>

        <Divider sx={{ my: { xs: 4, md: 6 } }} />

        <Typography variant={isMobile ? "h5" : "h4"} gutterBottom sx={{ fontWeight: 'bold' }}>{t('about.impressumTitle')}</Typography>
        <Typography variant="body2" sx={{ lineHeight: 2 }}>
            <strong>{t('about.legalInfo')}</strong><br />
            {import.meta.env.VITE_IMPRESSUM_NAME || '[Your Name or Project Name]'}<br />
            {import.meta.env.VITE_IMPRESSUM_STREET || '[Your Street Address]'}<br />
            {import.meta.env.VITE_IMPRESSUM_CITY || '[Postal Code and City]'}<br />
            Germany
        </Typography>

        <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{t('about.contact')}:</Typography>
            <Typography variant="body2">
                E-Mail: {import.meta.env.VITE_IMPRESSUM_EMAIL || '[Your Support Email Address]'}<br />
                {import.meta.env.VITE_IMPRESSUM_PHONE && (
                    <>Telefon: {import.meta.env.VITE_IMPRESSUM_PHONE}<br /></>
                )}
                Internet: holy.narl.io
            </Typography>
        </Box>

        <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{t('about.responsible')}</Typography>
            <Typography variant="body2">
                {import.meta.env.VITE_IMPRESSUM_NAME || '[Your Name]'}<br />
                {import.meta.env.VITE_IMPRESSUM_STREET || '[Your Street Address]'}<br />
                {import.meta.env.VITE_IMPRESSUM_CITY || '[Postal Code and City]'}
            </Typography>
        </Box>

        <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>{t('about.disclaimerTitle')}</Typography>
            <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 2, lineHeight: 1.6 }}>
                <strong>Haftung für Inhalte:</strong> Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte 
                auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter 
                jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen.
            </Typography>
            <Typography variant="caption" color="text.secondary" component="p" sx={{ lineHeight: 1.6 }}>
                <strong>Urheberrecht:</strong> Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten 
                unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der 
                Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors.
            </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default About;
