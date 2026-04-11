import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';

interface RatingBadgeProps {
  score: number;
  size?: 'small' | 'medium' | 'large';
  sx?: any;
}

const RatingBadge: React.FC<RatingBadgeProps> = ({ score, size = 'medium', sx }) => {
  const theme = useTheme();
  const isLarge = size === 'large';
  const isSmall = size === 'small';

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        px: isLarge ? 2 : isSmall ? 1 : 1.5,
        py: isLarge ? 0.5 : isSmall ? 0.2 : 0.4,
        borderRadius: 2,
        minWidth: 'fit-content',
        height: 'fit-content',
        boxShadow:
          theme.palette.mode === 'dark'
            ? '0 4px 12px rgba(0,0,0,0.4)'
            : '0 2px 8px rgba(0,0,0,0.1)',
        ...sx,
      }}
    >
      <Typography
        variant={isLarge ? 'h5' : isSmall ? 'caption' : 'subtitle1'}
        sx={{ fontWeight: '900', lineHeight: 1, display: 'flex', alignItems: 'center' }}
      >
        {typeof score === 'number' ? (isLarge ? score.toFixed(1) : score.toFixed(0)) : score}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          fontSize: isLarge ? '0.75rem' : isSmall ? '0.55rem' : '0.65rem',
          fontWeight: '900',
          opacity: 0.9,
          lineHeight: 1,
          mt: 0.2,
        }}
      >
        / 10
      </Typography>
    </Box>
  );
};

export default RatingBadge;
