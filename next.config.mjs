/** @type {import('next').NextConfig} */
const nextConfig = {
  // BigQuery client must not be bundled for the browser — server-side only.
  // Next 14 still uses the experimental key for this option.
  experimental: {
    serverComponentsExternalPackages: ['@google-cloud/bigquery'],
  },
};

export default nextConfig;
