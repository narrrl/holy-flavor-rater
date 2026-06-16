import { useEffect, useState, type ReactNode } from 'react';
import { styled, alpha } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';

const StyledAppBar = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'scrolled',
})<{ scrolled: boolean }>(({ theme, scrolled }) => {
  const t = theme.tokens;
  return {
    backgroundColor: scrolled
      ? alpha(theme.palette.background.default, theme.palette.mode === 'light' ? 0.85 : 0.72)
      : alpha(theme.palette.background.default, theme.palette.mode === 'light' ? 0.55 : 0.4),
    backdropFilter: t.glass.blurStrong,
    WebkitBackdropFilter: t.glass.blurStrong,
    borderBottom: '1px solid',
    borderColor: scrolled ? t.glass.border : 'transparent',
    boxShadow: scrolled ? t.elevation.sm : 'none',
    color: theme.palette.text.primary,
    transition: 'background-color 200ms ease, box-shadow 200ms ease, border-color 200ms ease',
  };
});

export interface GlassAppBarProps {
  children: ReactNode;
  threshold?: number;
  /** Extra styles merged onto the inner Toolbar — e.g. to constrain its content
   * to the page-content column so the bar aligns with the main content edges. */
  toolbarSx?: SxProps<Theme>;
}

export const GlassAppBar = ({ children, threshold = 12, toolbarSx }: GlassAppBarProps) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return (
    <StyledAppBar position="sticky" elevation={0} scrolled={scrolled}>
      <Toolbar
        sx={
          [
            { minHeight: { xs: 56, sm: 64 }, px: { xs: 1, sm: 4, md: 6 } },
            toolbarSx || {},
          ] as SxProps<Theme>
        }
      >
        {children}
      </Toolbar>
    </StyledAppBar>
  );
};
