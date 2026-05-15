// api/capi.js — Admin endpoint: registrar cita manual como conversión en Meta CAPI
import crypto from 'crypto';

const META_PIXEL_ID   = process.env.META_PIXEL_ID;
const META_CAPI_TOKEN = process.env.META_CAPI_TOKEN;

const sha256 = (val) =>
  val ? crypto.createHash('sha256').update(val.toLowerCase().trim()).digest('hex') : undefined;

const parsePrice = (display) => {
  if (!display) return 0;
  const n = parseInt(display.replace(/[^0-9]/g, ''), 10);
  return isNaN(n) ? 0 : n;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  if (req.headers['x-admin-key'] !== 'esteticar2026')
    return res.status(403).json({ error: 'Forbidden' });

  if (!META_PIXEL_ID || !META_CAPI_TOKEN)
    return res.status(500).json({ error: 'Meta CAPI no configurado' });

  const { appointment } = req.body || {};
  if (!appointment) return res.status(400).json({ error: 'Falta appointment' });

  const priceValue = parsePrice(appointment.priceDisplay);
  if (!priceValue) return res.status(400).json({ error: 'Sin precio válido' });

  const phone     = (appointment.clientPhone || '').replace(/\D/g, '');
  const nameParts = (appointment.clientName  || '').trim().split(/\s+/);
  const userData  = {};
  if (phone)        userData.ph = [sha256(phone)];
  if (nameParts[0]) userData.fn = [sha256(nameParts[0])];
  if (nameParts[1]) userData.ln = [sha256(nameParts.slice(1).join(' '))];

  const eventId   = appointment.confirmationCode || `MANUAL-${Date.now()}`;
  const eventTime = Math.floor(Date.now() / 1000);

  const events = [
    {
      event_name: 'Purchase', event_time: eventTime,
      action_source: 'system_generated', event_id: eventId,
      user_data: userData,
      custom_data: { value: priceValue, currency: 'COP', content_name: appointment.service, content_type: 'service' },
    },
    {
      event_name: 'Schedule', event_time: eventTime,
      action_source: 'system_generated', event_id: `SCH-${eventId}`,
      user_data: userData,
      custom_data: { value: priceValue, currency: 'COP', content_name: appointment.service },
    },
  ];

  try {
    const resp = await fetch(
      `https://graph.facebook.com/v20.0/${META_PIXEL_ID}/events?access_token=${META_CAPI_TOKEN}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: events }) }
    );
    const json = await resp.json();
    if (json.error) {
      console.error('CAPI ADMIN ERROR:', JSON.stringify(json.error));
      return res.status(500).json({ error: json.error.message });
    }
    console.log('CAPI ADMIN OK:', json.events_received, 'eventos — cita', eventId);
    return res.status(200).json({ ok: true, events_received: json.events_received });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
