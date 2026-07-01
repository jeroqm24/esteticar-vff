// api/conversations.js
// Admin CRM endpoint: send messages, toggle bot, update lead/notes, delete

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

const WA_TOKEN      = process.env.WHATSAPP_TOKEN;
const PHONE_ID      = process.env.WHATSAPP_PHONE_NUMBER_ID;
const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN;
const ADMIN_SECRET  = process.env.ADMIN_SECRET || 'esteticar2026';

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

const sendIGMessage = async (recipientId, text) => {
  try {
    const { data } = await supabaseAdmin
      .from('ig_tokens')
      .select('access_token')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    const token = data?.access_token;
    if (!token) return false;
    const r = await fetch(`https://graph.instagram.com/v21.0/me/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
    });
    return r.ok;
  } catch { return false; }
};

const sendFBMessage = async (recipientId, text) => {
  if (!FB_PAGE_TOKEN) return false;
  try {
    const r = await fetch(`https://graph.facebook.com/v20.0/me/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${FB_PAGE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
    });
    return r.ok;
  } catch { return false; }
};

// WA: sube el buffer directo a Meta Media API → recibe media_id → envía sin necesitar URL pública
const sendWAAudio = async (to, buffer, mimeType) => {
  if (!WA_TOKEN || !PHONE_ID) return false;
  try {
    const fullMime = mimeType || 'audio/ogg; codecs=opus';
    const baseMime = fullMime.split(';')[0].trim();
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('type', fullMime);
    form.append('file', new Blob([buffer], { type: fullMime }),
      baseMime.includes('ogg') ? 'voice.ogg' : 'voice.webm');
    const upload = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WA_TOKEN}` },
      body: form,
    });
    const { id: mediaId } = await upload.json();
    if (!mediaId) return false;
    const r = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'audio', audio: { id: mediaId } }),
    });
    return r.ok;
  } catch { return false; }
};

const sendIGAudio = async (recipientId, audioUrl) => {
  try {
    const { data } = await supabaseAdmin.from('ig_tokens').select('access_token').order('updated_at', { ascending: false }).limit(1).single();
    const token = data?.access_token;
    if (!token) return false;
    const r = await fetch(`https://graph.instagram.com/v21.0/me/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: recipientId }, message: { attachment: { type: 'audio', payload: { url: audioUrl, is_reusable: false } } } }),
    });
    return r.ok;
  } catch { return false; }
};

const sendFBAudio = async (recipientId, audioUrl) => {
  if (!FB_PAGE_TOKEN) return false;
  try {
    const r = await fetch(`https://graph.facebook.com/v20.0/me/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${FB_PAGE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: recipientId }, message: { attachment: { type: 'audio', payload: { url: audioUrl, is_reusable: false } } } }),
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

  // ── GET: list conversations (service_role → bypasses RLS) ──
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select('phone, session_id, history, client_name, updated_at, created_at, lead_type, bot_paused, vehicle_type, vehicle_plate, client_email, last_service, direccion, objection, remarketing_status')
      .order('updated_at', { ascending: false })
      .limit(300);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data || []);
  }

  // ── PATCH: update fields (whitelist only) ──
  if (req.method === 'PATCH') {
    const { phone, updates } = req.body || {};
    if (!phone || !updates) return res.status(400).json({ error: 'Missing fields' });
    const ALLOWED = ['bot_paused', 'lead_type', 'remarketing_status', 'admin_notes', 'objection', 'client_name', 'client_email', 'vehicle_type', 'vehicle_plate', 'last_service', 'direccion'];
    const safe = Object.fromEntries(Object.entries(updates).filter(([k]) => ALLOWED.includes(k)));
    if (Object.keys(safe).length === 0) return res.status(400).json({ error: 'No valid fields' });
    const { error } = await supabaseAdmin
      .from('conversations')
      .update({ ...safe, updated_at: new Date().toISOString() })
      .eq('phone', phone);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  // ── POST: admin sends message or audio ──
  if (req.method === 'POST') {
    const { phone, type } = req.body || {};
    if (!phone) return res.status(400).json({ error: 'Missing phone' });

    if (type === 'audio') {
      const { audioBase64, mimeType } = req.body;
      if (!audioBase64) return res.status(400).json({ error: 'Missing audio' });

      const buffer = Buffer.from(audioBase64, 'base64');

      // Subir a Supabase Storage (para IG/FB y panel; no-bloqueante si falla)
      let publicUrl = null;
      try {
        const ext = (mimeType || '').includes('ogg') ? 'ogg' : 'webm';
        const filename = `${Date.now()}-${phone.replace(/[^a-z0-9]/gi, '_')}.${ext}`;
        await supabaseAdmin.storage.createBucket('audio-admin', { public: true }).catch(() => {});
        const { error: upErr } = await supabaseAdmin.storage
          .from('audio-admin')
          .upload(filename, buffer, { contentType: (mimeType || 'audio/webm').split(';')[0], upsert: true });
        if (!upErr) {
          const { data } = supabaseAdmin.storage.from('audio-admin').getPublicUrl(filename);
          publicUrl = data.publicUrl;
        }
      } catch {}

      const { data: conv } = await supabaseAdmin.from('conversations').select('history').eq('phone', phone).single();
      const history = Array.isArray(conv?.history) ? conv.history : [];
      history.push({ role: 'admin', content: '🎵 Audio', audioUrl: publicUrl || '', timestamp: new Date().toISOString() });
      if (history.length > 80) history.splice(0, history.length - 80);
      await supabaseAdmin.from('conversations').upsert({ phone, history, updated_at: new Date().toISOString() }, { onConflict: 'phone' });

      let sent = false;
      if (phone.startsWith('ig_')) {
        if (publicUrl) sent = await sendIGAudio(phone.replace('ig_', ''), publicUrl);
      } else if (phone.startsWith('fb_')) {
        if (publicUrl) sent = await sendFBAudio(phone.replace('fb_', ''), publicUrl);
      } else if (!phone.startsWith('web_')) {
        // WA: sube buffer directo a Meta → no necesita URL pública ni formato específico
        sent = await sendWAAudio(phone, buffer, mimeType);
      }

      return res.status(200).json({ ok: true, sent, audioUrl: publicUrl });
    }

    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Missing fields' });

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

    let sent = false;
    if (phone.startsWith('ig_')) {
      const rawId = phone.replace('ig_', '');
      sent = await sendIGMessage(rawId, text.trim());
    } else if (phone.startsWith('fb_')) {
      const rawId = phone.replace('fb_', '');
      sent = await sendFBMessage(rawId, text.trim());
    } else if (!phone.startsWith('web_')) {
      sent = await sendWAMessage(phone, text.trim());
    }

    return res.status(200).json({ ok: true, sent });
  }

  // ── DELETE: remove records ──
  if (req.method === 'DELETE') {
    const { phone, scope } = req.body || {};
    if (!phone) return res.status(400).json({ error: 'Missing phone' });
    if (scope === 'clients') {
      // Desde vista de clientes: borra clients + citas, conserva chats
      await Promise.all([
        supabaseAdmin.from('clients').delete().eq('phone', phone),
        supabaseAdmin.from('appointments').delete().eq('client_phone', phone),
      ]);
    } else {
      // Desde vista de chats: borra conversation + client
      await Promise.all([
        supabaseAdmin.from('conversations').delete().eq('phone', phone),
        supabaseAdmin.from('clients').delete().eq('phone', phone),
      ]);
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
