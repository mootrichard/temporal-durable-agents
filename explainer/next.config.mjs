import createMDX from '@next/mdx';
import { recmaCodeHike, remarkCodeHike } from 'codehike/mdx';

/** @type {import('codehike/mdx').CodeHikeConfig} */
const codeHikeConfig = {
  components: { code: 'Code' },
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [[remarkCodeHike, codeHikeConfig]],
    recmaPlugins: [[recmaCodeHike, codeHikeConfig]],
    jsx: true,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  basePath: process.env.PAGES_BASE_PATH ?? '',
  output: 'export',
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  reactStrictMode: true,
  trailingSlash: true,
};

export default withMDX(nextConfig);
