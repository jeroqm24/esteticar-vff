// api/ig-callback.js
// Recibe el código OAuth de Instagram, lo canjea por token corto,
// luego lo canjea por token de 60 días y lo guarda en Supabase.
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error || !code) {
    return res.status(400).send('Error OAuth: ' + (error || 'no se recibió código'));
  }

  // ── Paso 1: canjear código por token de corta duración (1h) ──
  const shortRes = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.IG_APP_ID,
      client_secret: process.env.IG_APP_SECRET,
      grant_type:    'authorization_code',
      redirect_uri:  process.env.IG_REDIRECT_URI,
      code,
    }),
  });
  const shortData = await shortRes.json();

  if (!shortData.access_token) {
    return res.status(500).send('Error al obtener token corto: ' + JSON.stringify(shortData));
  }

  // ── Paso 2: canjear por token de larga duración (60 días) ──
  const longRes = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.IG_APP_SECRET}&access_token=${shortData.access_token}`
  );
  const longData = await longRes.json();

  if (!longData.access_token) {
    return res.status(500).send('Error al obtener token largo: ' + JSON.stringify(longData));
  }

  // ── Paso 3: guardar en Supabase ──
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  );

  const expiresAt = new Date(Date.now() + longData.expires_in * 1000).toISOString();

  const { error: dbErr } = await supabase.from('ig_tokens').upsert({
    ig_user_id:   String(shortData.user_id),
    access_token: longData.access_token,
    expires_at:   expiresAt,
    updated_at:   new Date().toISOString(),
  }, { onConflict: 'ig_user_id' });

  if (dbErr) {
    return res.status(500).send('Token obtenido pero error al guardar en DB: ' + dbErr.message);
  }

  return res.status(200).send(
    `✅ Instagram autorizado correctamente.\n` +
    `Usuario ID: ${shortData.user_id}\n` +
    `Token válido hasta: ${expiresAt}\n\n` +
    `Puedes cerrar esta ventana.`
  );
}
