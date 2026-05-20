// api/instagram.js
// Maneja el flujo OAuth de Instagram Business Login en un solo endpoint.
// Rutas (via rewrites en vercel.json):
//   /api/ig-auth     → action=auth     — inicia OAuth
//   /api/ig-callback → action=callback — recibe código y guarda token
//   /api/ig-refresh  → action=refresh  — renueva token (cron mensual)
import { createClient } from '@supabase/supabase-js';

const IG_APP_ID      = process.env.IG_APP_ID;
const IG_APP_SECRET  = process.env.IG_APP_SECRET;
const IG_REDIRECT_URI = process.env.IG_REDIRECT_URI;

const supabase = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// ── auth: redirige a Instagram OAuth ──────────────────────────────
async function handleAuth(req, res) {
  const authUrl = new URL('https://www.instagram.com/oauth/authorize');
  authUrl.searchParams.set('client_id',     IG_APP_ID);
  authUrl.searchParams.set('redirect_uri',  IG_REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope',         'instagram_business_basic,instagram_business_manage_messages');
  return res.redirect(302, authUrl.toString());
}

// ── callback: recibe código, canjea por token de 60 días ─────────
async function handleCallback(req, res) {
  const { code, error } = req.query;
  if (error || !code) {
    return res.status(400).send('Error OAuth: ' + (error || 'no se recibió código'));
  }

  // Paso 1: código → token corto (1h)
  const shortRes = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     IG_APP_ID,
      client_secret: IG_APP_SECRET,
      grant_type:    'authorization_code',
      redirect_uri:  IG_REDIRECT_URI,
      code,
    }),
  });
  const shortData = await shortRes.json();
  if (!shortData.access_token) {
    return res.status(500).send('Error token corto: ' + JSON.stringify(shortData));
  }

  // Paso 2: token corto → token largo (60 días)
  const longRes = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${IG_APP_SECRET}&access_token=${shortData.access_token}`
  );
  const longData = await longRes.json();
  if (!longData.access_token) {
    return res.status(500).send('Error token largo: ' + JSON.stringify(longData));
  }

  // Paso 3: guardar en Supabase
  const db = supabase();
  const expiresAt = new Date(Date.now() + longData.expires_in * 1000).toISOString();
  const { error: dbErr } = await db.from('ig_tokens').upsert({
    ig_user_id:   String(shortData.user_id),
    access_token: longData.access_token,
    expires_at:   expiresAt,
    updated_at:   new Date().toISOString(),
  }, { onConflict: 'ig_user_id' });

  if (dbErr) return res.status(500).send('Error al guardar token: ' + dbErr.message);

  return res.status(200).send(
    `✅ Instagram autorizado.\nUsuario ID: ${shortData.user_id}\nToken válido hasta: ${expiresAt}\n\nPuedes cerrar esta ventana.`
  );
}

// ── refresh: renueva token (llamado por cron) ─────────────────────
async function handleRefresh(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end();
  }
  const db = supabase();
  const { data: tokens } = await db.from('ig_tokens').select('*');
  if (!tokens?.length) return res.status(200).json({ ok: false, msg: 'No hay tokens' });

  const results = [];
  for (const row of tokens) {
    const r = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${row.access_token}`
    );
    const data = await r.json();
    if (data.access_token) {
      const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      await db.from('ig_tokens').update({
        access_token: data.access_token,
        expires_at:   expiresAt,
        updated_at:   new Date().toISOString(),
      }).eq('ig_user_id', row.ig_user_id);
      results.push({ ig_user_id: row.ig_user_id, ok: true, expires_at: expiresAt });
    } else {
      results.push({ ig_user_id: row.ig_user_id, ok: false, error: data });
    }
  }
  return res.status(200).json({ ok: true, results });
}

export default async function handler(req, res) {
  const action = req.query.action;
  if (action === 'auth')     return handleAuth(req, res);
  if (action === 'callback') return handleCallback(req, res);
  if (action === 'refresh')  return handleRefresh(req, res);
  return res.status(404).send('Acción no reconocida');
}
