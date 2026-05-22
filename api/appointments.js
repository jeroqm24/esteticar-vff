// api/appointments.js
// Admin endpoint: listar, actualizar y eliminar citas (incluyendo cancelaciones)

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'esteticar2026';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = req.headers['x-admin-key'];
  if (key !== ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });

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
    const ALLOWED = ['status', 'date', 'time', 'services', 'notes', 'traslado', 'pickup_option', 'pickup_price', 'total_amount', 'discount', 'client_name', 'client_phone', 'client_email', 'vehicle_type', 'vehicle_plate', 'duration_hours', 'origin', 'reminder_sent'];
    const safe = Object.fromEntries(Object.entries(updates).filter(([k]) => ALLOWED.includes(k)));
    if (Object.keys(safe).length === 0) return res.status(400).json({ error: 'No valid fields' });
    let query = supabaseAdmin.from('appointments').update({ ...safe, updated_at: new Date().toISOString() });
    query = id ? query.eq('id', id) : query.eq('confirmation_code', confirmation_code);
    const { error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  // POST: crear cita nueva desde el panel admin
  if (req.method === 'POST') {
    const row = req.body;
    if (!row || !row.service) return res.status(400).json({ error: 'Missing service' });
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('appointments')
      .insert(row)
      .select()
      .single();
    if (insertErr) return res.status(500).json({ error: insertErr.message });
    return res.status(201).json(inserted);
  }

  // DELETE: eliminar cita
  if (req.method === 'DELETE') {
    const { confirmation_code } = req.body || {};
    if (!confirmation_code) return res.status(400).json({ error: 'Missing confirmation_code' });
    const { error } = await supabaseAdmin
      .from('appointments')
      .delete()
      .eq('confirmation_code', confirmation_code);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
