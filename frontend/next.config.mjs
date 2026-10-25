function getBackendUrl() {
  const raw = (process.env.API_INTERNAL_URL || '').trim();
  if (!raw) {
    // Only default to localhost when running locally and NOT on Vercel
    if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
      return 'http://127.0.0.1:8000';
    }
    return '';
  }
  let url = raw.replace(/\/+$/, '');
  if (url.endsWith('/api')) {
    url = url.slice(0, -4).replace(/\/+$/, '');
  }
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
}

const backendUrl = getBackendUrl();

const nextConfig = {
  devIndicators: false,
  allowedDevOrigins: ['*.e2b.app'],
  async rewrites() {
    if (!backendUrl) {
      return [];
    }
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: `${backendUrl}/api/:path*`,
        },
      ],
    };
  },
};
export default nextConfig;

