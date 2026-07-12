"use client";

import { createContext, use, useEffect, useMemo, ReactNode } from "react";
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

  // Keep the <html> background and color-scheme (both set server-side in
  // layout.tsx) in sync with theme changes.
  useEffect(() => {
    document.documentElement.style.background = theme.bg;
    document.documentElement.style.colorScheme = theme.colorMode;
  }, [theme.bg, theme.colorMode]);

  const value = useMemo(
    () => ({ themeKey, theme, setThemeKey, colorMode, setColorMode }),
    [themeKey, theme, setThemeKey, colorMode, setColorMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = use(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
