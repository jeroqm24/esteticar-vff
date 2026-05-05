// api/resubscribe.js
// Cron job — renueva la suscripción WABA diariamente para que el bot nunca deje de responder

const WA_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

export default async function handler(req, res) {
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${PHONE_ID}/subscribed_apps`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WA_TOKEN}`,
        },
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('[resubscribe] WABA subscription renewed successfully');
      return res.status(200).json({ success: true, timestamp: new Date().toISOString() });
    } else {
      console.error('[resubscribe] Failed:', data);
      return res.status(500).json({ success: false, error: data });
    }
  } catch (err) {
    console.error('[resubscribe] Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
