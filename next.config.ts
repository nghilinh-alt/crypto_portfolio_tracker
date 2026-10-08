import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The Cash Buckets screen became Profit & Tax; keep old bookmarks working.
      { source: "/cash-buckets", destination: "/profit-tax", permanent: false },
    ];
  },
};

export default nextConfig;
