/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath: '/admin',
  transpilePackages: ['@hermes/ui-shared'],
  async redirects() {
    return [
      {
        source: '/',
        destination: '/admin',
        permanent: false,
        basePath: false,
      },
    ];
  },
};
export default nextConfig;
