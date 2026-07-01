// ARCHIVO TEMPORAL — BORRAR INMEDIATAMENTE DESPUÉS DE USAR
import { createClient } from '@supabase/supabase-js';

const SETUP_KEY = 'esteticar-setup-2026-x9k';

export default async function handler(req, res) {
  const { key, email, password } = req.method === 'POST' ? req.body : req.query;

  if (key !== SETUP_KEY) return res.status(401).json({ error: 'Unauthorized' });
  if (!email || !password) return res.status(400).json({ error: 'email y password requeridos' });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ success: true, userId: data.user.id });
}
