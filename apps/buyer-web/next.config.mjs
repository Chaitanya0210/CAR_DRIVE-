/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@groupdrive/ui', '@groupdrive/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
