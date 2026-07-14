import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mapledoro.app",
  appName: "mapledoro",
  // Required by Capacitor but unused: the WebView loads server.url below,
  // not a bundled build. This folder holds only a placeholder page.
  webDir: "capacitor-www",
  server: {
    url: "https://mapledoro.com",
    cleartext: false,
  },
};

export default config;
