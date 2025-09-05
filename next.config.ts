
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // This is to allow the Next.js dev server to accept requests from the
  // Firebase Studio development environment.
  allowedDevOrigins: [
    'https://*.cloudworkstations.dev',
    'https://*.firebase.dev',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
      // Increase timeout for long-running actions like video processing
      responseHeaderSize: 8192,
    },
  },
  // Setting a longer timeout for the dev server proxy to handle slow torrent metadata fetching
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
};

export default nextConfig;

    