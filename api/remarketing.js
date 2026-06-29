// api/remarketing.js
// Cron — seguimiento a clientes potenciales en 4 horarios Colombia
// Lógica: potencial → remarketing enviado → sin respuesta 24h → desinteresado (reversible)

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

const WA_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

const getColombiaTime = () => {
  const s = new Date().toLocaleTimeString('en-US', { timeZone: 'America/Bogota', hour12: false });
  const [h, m] = s.split(':').map(Number);
  return { hour: h, minute: m, total: h * 60 + m };
};

const getSlot = (total) => {
  if (total >= 480  && total < 510)  return 'manana';   // 8:00–8:30
  if (total >= 720  && total < 750)  return 'mediodia'; // 12:00–12:30
  if (total >= 1050 && total < 1080) return 'tarde';    // 5:30–6:00
  if (total >= 1170 && total < 1200) return 'noche';    // 7:30–8:00
  return null;
};

const buildMessage = (slot, name, lastService, vehicleType) => {
  const first   = (name || 'cliente').split(' ')[0];
  const vehicle = vehicleType === 'Moto' ? 'tu moto' : 'tu carro';
  const ref     = lastService ? `lo del ${lastService}` : 'lo que estábamos viendo';

  const msgs = {
    manana: [
      `Buenos días ${first}! Te escribe Isabella de Esteticar. Me quedé pensando en ${ref} y quería saber si lograste decidirte. Esta semana tenemos buenos espacios. ${vehicle} queda divino, te lo aseguro.`,
      `Buenos días ${first}! Isabella de Esteticar por acá. Tenemos disponibilidad esta semana y no quería que se te fuera el espacio. ¿Cuándo te queda mejor para traer ${vehicle}?`,
    ],
    mediodia: [
      `Hola ${first}! Isabella de Esteticar. Sé que el día se va volando, pero quería preguntarte si aún tienes en mente traer ${vehicle}. Tenemos disponibilidad esta semana, te ayudo a cuadrar la cita ahora mismo.`,
      `${first}, hola! Isabella de Esteticar. Aprovecho el mediodía para preguntarte si sigues interesado en ${ref}. Cuéntame cómo vas.`,
    ],
    tarde: [
      `${first} buenas tardes! Isabella de Esteticar. Ya saliendo del trabajo? Esta semana nos quedan pocos espacios. Si quieres que ${vehicle} quede impecable antes del fin de semana, dime y lo cuadramos ahora mismo.`,
      `Buenas tardes ${first}! Isabella de Esteticar. Tengo disponibilidad esta semana para ${vehicle}. ¿Qué día te queda mejor?`,
    ],
    noche: [
      `Buenas noches ${first}! Isabella de Esteticar por acá. Sé que es tarde, pero lo bueno de WhatsApp es que respondes cuando quieras. Tengo disponibilidad para ${vehicle} esta semana. A qué hora te queda mejor?`,
      `${first}, buenas noches! Isabella de Esteticar. Quería saber cómo vas con ${ref}. No hay afán, respóndeme cuando puedas y lo cuadramos.`,
    ],
  };

  const options = msgs[slot];
  return options[Math.floor(Math.random() * options.length)];
};

const sendWA = async (to, text) => {
  const res = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
  });
  return res.ok;
};

export default async function handler(req, res) {
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { total, hour, minute } = getColombiaTime();
  const slot = getSlot(total);

  if (!slot) {
    return res.status(200).json({ message: 'Fuera de horario de remarketing', hour, minute });
  }

  const { data: convs, error } = await supabaseAdmin
    .from('conversations')
    .select('phone, client_name, last_service, vehicle_type, history, updated_at')
    .eq('remarketing_status', 'potencial');

  if (error) return res.status(500).json({ error: error.message });
  if (!convs?.length) return res.status(200).json({ sent: 0, slot });

  // Obtener teléfonos con cita confirmada para excluirlos
  const { data: bookedAppts } = await supabaseAdmin
    .from('appointments')
    .select('client_phone')
    .eq('status', 'confirmada');
  const bookedPhones = new Set((bookedAppts || []).map(a => a.client_phone).filter(Boolean));

  const now = Date.now();
  let sent = 0;
  const MAX_REMARKETING = 2;

  // ── Enviar remarketing ──────────────────────────────────────────
  for (const conv of convs) {
    // Solo WhatsApp real
    if (!conv.phone || conv.phone.startsWith('web_') || conv.phone.startsWith('ig_') || conv.phone.startsWith('fb_')) continue;

    // No enviar si ya tiene cita confirmada
    if (bookedPhones.has(conv.phone)) {
      await supabaseAdmin.from('conversations').update({ remarketing_status: 'efectivo' }).eq('phone', conv.phone);
      console.log('REMARKETING SKIP (tiene cita):', conv.phone);
      continue;
    }

    const history = Array.isArray(conv.history) ? conv.history : [];

    // Máximo 2 remarketings por cliente
    const remarketingCount = history.filter(m => m.role === 'remarketing').length;
    if (remarketingCount >= MAX_REMARKETING) {
      await supabaseAdmin.from('conversations').update({ remarketing_status: 'desinteresado' }).eq('phone', conv.phone);
      console.log('REMARKETING LIMIT (2 enviados):', conv.phone);
      continue;
    }

    // No reenviar si ya se mandó un remarketing hace menos de 22h
    const lastRemark = [...history].reverse().find(m => m.role === 'remarketing');
    if (lastRemark) {
      const sentAt = new Date(lastRemark.timestamp || 0).getTime();
      if (now - sentAt < 22 * 60 * 60 * 1000) continue;
    }

    // No enviar si el cliente tuvo actividad reciente (puede estar en conversación)
    const lastActivity = new Date(conv.updated_at || 0).getTime();
    if (now - lastActivity < 60 * 60 * 1000) continue;

    const msg = buildMessage(slot, conv.client_name, conv.last_service, conv.vehicle_type);
    const ok  = await sendWA(conv.phone, msg);

    if (ok) {
      const newHistory = [...history, { role: 'remarketing', content: msg, timestamp: new Date().toISOString() }];
      await supabaseAdmin
        .from('conversations')
        .update({ history: newHistory })
        .eq('phone', conv.phone);
      sent++;
      console.log('REMARKETING OK:', conv.phone, slot, `(${remarketingCount + 1}/${MAX_REMARKETING})`);
    }
  }

  // ── Marcar desinteresados: remarketing >24h sin respuesta del cliente ──
  const { data: toCheck } = await supabaseAdmin
    .from('conversations')
    .select('phone, history')
    .eq('remarketing_status', 'potencial');

  for (const conv of (toCheck || [])) {
    const history = Array.isArray(conv.history) ? conv.history : [];
    const lastRemark = [...history].reverse().find(m => m.role === 'remarketing');
    if (!lastRemark) continue;

    const sentAt = new Date(lastRemark.timestamp || 0).getTime();
    if (now - sentAt < 24 * 60 * 60 * 1000) continue;

    // Si hubo respuesta del cliente después del remarketing → sigue siendo potencial
    const clientAfter = history.find(
      m => m.role === 'user' && new Date(m.timestamp || 0).getTime() > sentAt
    );
    if (clientAfter) continue;

    await supabaseAdmin
      .from('conversations')
      .update({ remarketing_status: 'desinteresado' })
      .eq('phone', conv.phone);
    console.log('DESINTERESADO:', conv.phone);
  }

  return res.status(200).json({ sent, slot, hour, minute });
}
