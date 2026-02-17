import { createTheme, type ThemeOptions, alpha } from '@mui/material/styles';
import { flavors } from '@catppuccin/palette';

export type CatppuccinTheme = 
    | 'holy_light' | 'holy_dark'
    | 'latte' | 'pink' | 'solarized_light' | 'one_light' | 'paper'
    | 'frappe' | 'macchiato' | 'mocha' | 'atom' | 'dracula' | 'gruvbox' | 'nord' | 'cyberpunk' | 'forest';

export const isLightTheme = (mode: CatppuccinTheme): boolean => {
    return ['holy_light', 'latte', 'pink', 'solarized_light', 'one_light', 'paper'].includes(mode);
};

export const getTheme = (mode: CatppuccinTheme) => {
  let palette: any;

  if (mode === 'holy_light') {
      palette = {
          base: { hex: '#ffffff' }, 
          surface0: { hex: '#f8f9fa' }, 
          crust: { hex: '#e9ecef' }, 
          text: { hex: '#1a1a1a' }, 
          subtext0: { hex: '#6c757d' },
          mauve: { hex: '#8a2be2' }, // Holy Purple
          pink: { hex: '#ff00ff' }, // Holy Pink/Magenta
      };
  } else if (mode === 'holy_dark') {
      palette = {
          base: { hex: '#0f0f0f' }, 
          surface0: { hex: '#1a1a1a' }, 
          crust: { hex: '#000000' }, 
          text: { hex: '#ffffff' }, 
          subtext0: { hex: '#a0a0a0' },
          mauve: { hex: '#9d4edd' }, // Brighter Purple for Dark
          pink: { hex: '#ff4dff' }, // Brighter Pink for Dark
      };
  } else if (mode === 'pink') {
      palette = {
          base: { hex: '#fdf6f7' }, 
          surface0: { hex: '#f8e1e5' }, 
          crust: { hex: '#f2ccd5' }, 
          text: { hex: '#4a3135' }, 
          subtext0: { hex: '#7d5c62' },
          mauve: { hex: '#e05a8d' }, 
          pink: { hex: '#4ecdc4' }, 
      };
  } else if (mode === 'solarized_light') {
      palette = {
          base: { hex: '#fdf6e3' },
          surface0: { hex: '#eee8d5' },
          crust: { hex: '#e3dbbc' },
          text: { hex: '#586e75' },
          subtext0: { hex: '#839496' },
          mauve: { hex: '#6c71c4' },
          pink: { hex: '#d33682' },
      };
  } else if (mode === 'one_light') {
      palette = {
          base: { hex: '#fafafa' },
          surface0: { hex: '#f0f0f0' },
          crust: { hex: '#e5e5e6' },
          text: { hex: '#383a42' },
          subtext0: { hex: '#a0a1a7' },
          mauve: { hex: '#a626a4' },
          pink: { hex: '#e45649' },
      };
  } else if (mode === 'paper') {
      palette = {
          base: { hex: '#ffffff' },
          surface0: { hex: '#f5f5f5' },
          crust: { hex: '#eeeeee' },
          text: { hex: '#222222' },
          subtext0: { hex: '#666666' },
          mauve: { hex: '#007aff' },
          pink: { hex: '#ff2d55' },
      };
  } else if (mode === 'atom') {
      palette = {
          base: { hex: '#282c34' },
          surface0: { hex: '#353b45' },
          crust: { hex: '#21252b' },
          text: { hex: '#abb2bf' },
          subtext0: { hex: '#5c6370' },
          mauve: { hex: '#c678dd' },
          pink: { hex: '#e06c75' },
      };
  } else if (mode === 'dracula') {
      palette = {
          base: { hex: '#282a36' },
          surface0: { hex: '#44475a' },
          crust: { hex: '#191a21' },
          text: { hex: '#f8f8f2' },
          subtext0: { hex: '#6272a4' },
          mauve: { hex: '#bd93f9' },
          pink: { hex: '#ff79c6' },
      };
  } else if (mode === 'gruvbox') {
      palette = {
          base: { hex: '#282828' },
          surface0: { hex: '#3c3836' },
          crust: { hex: '#1d2021' },
          text: { hex: '#ebdbb2' },
          subtext0: { hex: '#928374' },
          mauve: { hex: '#d3869b' },
          pink: { hex: '#fb4934' },
      };
  } else if (mode === 'nord') {
      palette = {
          base: { hex: '#2e3440' },
          surface0: { hex: '#3b4252' },
          crust: { hex: '#242933' },
          text: { hex: '#eceff4' },
          subtext0: { hex: '#d8dee9' },
          mauve: { hex: '#b48ead' },
          pink: { hex: '#88c0d0' },
      };
  } else if (mode === 'cyberpunk') {
      palette = {
          base: { hex: '#1a1a2e' },
          surface0: { hex: '#16213e' },
          crust: { hex: '#0f3460' },
          text: { hex: '#e94560' },
          subtext0: { hex: '#0f3460' },
          mauve: { hex: '#e94560' },
          pink: { hex: '#00d2ff' },
      };
  } else if (mode === 'forest') {
      palette = {
          base: { hex: '#1b262c' },
          surface0: { hex: '#213e3b' },
          crust: { hex: '#0f161c' },
          text: { hex: '#e8e8e8' },
          subtext0: { hex: '#aebb83' },
          mauve: { hex: '#4e8d7c' },
          pink: { hex: '#aebb83' },
      };
  } else {
      const flavor = (flavors as any)[mode];
      if (flavor) {
          palette = flavor.colors;
      } else {
          palette = {
              base: { hex: '#ffffff' }, 
              surface0: { hex: '#f8f9fa' }, 
              crust: { hex: '#e9ecef' }, 
              text: { hex: '#1a1a1a' }, 
              subtext0: { hex: '#6c757d' },
              mauve: { hex: '#8a2be2' },
              pink: { hex: '#ff00ff' },
          };
          mode = 'holy_light';
      }
  }
  
  const themeOptions: ThemeOptions = {
    palette: {
      mode: isLightTheme(mode) ? 'light' : 'dark',
      primary: {
        main: palette.mauve.hex,
      },
      secondary: {
        main: palette.pink.hex,
      },
      background: {
        default: palette.base.hex,
        paper: palette.surface0.hex,
      },
      text: {
        primary: palette.text.hex,
        secondary: palette.subtext0.hex,
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
    components: {
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundColor: alpha(palette.surface0.hex, 0.7),
                    backdropFilter: 'blur(12px)',
                    border: '1px solid',
                    borderColor: alpha(palette.text.hex, 0.1),
                    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
                }
            }
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundColor: alpha(palette.surface0.hex, 0.6),
                    backdropFilter: 'blur(10px)',
                    border: '1px solid',
                    borderColor: alpha(palette.text.hex, 0.1),
                    borderRadius: '16px',
                }
            }
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: alpha(palette.crust.hex, 0.8),
                    backdropFilter: 'blur(16px)',
                    color: palette.text.hex,
                }
            }
        }
    }
  };

  return createTheme(themeOptions);
};
