/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === "production";

const contentSecurityPolicy = `
  default-src 'self';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  object-src 'none';
  script-src 'self' 'unsafe-inline' ${isProduction ? "" : "'unsafe-eval'"} https:;
  style-src 'self' 'unsafe-inline' https:;
  img-src 'self' data: blob: https:;
  font-src 'self' data: https:;
  connect-src 'self' https://horizon-testnet.stellar.org https://soroban-testnet.stellar.org https://*.stellar.org https:;
  worker-src 'self' blob:;
  frame-src 'self';
  upgrade-insecure-requests;
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
          // Prevents browsers from sending the Referer header to cross-origin requests
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          // Restricts access to browser features/APIs
          {
            key: "Permissions-Policy",
            value: [
              "camera=()",
              "microphone=()",
              "geolocation=()",
              "browsing-topics=()",
              "interest-cohort=()",
              "payment=(self)",
              "usb=()",
              "bluetooth=()",
            ].join(", "),
          },
          // Legacy XSS protection for older browsers
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
