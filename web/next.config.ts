import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:3000'}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
