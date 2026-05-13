/** @type {import('next').NextConfig} */
const nextConfig = {
  // PWA-friendly defaults; mobile-first
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Supabase Storage (public bucket story-photos)
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
    ],
  },
};

export default nextConfig;
