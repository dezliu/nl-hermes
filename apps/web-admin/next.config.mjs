/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath: '/admin',
  transpilePackages: ['@hermes/ui-shared'],
};
export default nextConfig;
