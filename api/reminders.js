// api/reminders.js
// Cron job — envía recordatorio por WhatsApp 1 día antes de cada cita

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const WA_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

const sendMessage = async (to, text) => {
  await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WA_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });
};

export default async function handler(req, res) {
  // Verificar que viene del cron de Vercel
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

  let sent = 0;
  for (const appt of appointments) {
    const phone = appt.client_phone;
    if (!phone) continue;

    const msg =
      `Hola ${appt.client_name || ''} 👋 Te recordamos que mañana tienes una cita en *Esteticar Manizales*.\n\n` +
      `*Servicio:* ${appt.service}\n` +
      `*Hora:* ${appt.date}\n` +
      `*Código:* ${appt.confirmation_code}\n\n` +
      `Si necesitas reprogramar escríbenos aquí mismo. ¡Te esperamos!`;

    await sendMessage(phone, msg);

    await supabase
      .from('appointments')
      .update({ status: 'reminder_sent' })
      .eq('confirmation_code', appt.confirmation_code);

    sent++;
  }

  return res.status(200).json({ sent });
}
