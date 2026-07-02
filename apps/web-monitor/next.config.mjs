/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath: '/monitor',
  transpilePackages: ['@hermes/ui-shared'],
  async redirects() {
    return [
      {
        source: '/',
        destination: '/monitor',
        permanent: false,
        basePath: false,
      },
    ];
  },
};
export default nextConfig;
