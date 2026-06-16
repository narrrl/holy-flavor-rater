import { createTheme, type ThemeOptions, alpha } from '@mui/material/styles';
import { flavors } from '@catppuccin/palette';

declare module '@mui/material/styles' {
  interface Theme {
    tokens: ThemeTokens;
  }
  interface ThemeOptions {
    tokens?: ThemeTokens;
  }
}

export interface ThemeTokens {
  surface: {
    base: string;
    elevated: string;
    overlay: string;
    sunken: string;
  };
  glass: {
    tint: string;
    tintStrong: string;
    tintSubtle: string;
    border: string;
    highlight: string;
    blur: string;
    blurStrong: string;
  };
  accent: {
    primary: string;
    secondary: string;
    gradient: string;
    softGradient: string;
  };
  elevation: {
    sm: string;
    md: string;
    lg: string;
    glow: string;
  };
  radius: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    pill: number;
  };
}

export type CatppuccinTheme =
  | 'holy_light'
  | 'holy_dark'
  | 'latte'
  | 'frappe'
  | 'macchiato'
  | 'mocha'
  | 'pink_pastel'
  | 'mint_pastel'
  | 'lavender_pastel'
  | 'dracula'
  | 'nord'
  | 'gruvbox'
  | 'oceanic'
  | 't0p_sai'
  | 't0p_trench'
  | 't0p_blurryface'
  | 't0p_clancy';

export const isLightTheme = (mode: CatppuccinTheme): boolean => {
  return [
    'holy_light',
    'latte',
    'pink_pastel',
    'mint_pastel',
    'lavender_pastel',
    't0p_sai',
  ].includes(mode);
};

interface PaletteColor {
  hex: string;
}

interface ThemePalette {
  base: PaletteColor;
  surface0: PaletteColor;
  crust: PaletteColor;
  text: PaletteColor;
  subtext0: PaletteColor;
  primary: PaletteColor;
  secondary: PaletteColor;
}

export const getTheme = (mode: CatppuccinTheme) => {
  let palette: ThemePalette;

  // Define Holy branding colors
  const holyPurple = { light: '#7c3aed', dark: '#a78bfa' };
  const holyPink = { light: '#db2777', dark: '#f472b6' };

  if (mode === 'holy_light') {
    palette = {
      base: { hex: '#f8fafc' },
      surface0: { hex: '#ffffff' },
      crust: { hex: '#f1f5f9' },
      text: { hex: '#0f172a' },
      subtext0: { hex: '#64748b' },
      primary: { hex: holyPurple.light },
      secondary: { hex: holyPink.light },
    };
  } else if (mode === 'holy_dark') {
    palette = {
      base: { hex: '#020617' },
      surface0: { hex: '#0f172a' },
      crust: { hex: '#000000' },
      text: { hex: '#f8fafc' },
      subtext0: { hex: '#94a3b8' },
      primary: { hex: holyPurple.dark },
      secondary: { hex: holyPink.dark },
    };
  } else if (mode === 'pink_pastel') {
    palette = {
      base: { hex: '#fff1f2' },
      surface0: { hex: '#ffffff' },
      crust: { hex: '#ffe4e6' },
      text: { hex: '#881337' },
      subtext0: { hex: '#be123c' },
      primary: { hex: '#fb7185' },
      secondary: { hex: '#2dd4bf' },
    };
  } else if (mode === 'mint_pastel') {
    palette = {
      base: { hex: '#f0fdf4' },
      surface0: { hex: '#ffffff' },
      crust: { hex: '#dcfce7' },
      text: { hex: '#14532d' },
      subtext0: { hex: '#16a34a' },
      primary: { hex: '#4ade80' },
      secondary: { hex: '#fb7185' },
    };
  } else if (mode === 'lavender_pastel') {
    palette = {
      base: { hex: '#f5f3ff' },
      surface0: { hex: '#ffffff' },
      crust: { hex: '#ede9fe' },
      text: { hex: '#4c1d95' },
      subtext0: { hex: '#7c3aed' },
      primary: { hex: '#8b5cf6' },
      secondary: { hex: '#facc15' },
    };
  } else if (mode === 't0p_sai') {
    palette = {
      base: { hex: '#fdf2f8' },
      surface0: { hex: '#ffffff' },
      crust: { hex: '#fce7f3' },
      text: { hex: '#1e1b4b' },
      subtext0: { hex: '#4b5563' },
      primary: { hex: '#00d7ff' },
      secondary: { hex: '#ff8ad8' },
    };
  } else if (mode === 't0p_trench') {
    palette = {
      base: { hex: '#1a1a1a' },
      surface0: { hex: '#242424' },
      crust: { hex: '#000000' },
      text: { hex: '#fce300' },
      subtext0: { hex: '#a0a0a0' },
      primary: { hex: '#fce300' },
      secondary: { hex: '#4b5320' },
    };
  } else if (mode === 't0p_blurryface') {
    palette = {
      base: { hex: '#000000' },
      surface0: { hex: '#1a1a1a' },
      crust: { hex: '#000000' },
      text: { hex: '#ffffff' },
      subtext0: { hex: '#e31e24' },
      primary: { hex: '#e31e24' },
      secondary: { hex: '#ffffff' },
    };
  } else if (mode === 't0p_clancy') {
    palette = {
      base: { hex: '#000000' },
      surface0: { hex: '#121212' },
      crust: { hex: '#000000' },
      text: { hex: '#ffffff' },
      subtext0: { hex: '#fce300' },
      primary: { hex: '#e31e24' },
      secondary: { hex: '#fce300' },
    };
  } else if (mode === 'dracula') {
    palette = {
      base: { hex: '#282a36' },
      surface0: { hex: '#44475a' },
      crust: { hex: '#191a21' },
      text: { hex: '#f8f8f2' },
      subtext0: { hex: '#6272a4' },
      primary: { hex: '#bd93f9' },
      secondary: { hex: '#ff79c6' },
    };
  } else if (mode === 'nord') {
    palette = {
      base: { hex: '#2e3440' },
      surface0: { hex: '#3b4252' },
      crust: { hex: '#242933' },
      text: { hex: '#eceff4' },
      subtext0: { hex: '#d8dee9' },
      primary: { hex: '#88c0d0' },
      secondary: { hex: '#b48ead' },
    };
  } else if (mode === 'gruvbox') {
    palette = {
      base: { hex: '#282828' },
      surface0: { hex: '#3c3836' },
      crust: { hex: '#1d2021' },
      text: { hex: '#ebdbb2' },
      subtext0: { hex: '#928374' },
      primary: { hex: '#fabd2f' },
      secondary: { hex: '#fb4934' },
    };
  } else if (mode === 'oceanic') {
    palette = {
      base: { hex: '#1b262c' },
      surface0: { hex: '#0f4c75' },
      crust: { hex: '#0f161c' },
      text: { hex: '#bbe1fa' },
      subtext0: { hex: '#3282b8' },
      primary: { hex: '#3282b8' },
      secondary: { hex: '#bbe1fa' },
    };
  } else {
    // Handle Catppuccin flavors
    const flavor = flavors[mode as keyof typeof flavors];
    if (flavor) {
      const colors = flavor.colors;
      palette = {
        base: colors.base,
        surface0: colors.surface0,
        crust: colors.crust,
        text: colors.text,
        subtext0: colors.subtext0,
        primary: colors.mauve,
        secondary: colors.pink,
      };
    } else {
      palette = {
        base: { hex: '#f8fafc' },
        surface0: { hex: '#ffffff' },
        crust: { hex: '#f1f5f9' },
        text: { hex: '#0f172a' },
        subtext0: { hex: '#64748b' },
        primary: { hex: holyPurple.light },
        secondary: { hex: holyPink.light },
      };
      mode = 'holy_light';
    }
  }

  const isLight = isLightTheme(mode);

  const tokens: ThemeTokens = {
    surface: {
      base: palette.base.hex,
      elevated: alpha(palette.surface0.hex, isLight ? 0.72 : 0.6),
      overlay: alpha(palette.surface0.hex, isLight ? 0.82 : 0.5),
      sunken: palette.crust.hex,
    },
    glass: {
      tint: alpha(palette.surface0.hex, isLight ? 0.6 : 0.42),
      tintStrong: alpha(palette.surface0.hex, isLight ? 0.78 : 0.6),
      tintSubtle: alpha(palette.surface0.hex, isLight ? 0.42 : 0.28),
      border: alpha(palette.text.hex, isLight ? 0.08 : 0.12),
      highlight: alpha('#ffffff', isLight ? 0.65 : 0.08),
      blur: 'blur(18px) saturate(160%)',
      blurStrong: 'blur(28px) saturate(180%)',
    },
    accent: {
      primary: palette.primary.hex,
      secondary: palette.secondary.hex,
      gradient: `linear-gradient(135deg, ${palette.primary.hex} 0%, ${palette.secondary.hex} 100%)`,
      softGradient: `linear-gradient(135deg, ${alpha(palette.primary.hex, 0.18)} 0%, ${alpha(palette.secondary.hex, 0.12)} 100%)`,
    },
    elevation: {
      sm: isLight
        ? '0 1px 2px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.08)'
        : '0 1px 2px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.25)',
      md: isLight
        ? '0 4px 12px rgba(15,23,42,0.08), 0 2px 4px rgba(15,23,42,0.06)'
        : '0 6px 18px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.3)',
      lg: isLight
        ? '0 18px 40px rgba(15,23,42,0.12), 0 6px 12px rgba(15,23,42,0.06)'
        : '0 24px 48px rgba(0,0,0,0.45), 0 8px 16px rgba(0,0,0,0.3)',
      glow: `0 0 40px ${alpha(palette.primary.hex, isLight ? 0.28 : 0.4)}`,
    },
    radius: {
      xs: 6,
      sm: 10,
      md: 14,
      lg: 20,
      pill: 999,
    },
  };

  const themeOptions: ThemeOptions = {
    palette: {
      mode: isLight ? 'light' : 'dark',
      primary: {
        main: palette.primary.hex,
        contrastText: isLight ? '#ffffff' : '#000000',
      },
      secondary: {
        main: palette.secondary.hex,
      },
      background: {
        default: palette.base.hex,
        paper: palette.surface0.hex,
      },
      text: {
        primary: palette.text.hex,
        secondary: palette.subtext0.hex,
      },
      divider: tokens.glass.border,
      action: {
        hover: alpha(palette.primary.hex, 0.08),
        selected: alpha(palette.primary.hex, 0.12),
      },
    },
    shape: {
      borderRadius: tokens.radius.sm,
    },
    typography: {
      fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", sans-serif',
      h1: { fontWeight: 800, letterSpacing: '-0.02em' },
      h2: { fontWeight: 800, letterSpacing: '-0.02em' },
      h3: { fontWeight: 700, letterSpacing: '-0.015em' },
      h4: { fontWeight: 700, letterSpacing: '-0.01em' },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: palette.base.hex,
            color: palette.text.hex,
            scrollbarColor: `${alpha(palette.text.hex, 0.2)} transparent`,
            '&::-webkit-scrollbar': { width: '8px', height: '8px' },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: alpha(palette.text.hex, 0.2),
              borderRadius: '10px',
              '&:hover': { backgroundColor: alpha(palette.text.hex, 0.3) },
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: tokens.glass.tint,
            backgroundImage: 'none',
            backdropFilter: tokens.glass.blur,
            WebkitBackdropFilter: tokens.glass.blur,
            border: '1px solid',
            borderColor: tokens.glass.border,
            boxShadow: tokens.elevation.sm,
          },
        },
      },
      MuiCard: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            backgroundColor: tokens.glass.tint,
            backgroundImage: 'none',
            backdropFilter: tokens.glass.blur,
            WebkitBackdropFilter: tokens.glass.blur,
            border: '1px solid',
            borderColor: tokens.glass.border,
            borderRadius: tokens.radius.md,
            boxShadow: tokens.elevation.sm,
            transition: 'transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: alpha(palette.base.hex, isLight ? 0.72 : 0.62),
            backdropFilter: tokens.glass.blurStrong,
            WebkitBackdropFilter: tokens.glass.blurStrong,
            borderBottom: '1px solid',
            borderColor: tokens.glass.border,
            color: palette.text.hex,
            boxShadow: 'none',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.sm,
            padding: '8px 20px',
            fontWeight: 600,
          },
          containedPrimary: {
            boxShadow: `0 4px 14px 0 ${alpha(palette.primary.hex, 0.35)}`,
            '&:hover': {
              boxShadow: `0 8px 24px 0 ${alpha(palette.primary.hex, 0.45)}`,
            },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: '48px',
            fontWeight: 600,
            borderRadius: tokens.radius.sm,
            textTransform: 'none',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.sm,
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: tokens.surface.overlay,
            backdropFilter: tokens.glass.blurStrong,
            WebkitBackdropFilter: tokens.glass.blurStrong,
            border: '1px solid',
            borderColor: tokens.glass.border,
            boxShadow: tokens.elevation.md,
          },
        },
      },
    },
    tokens,
  };

  return createTheme(themeOptions);
};
