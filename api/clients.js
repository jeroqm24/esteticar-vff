// api/clients.js — delete client (conversations + clients tables)
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'esteticar2026';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = req.headers['x-admin-key'];
  if (key !== ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'DELETE') {
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ error: 'Missing phone' });
    await Promise.all([
      supabaseAdmin.from('conversations').delete().eq('phone', phone),
      supabaseAdmin.from('clients').delete().eq('phone', phone),
    ]);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
