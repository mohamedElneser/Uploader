/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Helps avoid surprising bundling of node-only modules in client code
    serverComponentsExternalPackages: [],
  },
};

export default nextConfig;
