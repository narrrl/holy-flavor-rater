import React from 'react';
import { Typography, Box, Container, Paper, Divider, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTitle } from '../hooks/useTitle';

const About: React.FC = () => {
  useTitle('About & Impressum');

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Button 
        variant="outlined" 
        component={Link} 
        to="/" 
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 4, textTransform: 'none', borderRadius: 2 }}
      >
        Back to Archive
      </Button>

      <Paper sx={{ p: { xs: 3, md: 6 }, borderRadius: 4 }}>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>About This Project</Typography>
        <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', lineHeight: 1.8 }}>
            <strong>Holy Flavors Archive</strong> is a community-driven project dedicated to documenting and rating 
            the vast world of Holy Energy products. Our goal is to create a definitive, high-density catalog of every 
            flavor ever released—including legacy and limited editions.
        </Typography>
        
        <Box sx={{ my: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>What you can do here:</Typography>
            <Typography component="ul" sx={{ lineHeight: 2 }}>
                <li><strong>Explore:</strong> Find details on any Holy Energy, Iced Tea, or Milkshake product.</li>
                <li><strong>Rate:</strong> Share your honest opinion and score flavors from 1 to 10.</li>
                <li><strong>Community:</strong> Follow other fans, see their latest tests, and discover new favorites together.</li>
                <li><strong>Taste Profile:</strong> Build your own personal tiered leaderboard to share with the world.</li>
            </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" paragraph>
            This website is a fan project and is not officially affiliated with, authorized, maintained, sponsored, 
            or endorsed by HOLY Energy GmbH. All product names, logos, and brands are property of their respective owners.
        </Typography>

        <Divider sx={{ my: 6 }} />

        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>Impressum</Typography>
        <Typography variant="body2" sx={{ lineHeight: 2 }}>
            <strong>Angaben gemäß § 5 TMG:</strong><br />
            {import.meta.env.VITE_IMPRESSUM_NAME || '[Your Name or Project Name]'}<br />
            {import.meta.env.VITE_IMPRESSUM_STREET || '[Your Street Address]'}<br />
            {import.meta.env.VITE_IMPRESSUM_CITY || '[Postal Code and City]'}<br />
            Germany
        </Typography>

        <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Kontakt:</Typography>
            <Typography variant="body2">
                E-Mail: {import.meta.env.VITE_IMPRESSUM_EMAIL || '[Your Support Email Address]'}<br />
                Internet: holy.narl.io
            </Typography>
        </Box>

        <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV:</Typography>
            <Typography variant="body2">
                {import.meta.env.VITE_IMPRESSUM_NAME || '[Your Name]'}<br />
                {import.meta.env.VITE_IMPRESSUM_STREET || '[Your Street Address]'}<br />
                {import.meta.env.VITE_IMPRESSUM_CITY || '[Postal Code and City]'}
            </Typography>
        </Box>

        <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>Haftungsausschluss (Disclaimer)</Typography>
            <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 2 }}>
                <strong>Haftung für Inhalte:</strong> Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte 
                auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter 
                jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen.
            </Typography>
            <Typography variant="caption" color="text.secondary" component="p">
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
