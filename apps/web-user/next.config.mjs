/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath: '',
  transpilePackages: ['@hermes/ui-shared'],
};
export default nextConfig;
