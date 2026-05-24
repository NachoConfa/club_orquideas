export const TURNSTILE_REQUIRED_MESSAGE: string;
export const TURNSTILE_FAILED_MESSAGE: string;
export const TURNSTILE_LOAD_FAILED_MESSAGE: string;

export interface TurnstileVerificationResult {
  success: boolean;
  localBypass?: boolean;
  captchaDisabled?: boolean;
  reason?: string;
  error?: string | null;
  data?: unknown;
}

export function getTurnstileSiteKey(): string;
export function getDisabledTurnstileToken(): string;
export function isTurnstileFlagEnabled(): boolean;
export function isTurnstileEnabled(): boolean;
export function verifyTurnstileToken(token: string): Promise<TurnstileVerificationResult>;
