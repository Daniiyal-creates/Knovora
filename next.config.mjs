/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep these Node libraries as runtime requires instead of bundling them;
  // pdf-parse (pdfjs) and mammoth don't bundle cleanly in the server webpack.
  serverExternalPackages: ["pdf-parse", "mammoth"],
};

export default nextConfig;
