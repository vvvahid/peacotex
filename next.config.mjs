/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Database drivers load native/WASM assets at runtime; keep them out of the bundle.
  serverExternalPackages: ["pg", "@electric-sql/pglite"],
  // Migrations are read from disk at runtime; ship them with every server function.
  outputFileTracingIncludes: { "/**/*": ["./db/migrations/**/*"] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Demo site: never indexed.
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
