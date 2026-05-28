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

## Schema SQL versionado

El schema de referencia esta en:

```text
database/supabase-schema.sql
```

Incluye las columnas `stock_mode` en `products` y `product_variants` para soportar:

- `quantity`: stock con cantidad numerica.
- `consult`: consultar disponibilidad antes de comprar.

Si se replica el proyecto en otra base, ejecutar primero el SQL versionado y verificar que PostgREST recargue el schema.

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

La app usa Supabase Storage desde el Admin para subir y limpiar imágenes de productos y variantes.

Bucket requerido:

```text
product-images
```

Configuración recomendada:

- Public bucket: `true`
- Límite de archivo: 5 MB
- MIME types permitidos: `image/jpeg`, `image/png`, `image/webp`

Policies versionadas en `database/supabase-schema.sql`:

- lectura pública de imágenes
- upload/update/delete solo para admins con `public.is_admin(auth.uid())`

No uses `SUPABASE_SERVICE_ROLE_KEY` en el frontend para Storage.
