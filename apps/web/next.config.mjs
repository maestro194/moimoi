/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  // @napi-rs/canvas is a native addon for B50 image generation.
  // It's intentionally untracked (not in package.json) and only needed
  // for /api/b50-image. Mark as external so Next.js never tries to bundle it.
  serverExternalPackages: ['@napi-rs/canvas'],
};

export default nextConfig;
