/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  serverExternalPackages: ['@react-pdf/renderer', 'pdfjs-dist'],
  images: {
    remotePatterns: [
      { hostname: 'logo.clearbit.com' },
      { hostname: 'avatars.githubusercontent.com' },
    ],
  },
}
module.exports = nextConfig
