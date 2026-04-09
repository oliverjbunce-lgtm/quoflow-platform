/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  turbopack: {},
  images: {
    remotePatterns: [
      { hostname: 'logo.clearbit.com' },
      { hostname: 'avatars.githubusercontent.com' },
    ],
  },
}

module.exports = nextConfig
