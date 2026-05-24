/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_ENABLE_CAPTCHA?: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface Window {
  turnstile?: {
    render: (
      container: HTMLElement,
      options: {
        sitekey: string;
        action?: string;
        callback: (token: string) => void;
        'expired-callback': () => void;
        'error-callback': () => void;
        'unsupported-callback'?: () => void;
      }
    ) => string;
    remove: (widgetId: string) => void;
  };
}
