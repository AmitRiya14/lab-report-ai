import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          }
        ]
      }
    ];
  },

  // Security: Disable x-powered-by header
  poweredByHeader: false,

  // Security: Enable compression
  compress: true,

  // Security: Image optimization settings
  images: {
    domains: ['lh3.googleusercontent.com', 'googleusercontent.com'],
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Security: Redirect HTTP to HTTPS in production
  async redirects() {
    return [
      ...(process.env.NODE_ENV === 'production' ? [{
        source: '/(.*)',
        has: [
          {
            type: 'header',
            key: 'x-forwarded-proto',
            value: 'http',
          },
        ],
        destination: 'https://lab-report-ai.onrender.com/', // Replace with your actual domain
        permanent: true,
      }] : []),
    ];
  },

  // Security: Block suspicious paths
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/admin/:path*',
          destination: '/404',
        },
        {
          source: '/.env',
          destination: '/404',
        },
        {
          source: '/config/:path*',
          destination: '/404',
        },
        {
          source: '/.git/:path*',
          destination: '/404',
        },
        {
          source: '/wp-admin/:path*',
          destination: '/404',
        }
      ],
    };
  },

  // Webpack configuration for security
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      // Client-side security configurations
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: false,
        util: false,
      };
    }

    // Security: Remove source maps in production
    if (!dev) {
      config.devtool = false;
    }

    return config;
  },

  // Experimental features for security
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'sharp', 'canvas'],
  },
};

export default nextConfig;