const DEFAULT_ALLOWED_ORIGIN = 'https://www.modoplantas.com';

const allowedOrigins = new Set([
  DEFAULT_ALLOWED_ORIGIN,
  'https://modoplantas.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

export const getCorsHeaders = (request?: Request) => {
  const origin = request?.headers.get('origin') || '';
  const allowOrigin = allowedOrigins.has(origin) ? origin : DEFAULT_ALLOWED_ORIGIN;

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
};

export const corsHeaders = getCorsHeaders();
