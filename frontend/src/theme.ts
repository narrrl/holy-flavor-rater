import { createTheme, type ThemeOptions, alpha } from '@mui/material/styles';
import { flavors } from '@catppuccin/palette';

export type CatppuccinTheme = 
    | 'holy_light' | 'holy_dark'
    | 'latte' | 'frappe' | 'macchiato' | 'mocha'
    | 'pink_pastel' | 'dracula' | 'nord' | 'gruvbox' | 'oceanic';

export const isLightTheme = (mode: CatppuccinTheme): boolean => {
    return ['holy_light', 'latte', 'pink_pastel'].includes(mode);
};

export const getTheme = (mode: CatppuccinTheme) => {
  let palette: any;

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
      const flavor = (flavors as any)[mode];
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
          // Fallback to holy_light
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
      divider: alpha(palette.text.hex, 0.1),
      action: {
          hover: alpha(palette.primary.hex, 0.08),
          selected: alpha(palette.primary.hex, 0.12),
      }
    },
    shape: {
        borderRadius: 12,
    },
    typography: {
      fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", sans-serif',
      h1: { fontWeight: 800 },
      h2: { fontWeight: 800 },
      h3: { fontWeight: 700 },
      h4: { fontWeight: 700 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    scrollbarColor: `${alpha(palette.text.hex, 0.2)} transparent`,
                    '&::-webkit-scrollbar': { width: '8px', height: '8px' },
                    '&::-webkit-scrollbar-thumb': { 
                        backgroundColor: alpha(palette.text.hex, 0.2), 
                        borderRadius: '10px',
                        '&:hover': { backgroundColor: alpha(palette.text.hex, 0.3) }
                    },
                }
            }
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundColor: isLight ? palette.surface0.hex : alpha(palette.surface0.hex, 0.8),
                    backgroundImage: 'none',
                    backdropFilter: isLight ? 'none' : 'blur(16px)',
                    border: '1px solid',
                    borderColor: alpha(palette.text.hex, 0.08),
                    boxShadow: isLight 
                        ? '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' 
                        : '0 4px 20px rgba(0,0,0,0.2)',
                }
            }
        },
        MuiCard: {
            defaultProps: {
                elevation: 0,
            },
            styleOverrides: {
                root: {
                    backgroundColor: isLight ? palette.surface0.hex : alpha(palette.surface0.hex, 0.6),
                    backdropFilter: 'blur(12px)',
                    border: '1px solid',
                    borderColor: alpha(palette.text.hex, 0.1),
                    borderRadius: '20px',
                    transition: 'all 0.2s ease-in-out',
                }
            }
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: alpha(palette.base.hex, 0.8),
                    backdropFilter: 'blur(20px)',
                    borderBottom: '1px solid',
                    borderColor: alpha(palette.text.hex, 0.08),
                    color: palette.text.hex,
                }
            }
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: '10px',
                    padding: '8px 20px',
                },
                containedPrimary: {
                    boxShadow: `0 4px 14px 0 ${alpha(palette.primary.hex, 0.39)}`,
                    '&:hover': {
                        boxShadow: `0 6px 20px rgba(0,0,0,0.23)`,
                    }
                }
            }
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    minHeight: '48px',
                    fontWeight: 700,
                }
            }
        }
    }
  };

  return createTheme(themeOptions);
};
