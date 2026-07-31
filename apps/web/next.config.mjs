/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@dahamkee/shared', '@dahamkee/domain'],
};

export default nextConfig;
