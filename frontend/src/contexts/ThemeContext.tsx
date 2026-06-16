import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { getTheme, type CatppuccinTheme } from '../theme';
import api from '../lib/api';
import { ThemeContext } from './theme-context';

export type { ThemeContextValue } from './theme-context';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeName, setThemeName] = useState<CatppuccinTheme>(
    (localStorage.getItem('theme') as CatppuccinTheme) || 'holy_light',
  );

  const theme = useMemo(() => getTheme(themeName), [themeName]);

  const handleThemeChange = useCallback(async (name: CatppuccinTheme, isLoggedIn: boolean) => {
    setThemeName(name);
    localStorage.setItem('theme', name);
    document.body.style.backgroundColor = getTheme(name).palette.background.default;
    document.body.style.color = getTheme(name).palette.text.primary;
    if (isLoggedIn) {
      try {
        await api.patch('users/update_preferences/', { theme: name });
      } catch {
        /* ignore */
      }
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ themeName, setThemeName, handleThemeChange }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
