import { createTheme, type ThemeOptions } from '@mui/material/styles';
import { flavors } from '@catppuccin/palette';

export type CatppuccinTheme = 'latte' | 'frappe' | 'macchiato' | 'mocha' | 'pink';

export const getTheme = (mode: CatppuccinTheme) => {
  let palette;

  if (mode === 'pink') {
      palette = {
          base: { hex: '#fdf6f7' }, // Soft cream pink
          surface0: { hex: '#f8e1e5' }, // Pastel pink
          crust: { hex: '#f2ccd5' }, // Deeper pink for headers
          text: { hex: '#4a3135' }, // Deep maroon-brown for high readability
          subtext0: { hex: '#7d5c62' },
          mauve: { hex: '#e05a8d' }, // Rich pink (Primary)
          pink: { hex: '#4ecdc4' }, // Fresh Turquoise (Secondary/Accent)
      };
  } else {
      const flavor = flavors[mode];
      if (flavor) {
          palette = flavor.colors;
      } else {
          // Fallback to mocha if theme name is invalid
          palette = flavors['mocha'].colors;
          mode = 'mocha';
      }
  }
  
  const themeOptions: ThemeOptions = {
    palette: {
      mode: (mode === 'latte' || mode === 'pink') ? 'light' : 'dark',
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
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundColor: palette.surface0.hex,
                    color: palette.text.hex,
                }
            }
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: palette.crust.hex,
                    color: palette.text.hex,
                }
            }
        }
    }
  };

  return createTheme(themeOptions);
};
