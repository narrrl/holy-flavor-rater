import { styled } from '@mui/material/styles';
import MuiCard from '@mui/material/Card';
import MuiPaper from '@mui/material/Paper';
import Box from '@mui/material/Box';

type Intensity = 'subtle' | 'default' | 'strong';

const intensityStyles =
  (intensity: Intensity) =>
  ({ theme }: { theme: any }) => {
    const t = theme.tokens;
    const tint =
      intensity === 'strong'
        ? t.glass.tintStrong
        : intensity === 'subtle'
          ? t.glass.tintSubtle
          : t.glass.tint;
    const blur = intensity === 'strong' ? t.glass.blurStrong : t.glass.blur;
    return {
      backgroundColor: tint,
      backdropFilter: blur,
      WebkitBackdropFilter: blur,
      border: '1px solid',
      borderColor: t.glass.border,
      boxShadow: intensity === 'strong' ? t.elevation.md : t.elevation.sm,
      borderRadius: t.radius.md,
      position: 'relative' as const,
      // Inset top highlight — the "glass lip"
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        pointerEvents: 'none',
        boxShadow: `inset 0 1px 0 ${t.glass.highlight}`,
      },
    };
  };

interface GlassProps {
  intensity?: Intensity;
}

export const GlassCard = styled(MuiCard, {
  shouldForwardProp: (prop) => prop !== 'intensity',
})<GlassProps>(({ intensity = 'default', theme }) => intensityStyles(intensity)({ theme }));

export const GlassPaper = styled(MuiPaper, {
  shouldForwardProp: (prop) => prop !== 'intensity',
})<GlassProps>(({ intensity = 'default', theme }) => intensityStyles(intensity)({ theme }));

export const GlassSurface = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'intensity',
})<GlassProps>(({ intensity = 'default', theme }) => intensityStyles(intensity)({ theme }));

export type { Intensity as GlassIntensity };
