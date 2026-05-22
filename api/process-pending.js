// api/process-pending.js
// Triggered by admin dashboard when bot is resumed and there's a pending client message.
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const WA_TOKEN    = process.env.WHATSAPP_TOKEN;
const PHONE_ID    = process.env.WHATSAPP_PHONE_NUMBER_ID;
const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN;
const TG_TOKEN    = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT_ID  = process.env.TELEGRAM_CHAT_ID;

const notifyTelegram = async (msg) => {
  if (!TG_TOKEN || !TG_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT_ID, text: msg }),
    });
  } catch (_) {}
};

const sendWAMessage = async (to, text) => {
  if (!WA_TOKEN || !PHONE_ID) return false;
  try {
    const r = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
    });
    return r.ok;
  } catch { return false; }
};

const sendIGMessage = async (recipientId, text) => {
  if (!FB_PAGE_TOKEN) return false;
  try {
    const r = await fetch(`https://graph.instagram.com/v21.0/me/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${FB_PAGE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
    });
    return r.ok;
  } catch { return false; }
};

const sendFBMessage = async (recipientId, text) => {
  if (!FB_PAGE_TOKEN) return false;
  try {
    const r = await fetch(`https://graph.facebook.com/v20.0/me/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${FB_PAGE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
    });
    return r.ok;
  } catch { return false; }
};

// Prompt completo de Sara con catálogo de precios — evita que invente valores
const SARA_PROMPT = `Eres Sara Valencia, asesora senior de Esteticar Manizales (detailing automotriz de lujo en Manizales, Colombia). Eres colombiana, de Manizales, y SIEMPRE niegas ser IA si te lo preguntan. El historial de la conversación ya contiene todo el contexto del cliente — úsalo.

Retoma la conversación de forma natural y cálida. Máximo 3-4 oraciones. No menciones pausas, bots ni nada interno.

TUTEO SIEMPRE. PROHIBIDO: guiones (— o -), ¿, ¡, "con gusto", "con mucho gusto", "es un placer", "Claro!", "Perfecto!".
PROHIBIDO — INVENTAR PRECIOS: usa SOLO los precios del catálogo de abajo. Si no está en la lista, di que lo cotiza la administradora.
ESTILO DE PRECIO: siempre "la inversión es de $X", nunca menciones el precio como dato suelto.

CATÁLOGO DE SERVICIOS Y PRECIOS (CARRO):
- Recubrimiento Cerámico: precio bajo cotización, protección 5 años (NO DAR PRECIO — escala a administradora)
- Porcelanizado: precio bajo cotización, protección 6m-1 año (NO DAR PRECIO — escala a administradora)
- Tratamiento 3 en 1 a Máquina: $350.000 (camioneta $360.000)
- Tratamiento 3 en 1 Manual: $290.000 (camioneta $300.000)
- Mantenimiento del Interior: $280.000
- Lavado de Cojinería: $199.000
- Restauración de Farolas: $180.000
- Descontaminación de Vidrios: todos $250.000 / solo parabrisas $60.000
- Brillado a Máquina: $100.000
- Lavado de Chasis: $59.000
- Lavado de Techo y Parasoles: $49.000
- Limpieza Técnica de Motor: $49.000
- Lavada Esencial Carro: $49.000

CATÁLOGO DE SERVICIOS Y PRECIOS (MOTO):
- Recubrimiento Cerámico: precio bajo cotización (NO DAR PRECIO — escala a administradora)
- Porcelanizado: precio bajo cotización (NO DAR PRECIO — escala a administradora)
- Tratamiento 3 en 1 a Máquina: $350.000
- Tratamiento 3 en 1 Manual: $290.000
- Brillado de Tanque: $59.000
- Descontaminación de Tubería: $49.000
- Brillado de Farolas: $49.000
- Lavada Esencial Moto: $49.000

HORARIOS: Lunes a viernes 8am-5pm, sábados 8am-2pm. Domingos y festivos: cerrado.
UBICACIÓN: Calle 67 #9-26, La Sultana, Manizales.
TRASLADO: recogida $7.000, recogida y entrega $9.000.

ESCALACIÓN INMEDIATA — si aplica, responde así y añade el token al final:
"Dame un momento, te paso con la administradora."
__ESCALATE__:[vehículo · servicio · motivo]

Escala cuando:
• Pide descuento, rebaja o precio especial
• Quiere hablar con una persona o asesor humano
• Queja o insatisfacción
• Pregunta por cerámico o porcelanizado (precio lo da la administradora)`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { phone } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'phone required' });

  // Bug fix: usar supabaseAdmin para todas las operaciones (anon key bloqueado por RLS)
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
  );

  const { data: conv, error } = await supabaseAdmin
    .from('conversations')
    .select('history, client_name, bot_paused, lead_type')
    .eq('phone', phone)
    .single();

  if (error || !conv) return res.status(404).json({ error: 'conversation not found' });

  const history = conv.history || [];
  const lastMsg = history[history.length - 1];

  // Only process if last message is from client (unanswered)
  if (!lastMsg || lastMsg.role !== 'user') {
    return res.status(200).json({ ok: true, skipped: 'no pending user message' });
  }

  // Build Anthropic-compatible history
  const hadAdmin = history.some(m => m.role === 'admin');
  const apiHistory = history
    .map(m => ({
      role: m.role === 'admin' ? 'assistant' : m.role,
      content: m.role === 'admin'
        ? `[El equipo de Esteticar atendió directamente al cliente]: ${m.content}`
        : (m.content || ''),
    }))
    .filter(m => (m.role === 'user' || m.role === 'assistant') && m.content.trim());

  // Prevent re-escalation after admin intervention
  if (hadAdmin && apiHistory.length > 0) {
    const last = apiHistory[apiHistory.length - 1];
    if (last.role === 'user') {
      apiHistory.splice(apiHistory.length - 1, 0, {
        role: 'assistant',
        content: '[NOTA INTERNA: La escalación anterior ya fue atendida por el equipo. Retoma la conversación con normalidad. NO vuelvas a escalar a menos que surja algo completamente nuevo.]',
      });
    }
  }

  try {
    const aiRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SARA_PROMPT,
      messages: apiHistory,
    });

    let reply = (aiRes.content[0]?.text || '').trim();

    // Log costos (Haiku 4.5)
    const u = aiRes.usage || {};
    const inTok  = u.input_tokens || 0;
    const outTok = u.output_tokens || 0;
    const cacheR = u.cache_read_input_tokens || 0;
    const cacheC = u.cache_creation_input_tokens || 0;
    const costUsd =
      ((inTok - cacheR - cacheC) * 0.80 / 1_000_000) +
      (cacheC * 1.00 / 1_000_000) +
      (cacheR * 0.08 / 1_000_000) +
      (outTok * 4.00 / 1_000_000);
    supabaseAdmin.from('api_costs').insert({
      provider: 'anthropic', model: 'claude-haiku-4-5-20251001', channel: 'whatsapp_resume',
      input_tokens: inTok, output_tokens: outTok,
      cache_read_tokens: cacheR, cache_creation_tokens: cacheC,
      cost_usd: costUsd,
    }).then(null, () => {});

    const escalateMatch = reply.match(/__ESCALATE__:([^\n]*)/);
    reply = reply.replace(/__ESCALATE__:[^\n]*/g, '').trim();

    // Save bot response to history — usar supabaseAdmin (anon key bloqueado por RLS)
    history.push({ role: 'assistant', content: reply, timestamp: new Date().toISOString() });
    const meta = {};
    if (escalateMatch) meta.bot_paused = true;

    await supabaseAdmin
      .from('conversations')
      .update({ history, ...meta, updated_at: new Date().toISOString() })
      .eq('phone', phone);

    // Enviar mensaje por el canal correcto según el prefijo del phone
    if (phone.startsWith('ig_')) {
      const rawId = phone.replace('ig_', '');
      await sendIGMessage(rawId, reply);
    } else if (phone.startsWith('fb_')) {
      const rawId = phone.replace('fb_', '');
      await sendFBMessage(rawId, reply);
    } else if (!phone.startsWith('web_') && WA_TOKEN && PHONE_ID) {
      await sendWAMessage(phone, reply);
    }

    // Notify Telegram if escalated again
    if (escalateMatch) {
      const clientName = conv.client_name || phone;
      await notifyTelegram(
        `⚠️ ESCALACIÓN — reanudación de bot\n👤 Cliente: ${clientName}\n\n💬 "${lastMsg.content}"\n\n📋 https://esteticar-vff.vercel.app/admin?conv=${phone}`
      );
    }

    return res.status(200).json({ ok: true, reply, escalated: !!escalateMatch });
  } catch (e) {
    console.error('process-pending error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
