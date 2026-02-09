import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@suishield/scanner', '@suishield/receipt', '@suishield/ui'],
};

export default nextConfig;
