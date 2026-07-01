/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath: '/monitor',
  transpilePackages: ['@hermes/ui-shared'],
};
export default nextConfig;
