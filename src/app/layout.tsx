import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeContext";

export const metadata: Metadata = {
  title: "MapleDoro",
  description: "MapleStory hub for character sharing, events, and reset tracking.",
  icons: {
    icon: "/icons/doro.png",
    shortcut: "/icons/doro.png",
    apple: "/icons/doro.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
