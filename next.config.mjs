/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        ],
      },
    ];
  },
  // Bare hostnames only (no protocol/port) -- Next.js compares these directly against
  // the Origin header's hostname, so "http://host:port" never actually matches anything.
  allowedDevOrigins: [
    "127.0.0.1",
    // Local-network hostname for testing the dev server from a phone/tablet on the same
    // Wi-Fi -- set DEV_LAN_ORIGIN in .env.local (gitignored) rather than hardcoding an
    // IP here, since it's specific to whoever's machine is running `next dev`.
    ...(process.env.DEV_LAN_ORIGIN ? [process.env.DEV_LAN_ORIGIN] : []),
  ],
  experimental: {
    optimizePackageImports: ["chart.js", "react-chartjs-2"],
  },
  images: {
    minimumCacheTTL: 2678400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "msavatar1.nexon.net",
      },
      {
        protocol: "https",
        hostname: "g.nexonstatic.com",
      },
      {
        protocol: "https",
        hostname: "haku.network",
      }
    ],
  },
};

export default nextConfig;
