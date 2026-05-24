# Supabase Edge Functions

These functions keep Mercado Pago credentials out of the React app.

Required secrets:

```bash
supabase secrets set MERCADOPAGO_ACCESS_TOKEN="APP_USR_REPLACE_WITH_ROTATED_TOKEN"
supabase secrets set TURNSTILE_SECRET_KEY="0x4AAAA_REPLACE_WITH_SECRET_KEY"
supabase secrets set SITE_URL="https://your-production-domain.com"
```

Deploy:

```bash
supabase functions deploy create-mercadopago-preference
supabase functions deploy verify-turnstile
supabase functions deploy mercadopago-webhook --no-verify-jwt
```

`mercadopago-webhook` must be public because Mercado Pago calls it directly. It verifies payment status by querying Mercado Pago before updating Supabase.

`verify-turnstile` receives the frontend token and validates it against Cloudflare with `TURNSTILE_SECRET_KEY`. Never put that secret in a `VITE_` variable.
