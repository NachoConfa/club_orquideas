import { supabase } from '../lib/supabase';

export const TURNSTILE_REQUIRED_MESSAGE = 'Completá la verificación de seguridad para continuar.';
export const TURNSTILE_FAILED_MESSAGE = 'No pudimos verificar que seas una persona real. Intentá nuevamente.';
export const TURNSTILE_LOAD_FAILED_MESSAGE =
  'No pudimos cargar la verificación de seguridad. Recargá la página o intentá más tarde.';

const DISABLED_TURNSTILE_TOKEN = 'turnstile-disabled';

let hasWarnedAboutMissingSiteKey = false;

export const getTurnstileSiteKey = () => import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || '';

export const getDisabledTurnstileToken = () => DISABLED_TURNSTILE_TOKEN;

export const isTurnstileFlagEnabled = () => import.meta.env.VITE_ENABLE_CAPTCHA === 'true';

export const isTurnstileEnabled = () => {
  const enabled = isTurnstileFlagEnabled();
  const hasSiteKey = Boolean(getTurnstileSiteKey());

  if (enabled && !hasSiteKey && !hasWarnedAboutMissingSiteKey) {
    console.warn('VITE_ENABLE_CAPTCHA=true pero falta VITE_TURNSTILE_SITE_KEY. Turnstile no se va a renderizar.');
    hasWarnedAboutMissingSiteKey = true;
  }

  return enabled && hasSiteKey;
};

const disabledCaptchaResponse = (reason) => {
  console.warn(`Turnstile desactivado: ${reason}`);
  return {
    success: true,
    captchaDisabled: true,
    reason,
  };
};

const withTurnstileTimeout = (operation) =>
  Promise.race([
    operation,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error('La verificación de seguridad tardó demasiado.')), 8000);
    }),
  ]);

export const verifyTurnstileToken = async (token) => {
  if (!isTurnstileEnabled()) {
    return disabledCaptchaResponse('VITE_ENABLE_CAPTCHA no está en true o falta VITE_TURNSTILE_SITE_KEY');
  }

  if (!token || token === DISABLED_TURNSTILE_TOKEN) {
    return {
      success: false,
      error: TURNSTILE_REQUIRED_MESSAGE,
    };
  }

  if (supabase) {
    const { data, error } = await withTurnstileTimeout(
      supabase.functions.invoke('verify-turnstile', {
        body: { token },
      })
    );

    if (error) {
      throw new Error(error.message || TURNSTILE_FAILED_MESSAGE);
    }

    return {
      success: Boolean(data?.success),
      data,
      error: data?.error || null,
    };
  }

  const response = await withTurnstileTimeout(
    fetch('/api/verify-turnstile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })
  );

  if (!response.ok) {
    throw new Error(TURNSTILE_FAILED_MESSAGE);
  }

  const data = await response.json();

  return {
    success: Boolean(data?.success),
    data,
    error: data?.error || null,
  };
};
