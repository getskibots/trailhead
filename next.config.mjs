/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The categorizer reads/writes JSON run files on the server filesystem and
  // makes outbound fetches. Nothing here ships to the client bundle.
};

export default nextConfig;
