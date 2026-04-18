/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: '*.r2.dev' },
    ],
    imageSizes: [16, 32, 48, 64, 96, 128, 200, 256, 384, 400],
  },
};

module.exports = nextConfig;
