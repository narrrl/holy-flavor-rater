import React, { useRef } from 'react';
import { Box, ButtonBase, Typography, alpha, useTheme } from '@mui/material';

type Size = 'small' | 'medium' | 'large';

export interface ScoreInputProps {
  value: number | null;
  onChange: (value: number) => void;
  size?: Size;
  disabled?: boolean;
  ariaLabel?: string;
  showReadout?: boolean;
}

const sizeMap: Record<Size, { tile: number; font: string; readoutVariant: 'h6' | 'h5' | 'h4' }> = {
  small: { tile: 32, font: '0.85rem', readoutVariant: 'h6' },
  medium: { tile: 38, font: '0.95rem', readoutVariant: 'h5' },
  large: { tile: 44, font: '1.1rem', readoutVariant: 'h4' },
};

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const ScoreInput: React.FC<ScoreInputProps> = ({
  value,
  onChange,
  size = 'large',
  disabled = false,
  ariaLabel,
  showReadout = true,
}) => {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const dims = sizeMap[size];

  const focusTile = (n: number) => {
    const target = containerRef.current?.querySelector<HTMLButtonElement>(`[data-score="${n}"]`);
    target?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const current = value ?? 1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(10, current + 1);
      onChange(next);
      focusTile(next);
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.max(1, current - 1);
      onChange(next);
      focusTile(next);
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      onChange(1);
      focusTile(1);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      onChange(10);
      focusTile(10);
      return;
    }
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const n = e.key === '0' ? 10 : Number(e.key);
      onChange(n);
      focusTile(n);
    }
  };

  const focusableScore = value ?? 1;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        alignItems: 'flex-start',
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      <Box
        ref={containerRef}
        role="radiogroup"
        aria-label={ariaLabel ?? 'Score 1 to 10'}
        onKeyDown={handleKeyDown}
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.75,
          maxWidth: '100%',
        }}
      >
        {SCORES.map((n) => {
          const selected = value === n;
          const filled = value !== null && n <= value;
          const fillAlpha = selected ? 1 : filled ? 0.22 : 0;

          return (
            <ButtonBase
              key={n}
              data-score={n}
              role="radio"
              aria-checked={selected}
              aria-label={`Score ${n}`}
              tabIndex={focusableScore === n ? 0 : -1}
              onClick={() => onChange(n)}
              disabled={disabled}
              sx={{
                width: dims.tile,
                height: dims.tile,
                borderRadius: theme.tokens.radius.sm + 'px',
                border: '1px solid',
                borderColor: selected ? 'primary.main' : alpha(theme.palette.text.primary, 0.16),
                background: selected
                  ? theme.tokens.accent.gradient
                  : alpha(theme.palette.primary.main, fillAlpha),
                backdropFilter: theme.tokens.glass.blur,
                WebkitBackdropFilter: theme.tokens.glass.blur,
                color: selected
                  ? theme.palette.primary.contrastText
                  : filled
                    ? 'text.primary'
                    : 'text.secondary',
                fontWeight: 800,
                fontSize: dims.font,
                fontVariantNumeric: 'tabular-nums',
                transition: 'transform 160ms ease, border-color 160ms ease, box-shadow 200ms ease',
                boxShadow: selected ? theme.tokens.elevation.glow : 'none',
                '&:hover': {
                  borderColor: 'primary.main',
                  transform: 'translateY(-1px)',
                },
                '&:focus-visible': {
                  outline: `2px solid ${alpha(theme.palette.primary.main, 0.6)}`,
                  outlineOffset: 2,
                },
              }}
            >
              {n}
            </ButtonBase>
          );
        })}
      </Box>

      {showReadout && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 0.5,
            opacity: value === null ? 0 : 1,
            transition: 'opacity 200ms ease',
            minHeight: 28,
          }}
          aria-live="polite"
        >
          <Typography
            variant={dims.readoutVariant}
            sx={{
              fontWeight: 900,
              color: 'primary.main',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {value ?? 0}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', fontWeight: 700, lineHeight: 1 }}
          >
            / 10
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ScoreInput;
