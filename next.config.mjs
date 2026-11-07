/** @type {import('next').NextConfig} */
const nextConfig = {
  // The admin assistant reads its rules file at runtime — ship it with that function.
  // PDF uploads to the Knowledge page go through a server action (default limit is 1 MB).
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
  outputFileTracingIncludes: {
    "/api/assistant": ["./src/lib/assistant/RULES.md"],
  },
};
export default nextConfig;
