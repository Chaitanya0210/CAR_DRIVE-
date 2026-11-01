/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@groupdrive/ui', '@groupdrive/shared'],
};

export default nextConfig;
