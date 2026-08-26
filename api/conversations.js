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

// ── WebM/Opus → OGG/Opus remuxer (pure JS, no re-encoding) ──────────────────
// WhatsApp soporta audio/ogg pero NO audio/webm. Chrome solo graba webm.
// Ambos usan paquetes Opus idénticos — solo difiere el contenedor.

const OGG_CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let r = i << 24;
    for (let j = 0; j < 8; j++) r = (r & 0x80000000) ? ((r << 1) ^ 0x04c11db7) : (r << 1);
    t[i] = r >>> 0;
  }
  return t;
})();

function oggCrc32(buf) {
  let crc = 0;
  for (let i = 0; i < buf.length; i++) crc = ((crc << 8) ^ OGG_CRC_TABLE[((crc >>> 24) ^ buf[i]) & 0xFF]) >>> 0;
  return crc;
}

function readEbmlVint(buf, offset) {
  const b = buf[offset];
  if (b & 0x80) return [b & 0x7F, 1];
  if (b & 0x40) return [((b & 0x3F) << 8) | buf[offset + 1], 2];
  if (b & 0x20) return [((b & 0x1F) << 16) | (buf[offset + 1] << 8) | buf[offset + 2], 3];
  if (b & 0x10) return [((b & 0x0F) << 24) | (buf[offset + 1] << 16) | (buf[offset + 2] << 8) | buf[offset + 3], 4];
  return [0, 1];
}

function buildOggPage(packetData, granule, serial, seqno, headerType) {
  // Segment table: split packet into ≤255-byte segments
  const segs = [];
  for (let o = 0; o < packetData.length || segs.length === 0; o += 255) {
    segs.push(Math.min(255, packetData.length - o));
    if (packetData.length - o <= 255) break;
  }
  // If packet size is exact multiple of 255, add terminating 0-segment
  if (packetData.length > 0 && packetData.length % 255 === 0) segs.push(0);

  const hdrSize = 27 + segs.length;
  const page = Buffer.alloc(hdrSize + packetData.length, 0);
  let o = 0;
  page.write('OggS', o);       o += 4;
  page[o++] = 0;                // stream structure version
  page[o++] = headerType;       // 0=normal, 2=BOS, 4=EOS
  page.writeBigInt64LE(BigInt(granule), o); o += 8;
  page.writeInt32LE(serial, o); o += 4;
  page.writeInt32LE(seqno, o);  o += 4;
  const crcOffset = o;          o += 4; // filled after
  page[o++] = segs.length;
  for (const s of segs) page[o++] = s;
  packetData.copy(page, o);
  page.writeUInt32LE(oggCrc32(page), crcOffset);
  return page;
}

function buildOpusTags() {
  const vendor = Buffer.from('webm-to-ogg');
  const out = Buffer.alloc(8 + 4 + vendor.length + 4);
  let o = 0;
  out.write('OpusTags', o); o += 8;
  out.writeUInt32LE(vendor.length, o); o += 4;
  vendor.copy(out, o);     o += vendor.length;
  out.writeUInt32LE(0, o); // 0 user comments
  return out;
}

function remuxWebmToOgg(inputBuffer) {
  try {
    const buf = Buffer.isBuffer(inputBuffer) ? inputBuffer : Buffer.from(inputBuffer);

    // Find "OpusHead" magic bytes → CodecPrivate in WebM
    const MAGIC = Buffer.from('OpusHead');
    let headStart = -1;
    for (let i = 0; i <= buf.length - 19; i++) {
      if (buf.slice(i, i + 8).equals(MAGIC)) { headStart = i; break; }
    }
    if (headStart < 0) return null;

    const opusHead = buf.slice(headStart, headStart + 19);
    const preSkip = opusHead.readUInt16LE(10);

    // Scan for SimpleBlock (EBML ID 0xA3) and Cluster timecode (0xE7)
    const packets = [];
    let clusterTimecode = 0;
    let i = 0;
    while (i < buf.length) {
      if (buf[i] === 0xE7) {
        // Timecode element (cluster base time, ms)
        i++;
        const [sz, szLen] = readEbmlVint(buf, i); i += szLen;
        if (sz > 0 && sz <= 8 && i + sz <= buf.length) {
          let tc = 0;
          for (let b = 0; b < sz; b++) tc = (tc * 256) + buf[i + b];
          clusterTimecode = tc;
        }
        i += sz;
        continue;
      }
      if (buf[i] === 0xA3) {
        // SimpleBlock
        i++;
        if (i >= buf.length) break;
        const [blockSize, bsLen] = readEbmlVint(buf, i); i += bsLen;
        if (blockSize < 4 || blockSize > 200000 || i + blockSize > buf.length) { i++; continue; }
        const blockEnd = i + blockSize;
        const [, trackLen] = readEbmlVint(buf, i);
        const relTc = buf.readInt16BE(i + trackLen); // signed int16 BE
        const absMs = clusterTimecode + relTc;
        const opusStart = i + trackLen + 3; // track vint + 2-byte timecode + 1-byte flags
        if (opusStart < blockEnd) {
          packets.push({ ms: absMs, data: buf.slice(opusStart, blockEnd) });
        }
        i = blockEnd;
        continue;
      }
      i++;
    }

    if (packets.length === 0) return null;

    const serial = 1;
    let seq = 0;
    const pages = [
      buildOggPage(opusHead,        0, serial, seq++, 2), // BOS
      buildOggPage(buildOpusTags(), 0, serial, seq++, 0),
    ];
    for (let p = 0; p < packets.length; p++) {
      const granule = packets[p].ms * 48 + preSkip; // 48 samples/ms at 48kHz
      const isLast = p === packets.length - 1;
      pages.push(buildOggPage(packets[p].data, granule, serial, seq++, isLast ? 4 : 0));
    }
    return Buffer.concat(pages);
  } catch {
    return null;
  }
}

// WA: sube el buffer directo a Meta Media API → recibe media_id → envía sin necesitar URL pública
const sendWAAudio = async (to, buffer, mimeType) => {
  if (!WA_TOKEN || !PHONE_ID) return false;
  try {
    const isWebm = (mimeType || '').includes('webm');
    let uploadBuffer = buffer;
    let uploadMime = mimeType || 'audio/ogg; codecs=opus';
    let filename = 'voice.ogg';

    if (isWebm) {
      // WhatsApp no soporta audio/webm — convertir a OGG/Opus (mismo codec, diferente contenedor)
      const ogg = remuxWebmToOgg(buffer);
      if (ogg) {
        uploadBuffer = ogg;
        uploadMime = 'audio/ogg; codecs=opus';
        filename = 'voice.ogg';
      } else {
        // Fallback: intentar enviar igual aunque probablemente falle en Meta
        filename = 'voice.webm';
      }
    } else if (uploadMime.includes('mp4')) {
      filename = 'voice.mp4';
    } else if (uploadMime.includes('mpeg') || uploadMime.includes('mp3')) {
      filename = 'voice.mp3';
    }

    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('type', uploadMime);
    form.append('file', new Blob([uploadBuffer], { type: uploadMime }), filename);
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

// ── Ejemplos de aprendizaje — guardados en bot_config key='admin_examples' ──
const EXAMPLES_KEY = 'admin_examples';

const getExamples = async () => {
  const { data } = await supabaseAdmin.from('bot_config').select('value').eq('key', EXAMPLES_KEY).single();
  return Array.isArray(data?.value) ? data.value : [];
};
const saveExamples = async (examples) => {
  const { error } = await supabaseAdmin.from('bot_config').upsert({ key: EXAMPLES_KEY, value: examples }, { onConflict: 'key' });
  return error;
};

const handleExamples = async (req, res) => {
  if (req.method === 'GET') {
    return res.status(200).json(await getExamples());
  }
  if (req.method === 'POST') {
    const { question, answer, msgTimestamp, phone } = req.body || {};
    if (!question || !answer) return res.status(400).json({ error: 'question y answer requeridos' });
    const all = await getExamples();
    const newEx = { id: crypto.randomUUID(), question: question.slice(0, 300), answer: answer.slice(0, 500), msgTimestamp: msgTimestamp || null, phone: phone || null, approved: false, created_at: new Date().toISOString() };
    const err = await saveExamples([...all, newEx]);
    if (err) return res.status(500).json({ error: err.message });
    return res.status(201).json(newEx);
  }
  if (req.method === 'PATCH') {
    const { id, approved } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id requerido' });
    const all = await getExamples();
    const updated = all.map(e => e.id === id ? { ...e, approved: !!approved } : e);
    const err = await saveExamples(updated);
    if (err) return res.status(500).json({ error: err.message });
    return res.status(200).json({ ok: true });
  }
  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id requerido' });
    const all = await getExamples();
    const err = await saveExamples(all.filter(e => e.id !== id));
    if (err) return res.status(500).json({ error: err.message });
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'Method not allowed' });
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = req.headers['x-admin-key'];
  if (key !== ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });

  if (req.query.action === 'examples') return handleExamples(req, res);

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
