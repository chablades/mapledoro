import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeContext";
import { THEMES } from "../components/themes";

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
    cookieThemeKey && Object.prototype.hasOwnProperty.call(THEMES, cookieThemeKey)
      ? cookieThemeKey
      : "default";

  return (
    <html lang="en">
      <body>
        <ThemeProvider initialThemeKey={initialThemeKey}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
