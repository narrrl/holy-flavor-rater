import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';

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
        <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: 'primary.main',
            px: isLarge ? 2.5 : (isSmall ? 1 : 1.5), 
            py: isLarge ? 0.8 : (isSmall ? 0.2 : 0.5), 
            borderRadius: isLarge ? 2.5 : (isSmall ? 1 : 2),
            minWidth: isLarge ? 70 : (isSmall ? 40 : 50),
            border: '1px solid',
            borderColor: alpha(theme.palette.primary.main, 0.2),
            lineHeight: 1,
            ...sx
        }}>
            <Typography 
                variant={isLarge ? "h5" : (isSmall ? "caption" : "subtitle1")} 
                sx={{ fontWeight: '900', lineHeight: 1 }}
            >
                {typeof score === 'number' ? score.toFixed(isLarge ? 1 : 0) : score}
            </Typography>
            <Typography 
                variant="caption" 
                sx={{ 
                    fontSize: isLarge ? '0.7rem' : (isSmall ? '0.5rem' : '0.6rem'), 
                    fontWeight: 'bold', 
                    opacity: 0.8,
                    mt: 0.2
                }}
            >
                / 10
            </Typography>
        </Box>
    );
};

export default RatingBadge;
