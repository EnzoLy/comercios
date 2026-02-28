import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // TypeORM uses class names for string-based entity resolution.
      // Minification renames classes (Product → i) breaking these lookups.
      config.optimization.minimize = false;
    }
    return config;
  },
};

export default nextConfig;
