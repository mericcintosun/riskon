/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === "production";

const contentSecurityPolicy = `
  default-src 'self';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  object-src 'none';
  script-src 'self' 'unsafe-inline' ${isProduction ? "" : "'unsafe-eval'"} https://www.googletagmanager.com https://vercel.live https://plausible.io https://browser.sentry-cdn.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: blob: https: https://vercel.com;
  font-src 'self' data: https://fonts.gstatic.com;
  connect-src 'self' https://horizon-testnet.stellar.org https://soroban-testnet.stellar.org https://*.stellar.org https://api.vercel.com https://vitals.vercel-insights.com https://*.sentry.io https://plausible.io;
  worker-src 'self' blob:;
  frame-src 'self';
  child-src 'none';
  manifest-src 'self';
  media-src 'self';
  prefetch-src 'self';
  navigate-to 'self';
  require-trusted-types-for 'script';
  trusted-types default;
  upgrade-insecure-requests;
  block-all-mixed-content;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig = {
  transpilePackages: [
    "passkey-kit",
    "passkey-factory-sdk",
    "passkey-kit-sdk",
    "sac-sdk",
    "@stellar/stellar-sdk",
  ],
  turbopack: {
    resolveAlias: {
      "sodium-native": "./src/lib/mocks/empty.js",
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "sodium-native": false,
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "X-RateLimit-Limit",
            value: "100",
          },
          {
            key: "X-RateLimit-Remaining",
            value: "99",
          },
          {
            key: "X-RateLimit-Reset",
            value: new Date(Date.now() + 60 * 1000).toISOString(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
