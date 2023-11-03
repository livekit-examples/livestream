/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "api.dicebear.com",
      },
      {
        hostname: "user-images.githubusercontent.com",
      },
    ],
  },
};

module.exports = nextConfig;
