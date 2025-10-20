import type { NextConfig } from "next";

const nextConfig: NextConfig = {
 images: {
   remotePatterns: [
     { protocol: 'https', hostname: 'images.unsplash.com' },
     { protocol: 'https', hostname: 'res.cloudinary.com' },
     { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
   ],
 },
 // Add timeout configuration for API routes
 serverExternalPackages: [],
 // Increase timeout for API routes
 async rewrites() {
   return [];
 },
};

export default nextConfig;
