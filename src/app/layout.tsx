import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Nunito, Fredoka } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeContext";
import { ACCENT_THEMES, composeTheme, type ColorMode } from "../components/themes";
import CookieConsentBanner from "../components/CookieConsentBanner";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MapleDoro",
  description: "MapleStory hub for character sharing, events, and reset tracking.",
  icons: {
    icon: "/icons/doro.png",
    shortcut: "/icons/doro.png",
    apple: "/icons/doro.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();

  const cookieThemeKey = cookieStore.get("mapledoro-theme-key")?.value;
  const initialThemeKey =
    cookieThemeKey && Object.prototype.hasOwnProperty.call(ACCENT_THEMES, cookieThemeKey)
      ? cookieThemeKey
      : "default";

  const cookieColorMode = cookieStore.get("mapledoro-color-mode")?.value;
  const initialColorMode: ColorMode =
    cookieColorMode === "light" || cookieColorMode === "dark" ? cookieColorMode : "light";

  // Theme background on <html> so iOS Safari's toolbar tint and overscroll
  // rubber-band reveal the theme color, not default white. `color-scheme` tells
  // the browser which way to paint native widget chrome it draws itself (the
  // date input's calendar icon, scrollbars, <select> menus) — without it they
  // stay light and the dark icon disappears against a dark input. Both are kept
  // in sync after theme changes by ThemeProvider.
  const initialBg = composeTheme(initialThemeKey, initialColorMode).bg;

  return (
    <html
      lang="en"
      className={`${nunito.variable} ${fredoka.variable}`}
      style={{ background: initialBg, colorScheme: initialColorMode }}
    >
      <body>
        <ThemeProvider initialThemeKey={initialThemeKey} initialColorMode={initialColorMode}>
          {children}
          <CookieConsentBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
