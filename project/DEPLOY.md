# Deploy de Modo Plantas

## Frontend en Vercel

La app web usa Vite. En Vercel, el root del proyecto debe apuntar a `project`.

Variables publicas del frontend en Vercel:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ENABLE_CAPTCHA=
VITE_TURNSTILE_SITE_KEY=
```

No cargues secrets como variables `VITE_*`. Todo lo que empiece con `VITE_` queda disponible en el navegador.

Build local:

```bash
npm install
npm run build
```

Flujo recomendado:

```bash
git status
git add .
git commit -m "Descripcion del cambio"
git push origin master
```

Vercel redeploya automáticamente cuando recibe cambios en GitHub.

## Supabase Edge Functions

Redeployar una Edge Function cuando cambie su código en `supabase/functions` o `project/supabase/functions`.

Comandos:

```bash
supabase functions deploy verify-turnstile --no-verify-jwt
supabase functions deploy create-mercadopago-preference
supabase functions deploy send-transactional-email
supabase functions deploy mercadopago-webhook --no-verify-jwt
```

Secrets necesarios en Supabase:

```env
RESEND_API_KEY=
FROM_EMAIL=
REPLY_TO_EMAIL=
SITE_URL=
MERCADOPAGO_ACCESS_TOKEN=
SUPABASE_SERVICE_ROLE_KEY=
TURNSTILE_SECRET_KEY=
```

Si usás el nombre alternativo para Turnstile, también es válido:

```env
CLOUDFLARE_TURNSTILE_SECRET_KEY=
```

No escribir valores reales en este archivo.

## Dominio

Dominio de producción esperado:

```text
https://www.modoplantas.com
```

También se contempla:

```text
https://modoplantas.com
```

## Rutas SPA

`vercel.json` reescribe las rutas internas hacia `/index.html` para evitar 404 al refrescar.

La app actualmente maneja páginas y categorías como estado interno de la SPA. Por eso el sitemap solo publica `/` hasta que existan URLs reales para categorías o productos.

## Supabase Storage

La app actualmente usa URLs de imágenes en productos y no llama a `supabase.storage` desde el frontend. El bucket `product-images` queda como mejora pendiente.

Si se integra Storage en una etapa futura, las policies recomendadas son:

- lectura pública de imágenes
- upload/update/delete solo para admins con `public.is_admin(auth.uid())`
