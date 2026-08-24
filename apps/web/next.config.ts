import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: [
    '192.168.1.101',
    'localhost',
    '127.0.0.1',
    '192.168.1.0/24',
  ],
};

export default nextConfig;
