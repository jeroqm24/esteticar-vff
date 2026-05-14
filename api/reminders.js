// api/reminders.js
// Cron job — envía recordatorio por WhatsApp 1 día antes de cada cita

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

const WA_TOKEN  = process.env.WHATSAPP_TOKEN;
const PHONE_ID  = process.env.WHATSAPP_PHONE_NUMBER_ID;
const TEMPLATE  = 'recordatorio_cita_esteticar';

// Lee los empleados activos desde bot_config
const getActiveTeam = async () => {
  try {
    const { data } = await supabase
      .from('bot_config')
      .select('value')
      .eq('key', 'default')
      .single();
    if (!data) return null;
    const cfg = JSON.parse(data.value || '{}');
    const team = (cfg.pickup_team || []).filter(m => m.active).map(m => m.name);
    return team.length > 0 ? team.join(', ') : null;
  } catch { return null; }
};

const sendTemplate = async (to, clientName, service, hora, teamNames) => {
  const parameters = [
    { type: 'text', text: clientName || 'cliente' },
    { type: 'text', text: service || 'servicio agendado' },
    { type: 'text', text: hora || 'la hora acordada' },
    { type: 'text', text: teamNames },
  ];

  const res = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WA_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: TEMPLATE,
        language: { code: 'es' },
        components: [{
          type: 'body',
          parameters,
        }],
      },
    }),
  });
  return res.ok;
};

// Si no hay equipo de traslados configurado, usa mensaje de texto simple
const sendTextReminder = async (to, clientName, service, hora) => {
  const msg =
    `Hola ${clientName || 'cliente'} 👋 Te recordamos que mañana tienes tu cita en *Esteticar Manizales*.\n\n` +
    `*Servicio:* ${service}\n` +
    `*Hora:* ${hora}\n\n` +
    `Estamos en Calle 67 #9-26, La Sultana. Si necesitas cambiar algo, responde este mensaje.`;

  const res = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WA_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: msg },
    }),
  });
  return res.ok;
};

export default async function handler(req, res) {
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const tomorrow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowName = tomorrow.toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long',
  }).split(',')[0].toLowerCase();

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .not('status', 'in', '("cancelada","cancelled","reminder_sent")')
    .ilike('date', `%${tomorrowName}%`);

  if (!appointments?.length) return res.status(200).json({ sent: 0 });

  const teamNames = await getActiveTeam();
  let sent = 0;

  for (const appt of appointments) {
    const phone = appt.client_phone;
    if (!phone) continue;

    // Extraer hora del campo date (ej: "miércoles, 7 de mayo a las 9:00")
    const horaMatch = appt.date?.match(/(\d{1,2}:\d{2})/);
    const hora = horaMatch ? horaMatch[1] : (appt.time || 'la hora acordada');

    let ok = false;
    if (teamNames) {
      // Usar plantilla aprobada con equipo de traslados
      ok = await sendTemplate(phone, appt.client_name, appt.service, hora, teamNames);
    } else {
      // Fallback: texto libre (solo funciona dentro de ventana 24h)
      ok = await sendTextReminder(phone, appt.client_name, appt.service, hora);
    }

    if (ok) {
      await supabaseAdmin
        .from('appointments')
        .update({ status: 'reminder_sent' })
        .eq('confirmation_code', appt.confirmation_code);
      sent++;
    }
  }

  return res.status(200).json({ sent, teamNames: teamNames || 'sin equipo configurado' });
}
