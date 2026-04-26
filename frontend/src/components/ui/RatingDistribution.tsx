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
  height = 48,
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
    return alpha(highColor, 0.3 + ratio * 0.65);
  };

  if (sum === 0) return null;

  return (
    <Box sx={{ width: '100%' }}>
      {showLegend && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mb: 0.75,
            color: 'text.secondary',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontSize: '0.6rem',
            lineHeight: 1,
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
          gap: 0.4,
          height,
          width: '100%',
        }}
      >
        {counts.map((c, i) => {
          const score = SCORES[i];
          const ratio = c / max;
          return (
            <Tooltip
              key={score}
              title={`${score} / 10 — ${c}`}
              placement="top"
              arrow
              disableInteractive
            >
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  alignItems: 'flex-end',
                  height: '100%',
                  cursor: 'default',
                }}
              >
                <Box
                  sx={{
                    width: '100%',
                    height: c > 0 ? `max(${ratio * 100}%, 6px)` : '3px',
                    bgcolor: c > 0 ? interpolate(score) : lowColor,
                    borderRadius: '2px',
                    transition: 'height 240ms ease, background-color 200ms ease',
                  }}
                />
              </Box>
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
};

export default RatingDistribution;
