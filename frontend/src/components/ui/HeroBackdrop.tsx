import { styled, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';

export interface HeroBackdropProps {
  variant?: 'mesh' | 'aurora' | 'minimal';
}

const Root = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'variant',
})<{ variant: NonNullable<HeroBackdropProps['variant']> }>(({ theme, variant }) => {
  const { palette } = theme;
  const p = palette.primary.main;
  const s = palette.secondary.main;

  const meshLayers = [
    `radial-gradient(ellipse 60% 40% at 20% 10%, ${alpha(p, 0.35)} 0%, transparent 60%)`,
    `radial-gradient(ellipse 50% 50% at 85% 25%, ${alpha(s, 0.28)} 0%, transparent 65%)`,
    `radial-gradient(ellipse 70% 45% at 50% 95%, ${alpha(p, 0.18)} 0%, transparent 60%)`,
  ];

  const auroraLayers = [
    `conic-gradient(from 210deg at 50% -10%, ${alpha(p, 0.35)}, ${alpha(s, 0.25)}, ${alpha(p, 0.1)}, ${alpha(p, 0.35)})`,
  ];

  const minimalLayers = [
    `linear-gradient(180deg, ${alpha(p, 0.12)} 0%, transparent 60%)`,
  ];

  const backgroundImage =
    variant === 'aurora' ? auroraLayers.join(', ')
    : variant === 'minimal' ? minimalLayers.join(', ')
    : meshLayers.join(', ');

  return {
    position: 'absolute',
    inset: 0,
    backgroundImage,
    backgroundColor: palette.background.default,
    filter: 'saturate(120%)',
    // Soft mask so the backdrop fades into the page content
    maskImage: 'linear-gradient(180deg, #000 0%, #000 55%, transparent 100%)',
    WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 55%, transparent 100%)',
  };
});

export const HeroBackdrop = ({ variant = 'mesh' }: HeroBackdropProps) => <Root variant={variant} />;
