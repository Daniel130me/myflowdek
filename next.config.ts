import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: [
    'ais-dev-tddx5gz5mxc7hf55ed5r3h-524341738694.europe-west2.run.app',
    'ais-pre-tddx5gz5mxc7hf55ed5r3h-524341738694.europe-west2.run.app',
  ],
};

export default nextConfig;
