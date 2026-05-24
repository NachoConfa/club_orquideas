const allowedOrigins = new Set([
  'https://www.modoplantas.com',
  'https://modoplantas.com',
  'https://club-orquideas.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

const getCorsHeaders = (request: Request) => {
  const origin = request.headers.get('origin') || '';
  const allowOrigin = allowedOrigins.has(origin) ? origin : '*';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
};

const jsonResponse = (request: Request, body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(request),
      'Content-Type': 'application/json',
    },
  });

type TurnstileSiteverifyResponse = {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(request) });
  }

  if (request.method !== 'POST') {
    return jsonResponse(request, { success: false, error: 'Metodo no permitido.' }, 405);
  }

  const secretKey = Deno.env.get('TURNSTILE_SECRET_KEY') || Deno.env.get('CLOUDFLARE_TURNSTILE_SECRET_KEY');

  if (!secretKey) {
    return jsonResponse(request, { success: false, error: 'Falta TURNSTILE_SECRET_KEY.' }, 500);
  }

  let body: { token?: string };

  try {
    body = await request.json();
  } catch {
    return jsonResponse(request, { success: false, error: 'Body invalido.' }, 400);
  }

  if (!body.token) {
    return jsonResponse(request, { success: false, error: 'Falta token.' }, 400);
  }

  const remoteIp =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim();

  const formData = new FormData();
  formData.append('secret', secretKey);
  formData.append('response', body.token);

  if (remoteIp) {
    formData.append('remoteip', remoteIp);
  }

  try {
    const siteverifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const result = (await siteverifyResponse.json()) as TurnstileSiteverifyResponse;

    return jsonResponse(request, {
      success: Boolean(result.success),
      hostname: result.hostname || null,
      action: result.action || null,
      challengeTs: result.challenge_ts || null,
      errorCodes: result['error-codes'] || [],
    });
  } catch (error) {
    console.error('Error verificando Turnstile:', error);
    return jsonResponse(request, { success: false, error: 'No se pudo verificar Turnstile.' }, 500);
  }
});
