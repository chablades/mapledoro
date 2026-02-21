import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MapleDoro",
  description: "MapleStory hub for character sharing, events, and reset tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
