import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.seriouseats.com' },
      { protocol: 'https', hostname: '**.skinnytaste.com' },
      { protocol: 'https', hostname: '**.eatingwell.com' },
      { protocol: 'https', hostname: '**.thespruceeats.com' },
      { protocol: 'https', hostname: '**.kulinaria.ge' },
      { protocol: 'https', hostname: 'kulinaria.ge' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.imgix.net' },
      { protocol: 'https', hostname: '**.cloudfront.net' },
      { protocol: 'https', hostname: '**.dotdash.com' },
      { protocol: 'https', hostname: '**.dotdashmdp.com' },
      { protocol: 'https', hostname: '**.allrecipes.com' },
      { protocol: 'https', hostname: 'allrecipes.com' },
      { protocol: 'https', hostname: '**.minimalistbaker.com' },
      { protocol: 'https', hostname: 'minimalistbaker.com' },
      { protocol: 'https', hostname: '**.wp.com' },
      { protocol: 'https', hostname: '**.wordpress.com' },
    ],
  },
  experimental: {
    optimizePackageImports: ['framer-motion', 'lucide-react'],
  },
};

export default nextConfig;
