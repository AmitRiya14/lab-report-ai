// 1. UPDATE YOUR EXISTING next.config.ts (ADD SEO IMPROVEMENTS)
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // SEO: Enable React strict mode and compression
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,

  // Security headers (your existing ones + SEO improvements)
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

  // Image optimization for SEO
  images: {
    domains: ['lh3.googleusercontent.com', 'googleusercontent.com'],
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ['image/webp', 'image/avif'], // Modern image formats for better performance
  },

  // SEO: Redirects (update your domain)
  async redirects() {
    return [
      // Your existing HTTPS redirect
      ...(process.env.NODE_ENV === 'production' ? [{
        source: '/(.*)',
        has: [
          {
            type: 'header',
            key: 'x-forwarded-proto',
            value: 'http',
          },
        ],
        destination: 'https://gradelylabs.com/', // UPDATE THIS TO YOUR ACTUAL DOMAIN
        permanent: true,
      }] : []),
      // SEO-friendly redirects
      {
        source: '/dashboard',
        destination: '/',
        permanent: false,
      }
    ];
  },

  // Your existing security rewrites (keep as is)
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

  // Your existing webpack config (keep as is)
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
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

    if (!dev) {
      config.devtool = false;
    }

    return config;
  },

  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'sharp', 'canvas'],
  },
};

export default nextConfig;