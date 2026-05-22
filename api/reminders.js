// api/reminders.js
// Cron job — envía recordatorio por WhatsApp + email 1 día antes de cada cita

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
const TEMPLATE_TRASLADO = 'recordatorio_cita_esteticar'; // con empleados — para quien pidió recogida
const TEMPLATE_SIMPLE   = 'recordatorio_cita_simple';    // sin empleados — para quien trae el carro

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

const sendTemplate = async (to, clientName, service, hora, teamNames = null) => {
  const hasTraslado = !!teamNames;
  const templateName = hasTraslado ? TEMPLATE_TRASLADO : TEMPLATE_SIMPLE;

  const parameters = hasTraslado
    ? [
        { type: 'text', text: clientName || 'cliente' },
        { type: 'text', text: service || 'servicio agendado' },
        { type: 'text', text: hora || 'la hora acordada' },
        { type: 'text', text: teamNames },
      ]
    : [
        { type: 'text', text: clientName || 'cliente' },
        { type: 'text', text: service || 'servicio agendado' },
        { type: 'text', text: hora || 'la hora acordada' },
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
        name: templateName,
        language: { code: 'es' },
        components: [{ type: 'body', parameters }],
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

  const { data: appointments } = await supabaseAdmin
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

    // Detectar si la cita tiene traslado (recogida o recogida+entrega)
    const tieneTraslado = appt.traslado &&
      appt.traslado !== 'sin traslado' &&
      appt.traslado !== 'no_proporcionado';

    let ok = false;
    if (tieneTraslado && teamNames) {
      // Cliente con recogida + empleados activos → plantilla con nombres
      ok = await sendTemplate(phone, appt.client_name, appt.service, hora, teamNames);
    } else {
      // Cliente trae el carro / no hay equipo activo → plantilla simple
      ok = await sendTemplate(phone, appt.client_name, appt.service, hora, null);
    }

    if (ok) {
      if (appt.confirmation_code) {
        await supabaseAdmin
          .from('appointments')
          .update({ status: 'reminder_sent' })
          .eq('confirmation_code', appt.confirmation_code);
      }
      sent++;
    }

    // Email de recordatorio al cliente (si tiene correo)
    if (appt.client_email && appt.client_email !== 'no_proporcionado') {
      const waMsg = encodeURIComponent(`Hola, quiero confirmar mi cita de mañana. Código: ${appt.confirmation_code || appt.service}`);
      const reminderWaUrl = `https://api.whatsapp.com/send/?phone=573156071041&text=${waMsg}`;
      const reminderHtml = `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F1EC;font-family:Georgia,serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1EC;padding:40px 16px">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#ffffff;border-radius:2px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.10)">
  <tr><td style="background:#0A0A0A;padding:36px 40px;text-align:center;border-bottom:3px solid #C9A84C">
    <img src="https://esteticar-vff.vercel.app/logo.png" alt="Esteticar" width="120" style="display:block;margin:0 auto 12px;height:auto" />
    <div style="color:#C9A84C;font-size:9px;letter-spacing:4px;font-family:Arial,sans-serif;font-weight:600;text-transform:uppercase">Custodia Vehicular Premium · Manizales</div>
  </td></tr>
  <tr><td style="background:#0A0A0A;padding:0 40px 28px;text-align:center">
    <div style="display:inline-block;background:#C9A84C;color:#0A0A0A;font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;padding:7px 20px;border-radius:50px">Tu cita es mañana</div>
  </td></tr>
  <tr><td style="padding:36px 40px 0">
    <p style="margin:0;font-size:22px;color:#0A0A0A;font-weight:400;line-height:1.3">Hola, ${appt.client_name || 'cliente'}.</p>
    <p style="margin:10px 0 0;font-size:14px;color:#888;font-family:Arial,sans-serif;line-height:1.6">Te recordamos que mañana tienes tu cita en Esteticar. Te esperamos.</p>
    <div style="margin:24px 0 0;height:1px;background:linear-gradient(90deg,#C9A84C 0%,#f4f1ec 100%)"></div>
  </td></tr>
  <tr><td style="padding:28px 40px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td width="44%" style="padding:14px 16px;background:#FAF8F4;border-radius:2px 0 0 2px;font-family:Arial,sans-serif;font-size:10px;color:#A0916E;letter-spacing:2px;text-transform:uppercase;font-weight:600;vertical-align:middle">Servicio</td><td style="padding:14px 16px;background:#FAF8F4;border-radius:0 2px 2px 0;font-size:15px;color:#0A0A0A;font-weight:600;vertical-align:middle">${appt.service}</td></tr>
      <tr><td colspan="2" style="height:4px"></td></tr>
      <tr><td style="padding:14px 16px;background:#FAF8F4;font-family:Arial,sans-serif;font-size:10px;color:#A0916E;letter-spacing:2px;text-transform:uppercase;font-weight:600;vertical-align:middle">Fecha y hora</td><td style="padding:14px 16px;background:#FAF8F4;font-size:15px;color:#0A0A0A;font-weight:600;vertical-align:middle">${appt.date}</td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:0 40px 36px">
    <div style="padding:20px 24px;background:#0A0A0A;border-radius:2px;text-align:center">
      <p style="margin:0;font-size:14px;color:#C9A84C;font-style:italic;line-height:1.7">"Cuidamos tu vehículo como si fuera nuestro."</p>
    </div>
  </td></tr>
  <tr><td style="padding:0 40px 20px;text-align:center">
    <a href="${reminderWaUrl}" style="display:inline-block;background:#25D366;color:#ffffff;font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;padding:17px 40px;border-radius:50px">Escríbenos por WhatsApp →</a>
  </td></tr>
  <tr><td style="padding:0 40px 36px;text-align:center">
    <a href="https://maps.google.com/?q=Cll+67+9-26+La+Sultana+Manizales" style="display:inline-block;background:#0A0A0A;color:#C9A84C;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:15px 26px;border-radius:50px;border:1.5px solid #C9A84C;margin-right:10px">Google Maps →</a>
    <a href="https://waze.com/ul?q=Cll+67+9-26+La+Sultana+Manizales&navigate=yes" style="display:inline-block;background:#0A0A0A;color:#C9A84C;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:15px 26px;border-radius:50px;border:1.5px solid #C9A84C">Waze →</a>
  </td></tr>
  <tr><td style="background:#0A0A0A;padding:24px 40px;text-align:center">
    <div style="font-family:Arial,sans-serif;font-size:11px;color:#C9A84C;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px">Esteticar</div>
    <div style="font-family:Arial,sans-serif;font-size:11px;color:#555;margin-bottom:4px">Cll 67 #9-26, La Sultana · Manizales, Colombia</div>
    <div style="font-family:Arial,sans-serif;font-size:11px;color:#444">www.esteticarmanizales.com</div>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://esteticar-vff.vercel.app';
      fetch(`${baseUrl}/api/notify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email', subject: `Tu cita es mañana — Esteticar`, html: reminderHtml, to: appt.client_email }),
      }).catch(() => {});

    }
  }

  return res.status(200).json({ sent, teamNames: teamNames || 'sin equipo configurado' });
}
