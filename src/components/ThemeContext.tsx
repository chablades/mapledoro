"use client";

import { createContext, useContext, ReactNode } from "react";
import { ACCENT_THEMES, composeTheme, type AppTheme, type ColorMode } from "./themes";
import { usePersistedThemeKey } from "./usePersistedThemeKey";
import { usePersistedColorMode } from "./usePersistedColorMode";

interface ThemeContextType {
  themeKey: string;
  theme: AppTheme;
  setThemeKey: (key: string) => void;
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  initialThemeKey?: string;
  initialColorMode?: ColorMode;
}

export function ThemeProvider({
  children,
  initialThemeKey = "default",
  initialColorMode = "light",
}: ThemeProviderProps) {
  const validInitialThemeKey = Object.prototype.hasOwnProperty.call(ACCENT_THEMES, initialThemeKey)
    ? initialThemeKey
    : "default";
  const { themeKey, setThemeKey } = usePersistedThemeKey({
    initialKey: validInitialThemeKey,
    validKeys: Object.keys(ACCENT_THEMES),
  });
  const { colorMode, setColorMode } = usePersistedColorMode(initialColorMode);

  const theme = composeTheme(themeKey, colorMode);

  return (
    <ThemeContext.Provider value={{ themeKey, theme, setThemeKey, colorMode, setColorMode }}>
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
