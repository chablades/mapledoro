"use client";

import { createContext, use, useEffect, useMemo, type ReactNode } from "react";
import { ACCENT_THEMES, composeTheme, type AppTheme, type ColorMode, type Contrast } from "./themes";
import { usePersistedThemeKey } from "./usePersistedThemeKey";
import { usePersistedColorMode } from "./usePersistedColorMode";
import { usePersistedPref } from "./usePersistedPref";
import {
  CONTRAST_KEY, CONTRASTS, MOTION_KEY, MOTION_PREFS, TEXT_SIZE_KEY, TEXT_SIZE_ROOT, TEXT_SIZES,
  type MotionPref, type TextSize,
} from "./displayPrefs";

interface ThemeContextType {
  themeKey: string;
  theme: AppTheme;
  setThemeKey: (key: string) => void;
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  contrast: Contrast;
  setContrast: (contrast: Contrast) => void;
  motion: MotionPref;
  setMotion: (motion: MotionPref) => void;
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  initialThemeKey?: string;
  initialColorMode?: ColorMode;
  initialContrast?: Contrast;
  initialMotion?: MotionPref;
  initialTextSize?: TextSize;
}

export function ThemeProvider({
  children,
  initialThemeKey = "default",
  initialColorMode = "light",
  initialContrast = "standard",
  initialMotion = "system",
  initialTextSize = "default",
}: ThemeProviderProps) {
  const validInitialThemeKey = Object.prototype.hasOwnProperty.call(ACCENT_THEMES, initialThemeKey)
    ? initialThemeKey
    : "default";
  const { themeKey, setThemeKey } = usePersistedThemeKey({
    initialKey: validInitialThemeKey,
    validKeys: Object.keys(ACCENT_THEMES),
  });
  const { colorMode, setColorMode } = usePersistedColorMode(initialColorMode);

  const [contrast, setContrast] = usePersistedPref(CONTRAST_KEY, CONTRASTS, initialContrast);
  const [motion, setMotion] = usePersistedPref(MOTION_KEY, MOTION_PREFS, initialMotion);
  const [textSize, setTextSize] = usePersistedPref(TEXT_SIZE_KEY, TEXT_SIZES, initialTextSize);

  const theme = useMemo(() => composeTheme(themeKey, colorMode, contrast), [themeKey, colorMode, contrast]);

  // Keep the <html> background, color-scheme, motion flag and root font size
  // (all set server-side in layout.tsx) in sync with setting changes.
  useEffect(() => {
    const root = document.documentElement;
    root.style.background = theme.bg;
    root.style.colorScheme = theme.colorMode;
    root.style.fontSize = TEXT_SIZE_ROOT[textSize];
    root.dataset.motion = motion;
    root.dataset.contrast = contrast;
  }, [theme.bg, theme.colorMode, textSize, motion, contrast]);

  const value = useMemo(
    () => ({
      themeKey, theme, setThemeKey, colorMode, setColorMode,
      contrast, setContrast, motion, setMotion, textSize, setTextSize,
    }),
    [themeKey, theme, setThemeKey, colorMode, setColorMode, contrast, setContrast, motion, setMotion, textSize, setTextSize],
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
