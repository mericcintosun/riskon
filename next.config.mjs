/** @type {import('next').NextConfig} */
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
};

export default nextConfig;
