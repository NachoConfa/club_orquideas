import { corsHeaders } from '../_shared/cors.ts';

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
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Metodo no permitido.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const secretKey = Deno.env.get('TURNSTILE_SECRET_KEY');

  if (!secretKey) {
    return new Response(JSON.stringify({ success: false, error: 'Falta TURNSTILE_SECRET_KEY.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { token?: string };

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Body invalido.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!body.token) {
    return new Response(JSON.stringify({ success: false, error: 'Falta token.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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

  const siteverifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  });

  const result = (await siteverifyResponse.json()) as TurnstileSiteverifyResponse;

  return new Response(
    JSON.stringify({
      success: Boolean(result.success),
      hostname: result.hostname || null,
      action: result.action || null,
      challengeTs: result.challenge_ts || null,
      errorCodes: result['error-codes'] || [],
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});
