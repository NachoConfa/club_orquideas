# Supabase Auth Email Templates

Estos templates son para copiar y pegar en Supabase Dashboard > Authentication > Email Templates.

## Confirm Signup

Subject:

```text
Confirmá tu cuenta en Modo Plantas
```

HTML:

```html
<!doctype html>
<html>
  <body style="margin:0;background:#fff8ef;font-family:Arial,Helvetica,sans-serif;color:#1f2933;">
    <table role="presentation" width="100%" style="border-collapse:collapse;background:#fff8ef;padding:24px 0;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="100%" style="max-width:620px;border-collapse:collapse;background:#ffffff;border:1px solid #f1e3d4;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:30px 28px 28px;">
                <div style="text-align:center;margin-bottom:24px;">
                  <h1 style="margin:0;color:#0f8f61;font-size:26px;line-height:1.2;font-weight:700;">Modo Plantas</h1>
                  <p style="margin:6px 0 0;color:#1f2933;font-size:14px;">Pasión por la naturaleza</p>
                </div>
                <h2 style="margin:0 0 16px;color:#1f2933;font-size:24px;line-height:1.25;">Confirmá tu cuenta</h2>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.65;">Gracias por crear tu cuenta en Modo Plantas.</p>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.65;">Tocá el siguiente botón para confirmar tu email y empezar a gestionar tus pedidos.</p>
                <div style="text-align:center;margin:26px 0 6px;">
                  <a href="{{ .ConfirmationURL }}" style="display:inline-block;border-radius:999px;background:#0f8f61;color:#ffffff;text-decoration:none;padding:13px 24px;font-weight:700;font-size:14px;">Confirmar cuenta</a>
                </div>
                <p style="margin:26px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">Si no creaste esta cuenta, podés ignorar este mensaje.</p>
                <div style="border-top:1px solid #f1e3d4;margin-top:30px;padding-top:20px;text-align:center;color:#6b7280;font-size:13px;line-height:1.6;">
                  <p style="margin:0 0 6px;">WhatsApp: +54 9 11 2290 6442</p>
                  <p style="margin:0;">Este email fue enviado automáticamente. Por favor, no respondas a este mensaje.</p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

## Reset Password

Subject:

```text
Recuperá tu contraseña
```

HTML:

```html
<!doctype html>
<html>
  <body style="margin:0;background:#fff8ef;font-family:Arial,Helvetica,sans-serif;color:#1f2933;">
    <table role="presentation" width="100%" style="border-collapse:collapse;background:#fff8ef;padding:24px 0;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="100%" style="max-width:620px;border-collapse:collapse;background:#ffffff;border:1px solid #f1e3d4;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:30px 28px 28px;">
                <div style="text-align:center;margin-bottom:24px;">
                  <h1 style="margin:0;color:#0f8f61;font-size:26px;line-height:1.2;font-weight:700;">Modo Plantas</h1>
                  <p style="margin:6px 0 0;color:#1f2933;font-size:14px;">Pasión por la naturaleza</p>
                </div>
                <h2 style="margin:0 0 16px;color:#1f2933;font-size:24px;line-height:1.25;">Recuperá tu contraseña</h2>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.65;">Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.65;">Para crear una nueva contraseña, tocá el siguiente botón:</p>
                <div style="text-align:center;margin:26px 0 6px;">
                  <a href="{{ .ConfirmationURL }}" style="display:inline-block;border-radius:999px;background:#0f8f61;color:#ffffff;text-decoration:none;padding:13px 24px;font-weight:700;font-size:14px;">Restablecer contraseña</a>
                </div>
                <p style="margin:26px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">Si no pediste este cambio, podés ignorar este mensaje. Tu contraseña actual seguirá siendo válida.</p>
                <div style="border-top:1px solid #f1e3d4;margin-top:30px;padding-top:20px;text-align:center;color:#6b7280;font-size:13px;line-height:1.6;">
                  <p style="margin:0 0 6px;">WhatsApp: +54 9 11 2290 6442</p>
                  <p style="margin:0;">Este email fue enviado automáticamente. Por favor, no respondas a este mensaje.</p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```
