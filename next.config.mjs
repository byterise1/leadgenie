const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  serverExternalPackages: ['nodemailer', 'imapflow', 'bullmq', 'ioredis'],
};

export default nextConfig;
