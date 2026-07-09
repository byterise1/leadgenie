const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // Self-hosted on Railway (not Vercel) behind a reverse proxy - Next's
    // built-in optimizer tries to internally re-fetch local /public images
    // to resize/reformat them, and that self-fetch fails in this
    // environment ("isn't a valid image ... received null"), even though
    // the same file serves fine directly and sharp itself is installed.
    // Serve images as-is instead of trying to optimize them.
    unoptimized: true,
  },
  serverExternalPackages: ['nodemailer', 'imapflow', 'bullmq'],
};

export default nextConfig;
