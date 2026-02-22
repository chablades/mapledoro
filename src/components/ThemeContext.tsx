"use client";

import { createContext, useContext, ReactNode } from "react";
import { THEMES, type AppTheme } from "./themes";
import { usePersistedThemeKey } from "./usePersistedThemeKey";

interface ThemeContextType {
  themeKey: string;
  theme: AppTheme;
  setThemeKey: (key: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  initialThemeKey?: string;
}

export function ThemeProvider({ children, initialThemeKey = "default" }: ThemeProviderProps) {
  const validInitialThemeKey = Object.prototype.hasOwnProperty.call(THEMES, initialThemeKey)
    ? initialThemeKey
    : "default";
  const { themeKey, setThemeKey } = usePersistedThemeKey({
    initialKey: validInitialThemeKey,
    validKeys: Object.keys(THEMES),
  });

  const theme = THEMES[themeKey] || THEMES["default"];

  return (
    <ThemeContext.Provider value={{ themeKey, theme, setThemeKey }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
