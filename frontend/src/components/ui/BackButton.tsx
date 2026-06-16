import React from 'react';
import { Button } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export interface BackButtonProps {
  /**
   * Fixed destination. When set, the button always navigates here (rendered as a
   * router Link). When omitted, it goes back in history, falling back to `/`.
   */
  to?: string;
  sx?: SxProps<Theme>;
}

const baseSx: SxProps<Theme> = {
  alignSelf: 'flex-start',
  borderRadius: 2,
  textTransform: 'none',
  fontWeight: 700,
  color: 'text.secondary',
};

/**
 * Shared "go back" button. Replaces the per-page copies that drifted in styling
 * and label logic. With `to`, it's a static link; otherwise it pops history and
 * falls back to home, with the label reflecting which it'll do.
 */
export const BackButton: React.FC<BackButtonProps> = ({ to, sx }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canGoBack = typeof window !== 'undefined' && window.history.length > 1;

  const handleGoBack = () => {
    if (canGoBack) navigate(-1);
    else navigate('/');
  };

  const label = to || !canGoBack ? t('common.backToHome') : t('common.back');

  const linkProps = to ? { component: Link as React.ElementType, to } : { onClick: handleGoBack };

  return (
    <Button
      variant="outlined"
      startIcon={<ArrowBackIcon />}
      sx={{ ...baseSx, ...sx }}
      {...linkProps}
    >
      {label}
    </Button>
  );
};

export default BackButton;
