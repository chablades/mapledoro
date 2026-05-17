/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ],
  experimental: {
    optimizePackageImports: ["chart.js", "react-chartjs-2"],
  },
  images: {
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
        hostname: "maplestory.io",
      },
      {
        protocol: "https",
        hostname: "media.maplestorywiki.net",
      },
      {
        protocol: "https",
        hostname: "orangemushroom.net",
      },
    ],
  },
};

export default nextConfig;
