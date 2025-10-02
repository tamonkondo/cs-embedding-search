import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    turbo: {
      // Ensure Turbopack resolves locale-aware routes correctly.
      resolveExtensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    },
  },
};

export default withNextIntl(nextConfig);
