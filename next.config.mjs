/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  // Skip static export prerendering for pages that use client-side state
  // The app is a fully dynamic SPA — no static prerendering needed
  output: undefined,
}

export default nextConfig
