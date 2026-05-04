// api/whatsapp.js
// Webhook de WhatsApp Cloud API — recibe mensajes y responde con IA (Sara)

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const WA_TOKEN     = process.env.WHATSAPP_TOKEN;
const PHONE_ID     = process.env.WHATSAPP_PHONE_NUMBER_ID;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Historial en memoria por número de teléfono (persiste durante el ciclo de vida del proceso)
const conversations = new Map();
const MAX_TURNS = 20;

// ─── Helpers de tiempo ────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' })).getHours();
  if (h >= 5 && h < 12) return 'Buenos días';
  if (h >= 12 && h < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

const getTodayStr = () =>
  new Date().toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long',
  });

const getTomorrowStr = () => {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long' });
};

// ─── Disponibilidad real desde Supabase ──────────────────────────
const SERVICE_HOURS = {
  'Lavada Esencial': 2, 'Lavado de Techo': 2, 'Lavado de Chasis': 2,
  'Brillado Farolas': 1, 'Brillado de Farolas': 1,
  'Descontaminacion de Tuberia': 2, 'Descontaminación de Tubería': 2,
  'Brillado de Tanque': 2, 'Descontaminacion de Vidrios': 2,
  'Descontaminación de Vidrios': 2, 'Brillado a Maquina': 3,
  'Brillado a Máquina': 3, 'Restauracion de Farolas': 3,
  'Restauración de Farolas': 3, 'Lavado de Cojineria': 8,
  'Lavado de Cojinería': 8, 'Mantenimiento Interior': 16,
  'Tratamiento 3 en 1 Manual': 5, 'Tratamiento 3 en 1 a Maquina': 6,
  'Tratamiento 3 en 1 a Máquina': 6,
};

const getServiceDuration = (name) => {
  if (!name) return 2;
  const key = Object.keys(SERVICE_HOURS).find(k => name.toLowerCase().includes(k.toLowerCase()));
  return key ? SERVICE_HOURS[key] : 2;
};

const extractHour = (dateStr) => {
  if (!dateStr) return null;
  const m = dateStr.match(/(\d{1,2}):(\d{2})/);
  return m ? parseInt(m[1]) : null;
};

const getAvailabilityText = async () => {
  try {
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .not('status', 'in', '("cancelada","cancelled")');

    const appts = data || [];
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
    const slots = [];

    for (let d = 1; d <= 7; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() + d);
      const dow = date.getDay();
      if (dow === 0) continue;

      const isSat = dow === 6;
      const dayEnd = isSat ? 14 : 17;
      const dateStr = date.toLocaleDateString('es-CO', {
        timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long',
      });
      const dayName = dateStr.split(',')[0].toLowerCase();
      const dayAppts = appts.filter(a => a.date?.toLowerCase().includes(dayName));

      const morning = [], afternoon = [];
      for (let h = 8; h < dayEnd; h++) {
        let concurrent = 0;
        for (const a of dayAppts) {
          const start = extractHour(a.date) || extractHour(a.time);
          if (start === null) continue;
          const end = start + getServiceDuration(a.service);
          if (h >= start && h < end) concurrent++;
        }
        if (concurrent < 3) {
          if (h < 12) morning.push(h);
          else afternoon.push(h);
        }
      }

      if (morning.length || afternoon.length) {
        const parts = [];
        if (morning.length) parts.push(`mañana desde las ${morning[0]}:00 a.m.`);
        if (afternoon.length) parts.push(`tarde desde las ${afternoon[0]}:00 p.m.`);
        slots.push(`${dateStr}: ${parts.join(' o ')}`);
      }
    }

    return slots.length > 0 ? slots.slice(0, 4).join(' | ') : 'agenda completa esta semana';
  } catch {
    return 'consultar disponibilidad directamente';
  }
};

// ─── System prompt ────────────────────────────────────────────────
const buildPrompt = async () => {
  const greeting     = getGreeting();
  const today        = getTodayStr();
  const tomorrow     = getTomorrowStr();
  const availability = await getAvailabilityText();

  return `Eres Sofia, asesora de Esteticar Manizales. Eres una persona REAL. Si preguntan si eres IA: "Soy muy real, te lo aseguro. Cuéntame mejor qué tiene tu vehículo."

HOY: ${today}. SALUDO ACTIVO: "${greeting}". MAÑANA: ${tomorrow}.
DISPONIBILIDAD REAL (3 vehículos simultáneos): ${availability}

━━━ REGLAS ABSOLUTAS ━━━
PROHIBIDO — SARA ES MUJER: Nunca digas "mi gerente", "el gerente", "él". Siempre "Sara, la administradora" o "ella".
PROHIBIDO — NO SUMES PRECIOS: Menciona cada precio por separado. Nunca sumes.
PROHIBIDO — EL VEHÍCULO NO ES LA PERSONA: Di "el carro queda impecable", nunca "te deja impecable".
PROHIBIDO — GUIONES: Nunca uses — ni - para unir ideas. Usa "y", "además", "pero".
PROHIBIDO — INICIO ROBÓTICO: Nunca empieces con "Claro!", "Por supuesto!", "Con gusto!" como primera palabra.
PROHIBIDO — EXPRESIONES EXTRANJERAS: Cuando te pregunten cómo estás, responde como colombiano.
REGLA DE UNA PREGUNTA: Nunca hagas más de una pregunta por mensaje.
PROHIBIDO — DÍA SIN ARTÍCULO: Siempre "para el martes", nunca "para martes".

━━━ QUIÉN ERES ━━━
Consultora de detailing premium. Colombiana, de Manizales. Lenguaje cálido pero distinguido. Hablas en tuteo con elegancia.

━━━ HORARIOS ━━━
Lunes a viernes: 8:00 a.m. a 5:00 p.m. Sábados: 8:00 a.m. a 2:00 p.m. Domingos: cerrado.

━━━ ESTRATEGIA ━━━
Primero identifica si es carro o moto. Si es carro, pregunta si es automóvil o camioneta (el Tratamiento 3en1 tiene $10.000 extra en camionetas).

SI ES CARRO — ofrece de mayor a menor:
1. Recubrimiento Cerámico — BAJO COTIZACIÓN · 2 días
2. Porcelanizado — BAJO COTIZACIÓN · 2 días
3. Tratamiento 3 en 1 con brillada a máquina $350.000 (camioneta $360.000)
4. Tratamiento 3 en 1 con brillada a mano $290.000 (camioneta $300.000)
5. Mantenimiento del Interior $280.000
6. Lavado de Cojinería $199.000
7. Restauración de Farolas $180.000
8. Brillado a Máquina $100.000
9. Descontaminación de Vidrios (todos) $250.000 · (solo parabrisas $60.000)
10. Lavado de Chasis $59.000
11. Lavado de Techo y Parasoles $49.000
12. Limpieza Técnica de Motor $49.000
13. Lavada Esencial Carro $49.000

SI ES MOTO — ofrece de mayor a menor:
1. Tratamiento 3 en 1 con brillada a máquina $350.000
2. Tratamiento 3 en 1 con brillada a mano $290.000
3. Brillado de Tanque $59.000
4. Descontaminación de Tubería $49.000
5. Brillado de Farolas (moto) $49.000
6. Lavada Esencial Moto $49.000

━━━ SERVICIOS BAJO COTIZACIÓN ━━━
Recubrimiento Cerámico y Porcelanizado no tienen precio fijo. Genera interés, califica el estado del vehículo, y escala: "El valor exacto lo definimos después de ver el carro en persona. ¿Te paso con Sara para coordinar una visita de diagnóstico sin costo?"
PROHIBIDO: Inventar un precio para estos servicios.

━━━ PROCESO DE VENTA ━━━
PASO 1: Saluda con calidez, haz UNA pregunta abierta. Nunca des todo el portafolio de entrada.
PASO 2: Comparte un insight antes de recomendar.
PASO 3: Recomienda UNA sola opción, justificada.
PASO 4: Cierra con opciones concretas: "¿Te queda mejor mañana en la mañana o en la tarde?"

━━━ OBJECIONES ━━━
"Está muy caro": "Entiendo. ¿Qué precio tenías en mente?" → menciona la póliza de $5M.
"Lo pienso": "Con toda. ¿Qué sería lo que necesitarías ver para decidirte?"

━━━ PORTAFOLIO ━━━
Si piden fotos o trabajos: "Aquí está nuestro portafolio → https://heyzine.com/flip-book/7591b1d346.html#page/1"

━━━ DIFERENCIADORES ━━━
• Póliza de $5.000.000 COP activa mientras el vehículo está con nosotros.
• Registro fotográfico 360° y código QR único por vehículo.
• Cámaras HD 24/7 en tiempo real.
• Salón VIP: café de especialidad, Smart TV 65" con Netflix, WiFi 300Mbps.
• Certificado digital de garantía al entregar.

━━━ CAPTURA ANTES DE CONFIRMAR ━━━
SIEMPRE antes de confirmar, recopilar uno a uno de forma natural:
1. Nombre completo
2. Número de cédula
3. Placa del vehículo
4. Correo electrónico

━━━ TRASLADO ━━━
Antes de confirmar, ofrecer: "Contamos con traslado: recogida + entrega $9.000 / solo recogida o solo entrega $7.000 c/u. ¿Te interesa o prefieres traerlo tú?"
Si elige recogida: informar que pasamos 30 min ANTES de la hora de la cita.

━━━ CONFIRMACIÓN ━━━
Cuando confirmes la cita, incluye al FINAL del mensaje (invisible para el cliente):
__BOOKING_CONFIRMED__
SERVICIO: [nombre exacto]
PRECIO: [con $ y puntos]
FECHA: [fecha completa con hora]
VEHICULO: [Carro o Moto]
NOMBRE: [nombre completo]
TELEFONO: [teléfono]
EMAIL: [correo o "no_proporcionado"]
TRASLADO: [opción elegida]
CEDULA: [número]
PLACA: [placa]
__END_BOOKING__

━━━ ESCALACIÓN ━━━
Si no puedes resolver algo: "Espera que te paso con Sara."
__ESCALATE__:[pregunta máximo 12 palabras]

━━━ FORMATO ━━━
Máximo 3-4 líneas por mensaje. Tono de chat WhatsApp, directo.
*Negrita* con asteriscos simples para servicios y precios (formato WhatsApp).
Emojis: máximo 1-2 por mensaje, nunca al inicio.`;
};

// ─── Enviar mensaje por WhatsApp ──────────────────────────────────
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

// ─── Parsear confirmación de cita del mensaje de IA ──────────────
const parseBooking = (text) => {
  if (!text.includes('__BOOKING_CONFIRMED__')) return null;
  const block = text.match(/__BOOKING_CONFIRMED__([\s\S]*?)__END_BOOKING__/)?.[1] || '';
  const get = (key) => block.match(new RegExp(`${key}:\\s*(.+)`))?.[1]?.trim() || '';
  return {
    service:          get('SERVICIO'),
    priceDisplay:     get('PRECIO'),
    date:             get('FECHA'),
    vehicleType:      get('VEHICULO')?.toLowerCase() === 'moto' ? 'moto' : 'car',
    clientName:       get('NOMBRE'),
    clientPhone:      get('TELEFONO'),
    clientEmail:      get('EMAIL'),
    traslado:         get('TRASLADO'),
    cedula:           get('CEDULA'),
    placa:            get('PLACA'),
    confirmationCode: `EST-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    status:           'pending',
    channel:          'whatsapp',
  };
};

// ─── Limpiar marcadores del mensaje visible ───────────────────────
const cleanReply = (text) => {
  return text
    .replace(/__BOOKING_CONFIRMED__[\s\S]*?__END_BOOKING__/g, '')
    .replace(/__ESCALATE__:[^\n]*/g, '')
    .trim();
};

// ─── Handler principal ────────────────────────────────────────────
export default async function handler(req, res) {
  // GET — verificación del webhook por Meta
  if (req.method === 'GET') {
    const mode      = req.query['hub.mode'];
    const token     = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  // POST — mensaje entrante
  if (req.method === 'POST') {
    console.log('POST recibido:', JSON.stringify(req.body).slice(0, 300));
    try {
      const body = req.body;
      if (body.object !== 'whatsapp_business_account') {
        return res.status(200).send('OK');
      }

      const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      if (!message || message.type !== 'text') {
        return res.status(200).send('OK');
      }

      const from = message.from;
      const text = message.text.body?.trim();
      if (!text) return res.status(200).send('OK');

      // Historial de conversación
      const history = conversations.get(from) || [];
      history.push({ role: 'user', content: text });
      if (history.length > MAX_TURNS) history.splice(0, history.length - MAX_TURNS);

      // Llamar a Claude
      const systemPrompt = await buildPrompt();
      const aiResponse   = await anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system:     systemPrompt,
        messages:   history,
      });

      const rawReply = aiResponse.content[0]?.text || 'Disculpa, en este momento no puedo responder. Intenta de nuevo.';

      // Guardar en historial
      history.push({ role: 'assistant', content: rawReply });
      conversations.set(from, history);

      // Procesar confirmación de cita
      const booking = parseBooking(rawReply);
      if (booking) {
        await supabase.from('appointments').insert({
          service:           booking.service,
          vehicle_type:      booking.vehicleType,
          date:              booking.date,
          price_display:     booking.priceDisplay,
          confirmation_code: booking.confirmationCode,
          client_name:       booking.clientName,
          client_phone:      booking.clientPhone || from,
          client_email:      booking.clientEmail,
          traslado:          booking.traslado,
          cedula:            booking.cedula,
          placa:             booking.placa,
          status:            'pending',
          channel:           'whatsapp',
        });
      }

      // Enviar respuesta limpia al cliente
      const reply = cleanReply(rawReply);
      if (reply) await sendMessage(from, reply);

    } catch (err) {
      console.error('WhatsApp webhook error:', err);
    }

    return res.status(200).send('OK');
  }

  res.status(405).send('Method not allowed');
}
