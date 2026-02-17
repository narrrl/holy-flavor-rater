import React, { useState } from 'react';
import { Typography, Box, Container, Paper, Button, ToggleButton, ToggleButtonGroup, useMediaQuery } from '@mui/material';
import { Link } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTitle } from '../hooks/useTitle';

const Privacy: React.FC = () => {
  useTitle('Privacy Policy / Datenschutzerklärung');
  const [lang, setLang] = useState<'de' | 'en'>('de');
  const isMobile = useMediaQuery('(max-width:600px)');

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 }, px: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Button 
            variant="outlined" 
            component={Link} 
            to="/" 
            startIcon={<ArrowBackIcon />}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            {lang === 'de' ? 'Zurück' : 'Back'}
          </Button>

          <ToggleButtonGroup
            value={lang}
            exclusive
            onChange={(_, v) => v && setLang(v)}
            size="small"
          >
            <ToggleButton value="de">Deutsch</ToggleButton>
            <ToggleButton value="en">English</ToggleButton>
          </ToggleButtonGroup>
      </Box>

      <Paper sx={{ p: { xs: 2.5, sm: 4, md: 6 }, borderRadius: 4, overflow: 'hidden' }}>
        {lang === 'de' ? (
            <Box>
                <Typography variant={isMobile ? "h4" : "h3"} gutterBottom sx={{ fontWeight: 'bold' }}>Datenschutzerklärung</Typography>
                <Typography variant="body1" paragraph sx={{ lineHeight: 1.7 }}>
                    Der Schutz Ihrer persönlichen Daten ist uns ein wichtiges Anliegen. Nachfolgend informieren wir Sie 
                    über die Verarbeitung Ihrer Daten auf unserer Webseite gemäß den Anforderungen der DSGVO.
                </Typography>

                <Typography variant={isMobile ? "h6" : "h5"} gutterBottom sx={{ mt: 4, fontWeight: 'bold' }}>1. Verantwortlicher</Typography>
                <Typography variant="body2" paragraph sx={{ lineHeight: 1.7 }}>
                    Verantwortlich für die Datenverarbeitung auf dieser Webseite ist:<br />
                    {import.meta.env.VITE_IMPRESSUM_NAME || '[Ihr Name]'}<br />
                    {import.meta.env.VITE_IMPRESSUM_STREET || '[Ihre Straße]'}<br />
                    {import.meta.env.VITE_IMPRESSUM_CITY || '[Ihre Stadt]'}
                </Typography>

                <Typography variant={isMobile ? "h6" : "h5"} gutterBottom sx={{ mt: 4, fontWeight: 'bold' }}>2. Erfassung und Speicherung personenbezogener Daten</Typography>
                <Typography variant="body2" paragraph sx={{ lineHeight: 1.7 }}>
                    <strong>Registrierung:</strong> Wenn Sie ein Konto erstellen, speichern wir Ihren Benutzernamen, 
                    Ihre E-Mail-Adresse und Ihr Passwort (verschlüsselt). Diese Daten werden zur Bereitstellung der 
                    Community-Funktionen (Bewertungen, Folgen von Nutzern) verwendet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
                </Typography>
                <Typography variant="body2" paragraph sx={{ lineHeight: 1.7 }}>
                    <strong>Öffentliches Profil:</strong> Ihr Benutzername, Ihr Avatar und Ihre Bewertungen sind für 
                    andere Nutzer öffentlich sichtbar. Sie können diese Daten jederzeit in den Einstellungen ändern oder löschen.
                </Typography>
                <Typography variant="body2" paragraph sx={{ lineHeight: 1.7 }}>
                    <strong>Kontolöschung:</strong> Sie können Ihr Konto und alle damit verbundenen Daten jederzeit 
                    in den Kontoeinstellungen dauerhaft löschen. Zur Sicherheit ist hierfür eine Verifizierung per E-Mail-Code erforderlich.
                </Typography>

                <Typography variant={isMobile ? "h6" : "h5"} gutterBottom sx={{ mt: 4, fontWeight: 'bold' }}>3. Datenübermittlung an Dritte</Typography>
                <Typography variant="body2" paragraph sx={{ lineHeight: 1.7 }}>
                    Wir geben Ihre Daten nicht ohne Ihre ausdrückliche Einwilligung an Dritte weiter, es sei denn, 
                    dies ist zur Vertragserfüllung oder zur Erfüllung gesetzlicher Verpflichtungen erforderlich.
                </Typography>

                <Typography variant={isMobile ? "h6" : "h5"} gutterBottom sx={{ mt: 4, fontWeight: 'bold' }}>4. Ihre Rechte</Typography>
                <Typography variant="body2" paragraph sx={{ lineHeight: 1.7 }}>
                    Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO) 
                    und Einschränkung der Verarbeitung Ihrer Daten. Bitte kontaktieren Sie uns hierzu unter: 
                    {import.meta.env.VITE_IMPRESSUM_EMAIL}
                </Typography>
            </Box>
        ) : (
            <Box>
                <Typography variant={isMobile ? "h4" : "h3"} gutterBottom sx={{ fontWeight: 'bold' }}>Privacy Policy</Typography>
                <Typography variant="body1" paragraph sx={{ lineHeight: 1.7 }}>
                    Protecting your personal data is a top priority for us. Below we inform you about the processing 
                    of your data on our website in accordance with the requirements of the GDPR.
                </Typography>

                <Typography variant={isMobile ? "h6" : "h5"} gutterBottom sx={{ mt: 4, fontWeight: 'bold' }}>1. Controller</Typography>
                <Typography variant="body2" paragraph sx={{ lineHeight: 1.7 }}>
                    The party responsible for data processing on this website is:<br />
                    {import.meta.env.VITE_IMPRESSUM_NAME || '[Your Name]'}<br />
                    {import.meta.env.VITE_IMPRESSUM_STREET || '[Your Street]'}<br />
                    {import.meta.env.VITE_IMPRESSUM_CITY || '[Your City]'}
                </Typography>

                <Typography variant={isMobile ? "h6" : "h5"} gutterBottom sx={{ mt: 4, fontWeight: 'bold' }}>2. Collection and Storage of Personal Data</Typography>
                <Typography variant="body2" paragraph sx={{ lineHeight: 1.7 }}>
                    <strong>Registration:</strong> When you create an account, we store your username, email address, 
                    and password (encrypted). This data is used to provide community features (ratings, following users). 
                    The legal basis is Art. 6 Para. 1 lit. b GDPR.
                </Typography>
                <Typography variant="body2" paragraph sx={{ lineHeight: 1.7 }}>
                    <strong>Public Profile:</strong> Your username, avatar, and ratings are publicly visible to other users. 
                    You can change or delete this data at any time in your settings.
                </Typography>
                <Typography variant="body2" paragraph sx={{ lineHeight: 1.7 }}>
                    <strong>Account Deletion:</strong> You can permanently delete your account and all associated data 
                    at any time in your account settings. For security reasons, this requires verification via an email code.
                </Typography>

                <Typography variant={isMobile ? "h6" : "h5"} gutterBottom sx={{ mt: 4, fontWeight: 'bold' }}>3. Data Transfer to Third Parties</Typography>
                <Typography variant="body2" paragraph sx={{ lineHeight: 1.7 }}>
                    We do not pass your data on to third parties without your express consent, unless this is necessary 
                    to fulfill a contract or a legal obligation.
                </Typography>

                <Typography variant={isMobile ? "h6" : "h5"} gutterBottom sx={{ mt: 4, fontWeight: 'bold' }}>4. Your Rights</Typography>
                <Typography variant="body2" paragraph sx={{ lineHeight: 1.7 }}>
                    You have the right to information (Art. 15 GDPR), correction (Art. 16 GDPR), deletion (Art. 17 GDPR), 
                    and restriction of the processing of your data. Please contact us at: 
                    {import.meta.env.VITE_IMPRESSUM_EMAIL}
                </Typography>
            </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Privacy;
