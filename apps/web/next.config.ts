import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_API_URL || process.env.NEXT_PUBLIC_API_URL || '',
    NEXT_API_URL: process.env.NEXT_API_URL || process.env.NEXT_PUBLIC_API_URL || '',
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_APP_NAME || process.env.NEXT_PUBLIC_APP_NAME || '',
    NEXT_APP_NAME: process.env.NEXT_APP_NAME || process.env.NEXT_PUBLIC_APP_NAME || '',
  },
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
