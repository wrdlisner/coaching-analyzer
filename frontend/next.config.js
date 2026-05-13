/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'frontend-production-9f67.up.railway.app' }],
        destination: 'https://coachmarks.com/:path*',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
