import React, { useMemo } from 'react';
import { Box, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface RatingDistributionProps {
  distribution: Record<string, number>;
  total?: number;
  height?: number;
  showLegend?: boolean;
}

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const RatingDistribution: React.FC<RatingDistributionProps> = ({
  distribution,
  total,
  height = 56,
  showLegend = true,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();

  const counts = useMemo(() => SCORES.map((n) => distribution[String(n)] ?? 0), [distribution]);
  const sum = total ?? counts.reduce((a, b) => a + b, 0);
  const max = Math.max(...counts, 1);

  const lowColor = alpha(theme.palette.text.primary, 0.18);
  const highColor = theme.palette.primary.main;

  const interpolate = (n: number) => {
    const ratio = (n - 1) / 9;
    return alpha(highColor, 0.25 + ratio * 0.7);
  };

  if (sum === 0) return null;

  return (
    <Box sx={{ width: '100%', mb: 1 }}>
      {showLegend && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mb: 0.5,
            color: 'text.secondary',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontSize: '0.65rem',
          }}
        >
          {t('flavorDetail.ratingDistribution')}
        </Typography>
      )}
      <Box
        role="img"
        aria-label={t('flavorDetail.ratingDistribution')}
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 0.5,
          height,
          px: 0.5,
          py: 0.5,
          borderRadius: theme.tokens.radius.sm + 'px',
          bgcolor: alpha(theme.palette.text.primary, 0.04),
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {counts.map((c, i) => {
          const score = SCORES[i];
          const ratio = c / max;
          const minH = c > 0 ? 4 : 2;
          return (
            <Tooltip
              key={score}
              title={`${score} / 10 — ${c} ${c === 1 ? 'rating' : 'ratings'}`}
              placement="top"
              arrow
            >
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'flex-end',
                  height: '100%',
                  cursor: 'default',
                }}
              >
                <Box
                  sx={{
                    width: '100%',
                    height: c > 0 ? `calc(${ratio * 100}% + ${minH}px)` : `${minH}px`,
                    minHeight: minH,
                    bgcolor: c > 0 ? interpolate(score) : lowColor,
                    borderRadius: '3px',
                    transition: 'height 240ms ease, background-color 200ms ease',
                  }}
                />
              </Box>
            </Tooltip>
          );
        })}
      </Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mt: 0.25,
          px: 0.5,
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
          1
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
          10
        </Typography>
      </Box>
    </Box>
  );
};

export default RatingDistribution;
