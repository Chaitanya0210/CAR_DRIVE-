/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.DOCKER_BUILD ? 'standalone' : undefined,
  transpilePackages: ['@groupdrive/ui', '@groupdrive/shared'],
};

export default nextConfig;
