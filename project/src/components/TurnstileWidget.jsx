import { useEffect, useRef, useState } from 'react';
import {
  TURNSTILE_LOAD_FAILED_MESSAGE,
  getDisabledTurnstileToken,
  getTurnstileSiteKey,
  isTurnstileEnabled,
} from '../services/turnstileService';

const TURNSTILE_SCRIPT_ID = 'cloudflare-turnstile-script';
const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const SCRIPT_LOAD_TIMEOUT_MS = 8000;

let turnstileScriptPromise = null;

const loadTurnstileScript = () => {
  if (window.turnstile) {
    return Promise.resolve();
  }

  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID);
    const script = existingScript || document.createElement('script');

    const timeoutId = window.setTimeout(() => {
      turnstileScriptPromise = null;
      reject(new Error('Turnstile script load timeout.'));
    }, SCRIPT_LOAD_TIMEOUT_MS);

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
    };

    function handleLoad() {
      cleanup();
      if (window.turnstile) {
        resolve();
        return;
      }

      turnstileScriptPromise = null;
      reject(new Error('Turnstile API unavailable after script load.'));
    }

    function handleError() {
      cleanup();
      turnstileScriptPromise = null;
      reject(new Error('Turnstile script failed to load.'));
    }

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });

    if (!existingScript) {
      script.id = TURNSTILE_SCRIPT_ID;
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });

  return turnstileScriptPromise;
};

const TurnstileWidget = ({ onVerify, onExpire, onError, action = 'form', className = '' }) => {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [configError, setConfigError] = useState('');
  const [loadError, setLoadError] = useState('');
  const turnstileEnabled = isTurnstileEnabled();

  useEffect(() => {
    if (!turnstileEnabled) {
      onVerify(getDisabledTurnstileToken());
      return undefined;
    }

    const siteKey = getTurnstileSiteKey();

    if (!siteKey) {
      onVerify('');
      setConfigError(TURNSTILE_LOAD_FAILED_MESSAGE);
      return undefined;
    }

    let isMounted = true;

    const renderWidget = () => {
      if (!isMounted || !containerRef.current || !window.turnstile || widgetIdRef.current !== null) {
        return;
      }

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          callback: (token) => {
            setLoadError('');
            onVerify(token);
          },
          'expired-callback': () => {
            onVerify('');
            onExpire?.();
          },
          'error-callback': () => {
            onVerify('');
            setLoadError(TURNSTILE_LOAD_FAILED_MESSAGE);
            onError?.();
          },
          'unsupported-callback': () => {
            onVerify('');
            setLoadError(TURNSTILE_LOAD_FAILED_MESSAGE);
            onError?.();
          },
        });
      } catch (error) {
        console.error('Error renderizando Turnstile:', error);
        onVerify('');
        setLoadError(TURNSTILE_LOAD_FAILED_MESSAGE);
        onError?.();
      }
    };

    setConfigError('');
    setLoadError('');

    loadTurnstileScript()
      .then(() => {
        if (isMounted) {
          renderWidget();
        }
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        console.error('Error cargando Turnstile:', error);
        onVerify('');
        setLoadError(TURNSTILE_LOAD_FAILED_MESSAGE);
        onError?.();
      });

    return () => {
      isMounted = false;

      if (window.turnstile && widgetIdRef.current !== null) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (error) {
          console.warn('No se pudo remover el widget de Turnstile:', error);
        }

        widgetIdRef.current = null;
      }
    };
  }, [action, onError, onExpire, onVerify, turnstileEnabled]);

  if (!turnstileEnabled) {
    return null;
  }

  const errorMessage = configError || loadError;

  if (errorMessage) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {errorMessage}
      </div>
    );
  }

  return (
    <div className={className}>
      <div ref={containerRef} />
    </div>
  );
};

export default TurnstileWidget;
