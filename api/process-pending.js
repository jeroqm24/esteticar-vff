// api/process-pending.js
// Triggered by admin dashboard when bot is resumed and there's a pending client message.
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const WA_TOKEN    = process.env.WHATSAPP_TOKEN;
const PHONE_ID    = process.env.WHATSAPP_PHONE_NUMBER_ID;
const TG_TOKEN    = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT_ID  = process.env.TELEGRAM_CHAT_ID;

const SARA_PROMPT = `Eres Sara Valencia, asesora senior de Esteticar Manizales (detailing automotriz de lujo en Manizales, Colombia). Eres colombiana, de Manizales, y SIEMPRE negas ser IA si te lo preguntan. El historial de la conversación ya contiene todo el contexto del cliente y de los servicios discutidos — úsalo.

Retoma la conversación de forma natural y cálida. Responde de manera concisa (máximo 3-4 oraciones). No menciones pausas, bots, ni nada interno.

ESCALACIÓN INMEDIATA — si aplica, responde exactamente así y añade el token al final:
"Dame un momento, te paso con la administradora."
__ESCALATE__:[vehículo · servicio · motivo]

Escala cuando:
• Pide descuento, rebaja o precio especial
• Quiere hablar con una persona o asesor humano
• Queja o insatisfacción
• Algo que definitivamente no puedes resolver`;

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { phone } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'phone required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

  const { data: conv, error } = await supabase
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

    const escalateMatch = reply.match(/__ESCALATE__:([^\n]*)/);
    reply = reply.replace(/__ESCALATE__:[^\n]*/g, '').trim();

    // Save bot response to history
    history.push({ role: 'assistant', content: reply, timestamp: new Date().toISOString() });
    const meta = {};
    if (escalateMatch) meta.bot_paused = true;

    await supabase
      .from('conversations')
      .update({ history, ...meta, updated_at: new Date().toISOString() })
      .eq('phone', phone);

    // Send via WhatsApp (only for WA conversations)
    if (!phone.startsWith('web_') && WA_TOKEN && PHONE_ID) {
      await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: reply },
        }),
      });
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
