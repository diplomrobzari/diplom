import type { NextConfig } from "next";

const apiBase = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const apiOrigin = (() => {
  try {
    return new URL(apiBase).origin;
  } catch {
    return "http://localhost:8000";
  }
})();
const apiImagePattern = (() => {
  try {
    const url = new URL(apiOrigin);
    return {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      port: url.port,
    };
  } catch {
    return { protocol: "http" as const, hostname: "localhost", port: "8000" };
  }
})();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  reactStrictMode: true,

  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "8000" },
      { protocol: "http", hostname: "127.0.0.1", port: "8000" },
      apiImagePattern,
    ],
  },

  async headers() {
    return [
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value:
              `default-src 'self'; script-src 'self' 'unsafe-inline' https://api-maps.yandex.ru https://yastatic.net https://*.yastatic.net https://*.yandex.net https://mc.yandex.ru https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://yastatic.net https://*.yastatic.net; img-src 'self' data: blob: https: http://localhost:8000 http://127.0.0.1:8000 ${apiOrigin}; connect-src 'self' ${apiOrigin} http://localhost:8000 http://127.0.0.1:8000 https://api-maps.yandex.ru https://suggest-maps.yandex.ru https://geocode-maps.yandex.ru https://*.yandex.net https://*.yastatic.net https://mc.yandex.ru https://www.google-analytics.com https://analytics.google.com; font-src 'self' https://fonts.gstatic.com https://yastatic.net https://*.yastatic.net data:; frame-src 'self' https://yandex.ru https://*.yandex.ru https://api-maps.yandex.ru; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
