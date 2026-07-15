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
  // In development, Next's default source map (`eval-source-map`) wraps modules
  // in eval(), which a strict Content-Security-Policy (e.g. from a browser
  // extension) blocks, breaking Fast Refresh so code changes never hot-apply.
  // A non-eval source map keeps HMR working under such a CSP.
  webpack: (config, { dev }) => {
    if (dev) config.devtool = 'cheap-module-source-map'
    return config
  },
};

module.exports = nextConfig;
