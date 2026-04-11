import React from 'react';
import { Box, Container, Typography, Link as MuiLink, Divider } from '@mui/material';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'background.paper',
        pt: 6,
        pb: 4,
        mt: 'auto',
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
            mb: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
            © {year} Holy Flavors Archive
          </Typography>

          <Box sx={{ display: 'flex', gap: 3 }}>
            <MuiLink
              component={Link}
              to="/about"
              color="inherit"
              sx={{
                fontSize: '0.8rem',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Impressum
            </MuiLink>
            <MuiLink
              component={Link}
              to="/privacy"
              color="inherit"
              sx={{
                fontSize: '0.8rem',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Privacy Policy
            </MuiLink>
          </Box>
        </Box>
        <Divider sx={{ my: 2, opacity: 0.5 }} />
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          {t('nav.about')} • Fan Project
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;
