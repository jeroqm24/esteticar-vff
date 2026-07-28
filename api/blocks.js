// api/blocks.js — Gestión de franjas bloqueadas (bot no puede agendar)

import { createClient } from '@supabase/supabase-js';
import { format, addDays } from 'date-fns';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = req.headers['x-admin-key'];
  if (key !== 'Esteticar11.') return res.status(401).json({ error: 'Unauthorized' });

  // GET — lista bloques desde hoy en adelante
  if (req.method === 'GET') {
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data, error } = await supabaseAdmin
      .from('blocked_slots')
      .select('*')
      .gte('date', today)
      .order('date', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data || []);
  }

  // POST — crear bloqueo { date, period, reason? }
  if (req.method === 'POST') {
    const { date, period, reason } = req.body || {};
    if (!date || !period) return res.status(400).json({ error: 'date y period son requeridos' });
    if (!['morning', 'afternoon', 'full'].includes(period))
      return res.status(400).json({ error: 'period debe ser morning, afternoon o full' });

    // Evitar duplicados
    const { data: existing } = await supabaseAdmin
      .from('blocked_slots')
      .select('id')
      .eq('date', date)
      .eq('period', period)
      .single();
    if (existing) return res.status(409).json({ error: 'Ya existe un bloqueo para esa fecha y franja' });

    const { data, error } = await supabaseAdmin
      .from('blocked_slots')
      .insert({ date, period, reason: reason || null })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  // DELETE — eliminar bloqueo por id
  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id es requerido' });
    const { error } = await supabaseAdmin.from('blocked_slots').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
