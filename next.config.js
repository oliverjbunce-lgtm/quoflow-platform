/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  images: {
    remotePatterns: [
      { hostname: 'logo.clearbit.com' },
      { hostname: 'avatars.githubusercontent.com' },
    ],
  },
}
module.exports = nextConfig
