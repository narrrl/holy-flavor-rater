import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';

const ShellRoot = styled(Box)({
  position: 'relative',
  width: '100%',
  minHeight: '100%',
});

const HeroLayer = styled(Box)({
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  overflow: 'hidden',
  zIndex: 0,
});

const Content = styled(Box)(({ theme }) => ({
  position: 'relative',
  zIndex: 1,
  width: '100%',
  maxWidth: '1400px',
  marginInline: 'auto',
  paddingInline: theme.spacing(2),
  paddingBlock: theme.spacing(4),
  [theme.breakpoints.up('sm')]: {
    paddingInline: theme.spacing(4),
  },
  [theme.breakpoints.up('md')]: {
    paddingInline: theme.spacing(6),
    paddingBlock: theme.spacing(6),
  },
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(5),
}));

export interface PageShellProps {
  children: ReactNode;
  hero?: ReactNode;
  fullWidth?: boolean;
}

export const PageShell = ({ children, hero, fullWidth }: PageShellProps) => (
  <ShellRoot>
    {hero && <HeroLayer>{hero}</HeroLayer>}
    <Content sx={fullWidth ? { maxWidth: 'none' } : undefined}>{children}</Content>
  </ShellRoot>
);
