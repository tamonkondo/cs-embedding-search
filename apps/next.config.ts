import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  turbopack: {
    // Ensure Turbopack resolves locale-aware routes correctly and picks the app workspace.
    resolveExtensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    root: __dirname,
  },
};

export default withNextIntl(nextConfig);
