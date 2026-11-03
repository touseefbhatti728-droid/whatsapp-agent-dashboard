/** @type {import('next').NextConfig} */
const nextConfig = {
  // The admin assistant reads its rules file at runtime — ship it with that function.
  outputFileTracingIncludes: {
    "/api/assistant": ["./src/lib/assistant/RULES.md"],
  },
};
export default nextConfig;
