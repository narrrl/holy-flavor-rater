import { createTheme, type ThemeOptions } from '@mui/material/styles';
import { flavors } from '@catppuccin/palette';

export type CatppuccinTheme = 'latte' | 'frappe' | 'macchiato' | 'mocha';

export const getTheme = (mode: CatppuccinTheme) => {
  const flavor = flavors[mode].colors;
  
  const themeOptions: ThemeOptions = {
    palette: {
      mode: mode === 'latte' ? 'light' : 'dark',
      primary: {
        main: flavor.mauve.hex,
      },
      secondary: {
        main: flavor.pink.hex,
      },
      background: {
        default: flavor.base.hex,
        paper: flavor.surface0.hex,
      },
      text: {
        primary: flavor.text.hex,
        secondary: flavor.subtext0.hex,
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundColor: flavor.surface0.hex,
                    color: flavor.text.hex,
                }
            }
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: flavor.crust.hex,
                    color: flavor.text.hex,
                }
            }
        }
    }
  };

  return createTheme(themeOptions);
};
