// api/ig-refresh.js
// Renueva el token de Instagram antes de que expire.
// Llamado por cron de Vercel cada 30 días.
// Endpoint de Meta: GET /refresh_access_token?grant_type=ig_refresh_token
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end();
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  );

  const { data: tokens, error } = await supabase.from('ig_tokens').select('*');
  if (error || !tokens?.length) {
    return res.status(200).json({ ok: false, msg: 'No hay tokens que renovar' });
  }

  const results = [];

  for (const row of tokens) {
    const refreshRes = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${row.access_token}`
    );
    const refreshData = await refreshRes.json();

    if (refreshData.access_token) {
      const expiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
      await supabase.from('ig_tokens').update({
        access_token: refreshData.access_token,
        expires_at:   expiresAt,
        updated_at:   new Date().toISOString(),
      }).eq('ig_user_id', row.ig_user_id);
      results.push({ ig_user_id: row.ig_user_id, ok: true, expires_at: expiresAt });
    } else {
      results.push({ ig_user_id: row.ig_user_id, ok: false, error: refreshData });
    }
  }

  return res.status(200).json({ ok: true, results });
}
