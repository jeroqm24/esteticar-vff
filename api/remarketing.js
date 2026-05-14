// api/remarketing.js
// Cron job — envía mensajes de seguimiento a leads no convertidos y clientes anteriores
// Corre diariamente a las 9 AM Colombia (14:00 UTC)
//
// NOTA WhatsApp: fuera de la ventana de 24h se requieren plantillas aprobadas.
// Este endpoint intenta enviar el mensaje; si el usuario está fuera de ventana,
// WhatsApp lo rechazará silenciosamente. Integrar plantillas aprobadas en Meta
// Business cuando estén disponibles.

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

const WA_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

const sendWA = async (to, text) => {
  if (!WA_TOKEN || !PHONE_ID || to.startsWith('web_')) return false;
  try {
    const r = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
    });
    return r.ok;
  } catch { return false; }
};

const daysBetween = (isoA, isoB = new Date().toISOString()) =>
  Math.floor((new Date(isoB) - new Date(isoA)) / (1000 * 60 * 60 * 24));

export default async function handler(req, res) {
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let sent = 0;
  const results = [];

  // ── 1. Seguimiento a leads no convertidos (3-10 días sin respuesta) ──
  const { data: leads } = await supabaseAdmin
    .from('conversations')
    .select('phone, client_name, lead_type, updated_at, remarketing_status')
    .not('lead_type', 'is', null)
    .is('remarketing_status', null);

  for (const lead of leads || []) {
    const days = daysBetween(lead.updated_at);
    if (days < 3 || days > 10) continue;
    if (lead.phone.startsWith('web_')) continue;

    const name = lead.client_name?.split(' ')[0] || '';
    const msg =
      `Hola${name ? ` ${name}` : ''} 👋 Soy Sara de Esteticar Manizales.\n\n` +
      `Hace unos días estuviste preguntando por nuestros servicios y quería ver si ya lograste lo que buscabas para tu vehículo, o si puedo ayudarte con algo.\n\n` +
      `Seguimos disponibles cuando quieras. 😊`;

    const ok = await sendWA(lead.phone, msg);
    await supabaseAdmin.from('conversations')
      .update({ remarketing_status: 'lead_seguimiento', updated_at: new Date().toISOString() })
      .eq('phone', lead.phone);

    results.push({ type: 'lead_seguimiento', phone: lead.phone, sent: ok });
    if (ok) sent++;
  }

  // ── 2. Remarketing post-servicio (30-50 días después del último servicio) ──
  const { data: exClients } = await supabaseAdmin
    .from('conversations')
    .select('phone, client_name, last_service, updated_at, remarketing_status')
    .not('last_service', 'is', null)
    .eq('remarketing_status', 'cliente_activo');

  for (const client of exClients || []) {
    const days = daysBetween(client.updated_at);
    if (days < 30 || days > 50) continue;
    if (client.phone.startsWith('web_')) continue;

    const name = client.client_name?.split(' ')[0] || '';
    const service = client.last_service || 'tu servicio';
    const msg =
      `Hola${name ? ` ${name}` : ''}! 👋 Soy Sara de Esteticar Manizales.\n\n` +
      `Hace un mes te atendimos con *${service}*. Espero que tu vehículo haya quedado a tu gusto!\n\n` +
      `Si necesitas un mantenimiento o quieres proteger más tu carro, aquí estamos. 🚗✨`;

    const ok = await sendWA(client.phone, msg);
    await supabaseAdmin.from('conversations')
      .update({ remarketing_status: 'post_servicio_30', updated_at: new Date().toISOString() })
      .eq('phone', client.phone);

    results.push({ type: 'post_servicio_30', phone: client.phone, sent: ok });
    if (ok) sent++;
  }

  // ── 3. Re-activación tardía (90 días sin actividad para clientes post-servicio) ──
  const { data: dormant } = await supabaseAdmin
    .from('conversations')
    .select('phone, client_name, last_service, updated_at, remarketing_status')
    .not('last_service', 'is', null)
    .eq('remarketing_status', 'post_servicio_30');

  for (const client of dormant || []) {
    const days = daysBetween(client.updated_at);
    if (days < 55 || days > 100) continue;
    if (client.phone.startsWith('web_')) continue;

    const name = client.client_name?.split(' ')[0] || '';
    const msg =
      `Hola${name ? ` ${name}` : ''}! 👋 Por acá Sara de Esteticar.\n\n` +
      `Ya hace un tiempo no sabemos nada de ti. Cuando quieras darle un mimo a tu vehículo, nos avisas con gusto. 🚗\n\n` +
      `Tenemos disponibilidad esta semana. Te esperamos!`;

    const ok = await sendWA(client.phone, msg);
    await supabaseAdmin.from('conversations')
      .update({ remarketing_status: 'completado', updated_at: new Date().toISOString() })
      .eq('phone', client.phone);

    results.push({ type: 'reactivacion', phone: client.phone, sent: ok });
    if (ok) sent++;
  }

  return res.status(200).json({ sent, total: results.length, results });
}
