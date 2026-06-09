import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Nunito, Fredoka } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeContext";
import { ACCENT_THEMES, type ColorMode } from "../components/themes";
import CookieConsentBanner from "../components/CookieConsentBanner";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-heading",
  display: "swap",
});

// One-time localStorage bridge from the old origin (mapledoro.vercel.app) to
// mapledoro.com. localStorage is origin-scoped and cannot be carried by an HTTP
// redirect, so this runs in first-party context on the old origin, reads every
// mapledoro_* key, and hands it to the new origin via the URL fragment (which is
// never sent to the server). The new origin imports any keys it doesn't already
// have, then strips the fragment. Inline + render-blocking so the write lands
// before any component reads localStorage. Remove once traffic has drained off
// the .vercel.app domain.
const DATA_MIGRATION_SCRIPT = `(function () {
  try {
    var SOURCE = "mapledoro.vercel.app";
    var PREFIX = "mapledoro_";
    var KEY = "__mldoro_migrate";
    if (location.hostname === SOURCE) {
      var data = {};
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(PREFIX) === 0) data[k] = localStorage.getItem(k);
      }
      var target = "https://mapledoro.com" + location.pathname + location.search;
      if (Object.keys(data).length) {
        target += "#" + KEY + "=" + encodeURIComponent(JSON.stringify(data));
      }
      location.replace(target);
      return;
    }
    var marker = KEY + "=";
    var at = location.hash.indexOf(marker);
    if (at !== -1) {
      var encoded = location.hash.slice(at + marker.length);
      var amp = encoded.indexOf("&");
      if (amp !== -1) encoded = encoded.slice(0, amp);
      var incoming = JSON.parse(decodeURIComponent(encoded));
      Object.keys(incoming).forEach(function (k) {
        if (k.indexOf(PREFIX) === 0 && typeof incoming[k] === "string" && localStorage.getItem(k) === null)
          localStorage.setItem(k, incoming[k]);
      });
      history.replaceState(null, "", location.pathname + location.search);
    }
  } catch (e) {}
})();`;

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
    <html lang="en" className={`${nunito.variable} ${fredoka.variable}`}>
      <body>
        {/* react-doctor-disable-next-line react-doctor/no-danger, react-doctor/nextjs-no-native-script -- static build-time string, intentionally render-blocking: must redirect before paint on the old origin and import keys before any component reads localStorage */}
        <script dangerouslySetInnerHTML={{ __html: DATA_MIGRATION_SCRIPT }} />
        <ThemeProvider initialThemeKey={initialThemeKey} initialColorMode={initialColorMode}>
          {children}
          <CookieConsentBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
