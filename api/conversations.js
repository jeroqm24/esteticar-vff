// api/conversations.js
// Admin CRM endpoint: send messages, toggle bot, update lead/notes, delete

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

const WA_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'esteticar2026';

const sendWAMessage = async (to, text) => {
  if (!WA_TOKEN || !PHONE_ID) return false;
  try {
    const r = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
    });
    return r.ok;
  } catch { return false; }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = req.headers['x-admin-key'];
  if (key !== ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });

  // ── PATCH: update fields (bot_paused, lead_type, admin_notes) ──
  if (req.method === 'PATCH') {
    const { phone, updates } = req.body || {};
    if (!phone || !updates) return res.status(400).json({ error: 'Missing fields' });
    const { error } = await supabaseAdmin
      .from('conversations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('phone', phone);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  // ── POST: admin sends message ──
  if (req.method === 'POST') {
    const { phone, text } = req.body || {};
    if (!phone || !text?.trim()) return res.status(400).json({ error: 'Missing fields' });

    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('history')
      .eq('phone', phone)
      .single();

    const history = Array.isArray(conv?.history) ? conv.history : [];
    const adminMsg = { role: 'admin', content: text.trim(), timestamp: new Date().toISOString() };
    history.push(adminMsg);
    if (history.length > 80) history.splice(0, history.length - 80);

    await supabaseAdmin
      .from('conversations')
      .upsert({ phone, history, updated_at: new Date().toISOString() }, { onConflict: 'phone' });

    let waSent = false;
    if (!phone.startsWith('web_')) {
      waSent = await sendWAMessage(phone, text.trim());
    }

    return res.status(200).json({ ok: true, waSent });
  }

  // ── DELETE: remove conversation ──
  if (req.method === 'DELETE') {
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ error: 'Missing phone' });
    await supabaseAdmin.from('conversations').delete().eq('phone', phone);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
