import { createTheme, type ThemeOptions } from '@mui/material/styles';
import { flavors } from '@catppuccin/palette';

export type CatppuccinTheme = 'latte' | 'frappe' | 'macchiato' | 'mocha' | 'pink';

export const getTheme = (mode: CatppuccinTheme) => {
  let palette;

  if (mode === 'pink') {
      palette = {
          base: { hex: '#fff0f5' }, // Lavender Blush
          surface0: { hex: '#ffe4e1' }, // Misty Rose
          crust: { hex: '#ffc0cb' }, // Pink
          text: { hex: '#5c4b51' }, // Darker text for contrast
          subtext0: { hex: '#8b6b7a' },
          mauve: { hex: '#ff69b4' }, // Hot Pink (Primary)
          pink: { hex: '#db7093' }, // Pale Violet Red (Secondary)
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
