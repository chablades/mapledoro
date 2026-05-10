import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeContext";
import { ACCENT_THEMES, type ColorMode } from "../components/themes";

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

  return (
    <html lang="en">
      <body>
        <ThemeProvider initialThemeKey={initialThemeKey} initialColorMode={initialColorMode}>
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
