import type { NextConfig } from "next";

const nextConfig: NextConfig = {
 images: {
   // cách ngắn
   domains: ['images.unsplash.com', 'res.cloudinary.com'],
   // hoặc cách chi tiết
   // remotePatterns: [
   //   { protocol: 'https', hostname: 'images.unsplash.com' },
   //   { protocol: 'https', hostname: 'res.cloudinary.com' },
   // ],
 },
};

export default nextConfig;
