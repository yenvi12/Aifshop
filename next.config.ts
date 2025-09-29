import type { NextConfig } from "next";

const nextConfig: NextConfig = {
 images: {
    // cách ngắn
    domains: ['images.unsplash.com'],
    // hoặc cách chi tiết
    // remotePatterns: [
    //   { protocol: 'https', hostname: 'images.unsplash.com' },
    // ],
  },
};

export default nextConfig;
