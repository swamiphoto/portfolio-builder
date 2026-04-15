/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["storage.googleapis.com"],
    imageSizes: [16, 32, 48, 64, 96, 128, 200, 256, 384, 400],
  },
};

module.exports = nextConfig;
