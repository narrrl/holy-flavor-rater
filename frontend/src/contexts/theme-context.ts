import { createContext } from 'react';
import type { CatppuccinTheme } from '../theme';

export interface ThemeContextValue {
  themeName: CatppuccinTheme;
  setThemeName: (name: CatppuccinTheme) => void;
  handleThemeChange: (name: CatppuccinTheme, isLoggedIn: boolean) => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
