// api/appointments.js
// Admin endpoint: listar, actualizar y eliminar citas (incluyendo cancelaciones)

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

const ADMIN_SECRET     = process.env.ADMIN_SECRET || 'esteticar2026';
const TELEGRAM_TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const parsePrice  = (s) => { const n = parseInt((s || '').replace(/[^0-9]/g, ''), 10); return isNaN(n) ? 0 : n; };
const trasladoCost = (t) => {
  if (!t || t === 'sin traslado' || t === 'no_proporcionado') return 0;
  if (/recogida y entrega/i.test(t)) return 9000;
  if (/recogida|entrega/i.test(t)) return 7000;
  return 0;
};
const formatCOP = (n) => '$' + n.toLocaleString('es-CO');

const notifyManualBooking = async (row, drivers) => {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  const svcPrice  = parsePrice(row.price_display);
  const traslado  = trasladoCost(row.traslado);
  const total     = svcPrice + traslado;
  const phone     = row.client_phone || '—';
  const hora      = row.time ? `· ${row.time}` : '';
  const hasTraslado = traslado > 0;

  let trasladoLines = '';
  if (hasTraslado) {
    trasladoLines = `\n🚗 Traslado: ${row.traslado}`;
    if (drivers.length > 0) trasladoLines += `\n👨‍✈️ Conductor: ${drivers.join(' o ')}`;
  }

  let valorLines = hasTraslado
    ? `\n💳 Servicio: ${row.price_display}\n🚐 Traslado: + ${formatCOP(traslado)}\n💰 TOTAL: ${formatCOP(total)}`
    : `\n💰 Valor: ${row.price_display || '—'}`;

  const msg = `🔥 *¡NUEVA CITA CONFIRMADA!*\n\n` +
    `👤 *${row.client_name || 'Sin nombre'}*\n` +
    `📱 ${phone} · Panel Admin\n` +
    `✂️ ${row.service}\n` +
    `📅 ${row.date || '—'} ${hora}` +
    trasladoLines +
    valorLines +
    `\n\n📋 https://esteticar-vff.vercel.app/admin`;

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg, parse_mode: 'Markdown' }),
    });
  } catch (_) {}
};

// Bloques de agenda — GET/POST/DELETE sobre blocked_slots
const handleBlocks = async (req, res) => {
  if (req.method === 'GET') {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabaseAdmin
      .from('blocked_slots')
      .select('*')
      .gte('date', today)
      .order('date', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data || []);
  }
  if (req.method === 'POST') {
    const { date, period, reason } = req.body || {};
    if (!date || !period) return res.status(400).json({ error: 'date y period son requeridos' });
    if (!['morning', 'afternoon', 'full'].includes(period))
      return res.status(400).json({ error: 'period debe ser morning, afternoon o full' });
    const { data: existing } = await supabaseAdmin
      .from('blocked_slots').select('id').eq('date', date).eq('period', period).single();
    if (existing) return res.status(409).json({ error: 'Ya existe un bloqueo para esa fecha y franja' });
    const { data, error } = await supabaseAdmin
      .from('blocked_slots').insert({ date, period, reason: reason || null }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }
  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id es requerido' });
    const { error } = await supabaseAdmin.from('blocked_slots').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'Method not allowed' });
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // TEMP — borrar después de usar
  if (req.query._setup === 'esteticar-setup-2026-x9k') {
    const { email, password } = req.query;
    if (!email || !password) return res.status(400).json({ error: 'email y password requeridos' });
    const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ success: true, userId: data.user.id });
  }

const key = req.headers['x-admin-key'];
  if (key !== ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });

  // Delegar a sub-handlers cuando action lo requiere
  if (req.query.action === 'blocks') return handleBlocks(req, res);

  // GET: listar citas (con filtro de status opcional)
  if (req.method === 'GET') {
    const { status, limit = '100' } = req.query || {};
    let query = supabaseAdmin
      .from('appointments')
      .select('*')
      .order('created_date', { ascending: false })
      .limit(parseInt(limit));
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data || []);
  }

  // PATCH: actualizar campos de una cita (whitelist only)
  if (req.method === 'PATCH') {
    const { id, confirmation_code, updates } = req.body || {};
    if ((!id && !confirmation_code) || !updates) return res.status(400).json({ error: 'Missing fields' });
    const ALLOWED = ['status', 'date', 'time', 'service', 'services', 'notes', 'traslado', 'pickup_option', 'pickup_price', 'total_amount', 'discount', 'client_name', 'client_phone', 'client_email', 'client_birthday', 'vehicle_type', 'vehicle_plate', 'duration_hours', 'origin', 'reminder_sent', 'price_display'];
    const safe = Object.fromEntries(Object.entries(updates).filter(([k]) => ALLOWED.includes(k)));
    if (Object.keys(safe).length === 0) return res.status(400).json({ error: 'No valid fields' });
    let query = supabaseAdmin.from('appointments').update(safe);
    query = id ? query.eq('id', id) : query.eq('confirmation_code', confirmation_code);
    const { error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  // POST: crear cita nueva desde el panel admin
  if (req.method === 'POST') {
    const body = req.body || {};
    if (!body.service) return res.status(400).json({ error: 'Missing service' });
    const ALLOWED_INSERT = ['service','vehicle_type','date','time','price_display','confirmation_code','client_name','client_phone','client_email','client_birthday','traslado','cedula','placa','status','channel','created_date','origin','lead_type','reminder_sent','pickup_option','pickup_price','total_amount','discount','duration_hours','services','notes'];
    const row = Object.fromEntries(Object.entries(body).filter(([k, v]) => ALLOWED_INSERT.includes(k) && v != null));
    if (row.client_birthday && String(row.client_birthday).trim().length < 3) delete row.client_birthday;
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('appointments')
      .insert(row)
      .select()
      .single();
    if (insertErr) {
      console.error('APPT INSERT ERROR:', JSON.stringify(insertErr), 'ROW:', JSON.stringify(row));
      return res.status(500).json({ error: insertErr.message });
    }

    // Notificar Telegram — await para que Vercel no corte la función antes de que el fetch complete
    try {
      const { data: cfg } = await supabaseAdmin.from('bot_config').select('pickup_team').single();
      const drivers = (cfg?.pickup_team || []).filter(m => m.active).map(m => m.name);
      await notifyManualBooking(inserted, drivers);
    } catch (_) {}

    return res.status(201).json(inserted);
  }

  // DELETE: eliminar solo esta cita (sin cascade)
  if (req.method === 'DELETE') {
    const { confirmation_code, id } = req.body || {};
    if (!confirmation_code && !id) return res.status(400).json({ error: 'Missing id or confirmation_code' });

    try {
      const field = id ? 'id' : 'confirmation_code';
      const value = id || confirmation_code;
      const { error } = await supabaseAdmin
        .from('appointments')
        .delete()
        .eq(field, value);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('[DELETE appointment]', e);
      return res.status(500).json({ error: e.message || 'Delete failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
