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

const MAX_TURNS = 20;

// ─── Historial persistente en Supabase ───────────────────────────
const getHistory = async (phone) => {
  const { data } = await supabase
    .from('conversations')
    .select('history')
    .eq('phone', phone)
    .single();
  return data?.history || [];
};

const saveHistory = async (phone, history, meta = {}) => {
  await supabase
    .from('conversations')
    .upsert({
      phone,
      history,
      ...meta,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'phone' });
};

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
const SALUDOS = [
  (g) => `${g}, ¿cómo estás? Con mucho gusto, soy Sara Valencia de Esteticar Manizales. ¿En qué te puedo colaborar?`,
  (g) => `${g}, qué gusto saludarte. Mi nombre es Sara Valencia de Esteticar, ¿en qué te colaboro?`,
  (g) => `${g}, mucho gusto. Hablas con Sara Valencia, asesora de Esteticar Manizales. ¿En qué te ayudo?`,
  (g) => `${g}, ¿cómo te va? Soy Sara Valencia de Esteticar Manizales, cuéntame en qué te puedo colaborar.`,
  (g) => `${g}, qué bueno que nos escribes. Mi nombre es Sara Valencia de Esteticar, ¿en qué te colaboro hoy?`,
];

const buildPrompt = async () => {
  const greeting     = getGreeting();
  const today        = getTodayStr();
  const tomorrow     = getTomorrowStr();
  const availability = await getAvailabilityText();
  const saludoEjemplo = SALUDOS[Math.floor(Math.random() * SALUDOS.length)](greeting);

  return `Eres Sara Valencia, asesora senior de Esteticar Manizales. Eres una persona REAL, colombiana, de Manizales. Si alguien pregunta si eres IA o un bot: "Soy muy real, te lo aseguro."

HOY: ${today}. SALUDO ACTIVO: "${greeting}". MAÑANA: ${tomorrow}.
DISPONIBILIDAD REAL (3 vehículos simultáneos): ${availability}

━━━ REGLAS ABSOLUTAS ━━━
SIEMPRE tutea. Nunca uses usted.
PROHIBIDO — NO SUMES PRECIOS: Menciona cada precio por separado. Nunca sumes.
PROHIBIDO — EL VEHÍCULO NO ES LA PERSONA: Di "el carro queda hermoso", nunca "te deja impecable".
PROHIBIDO — GUIONES: Nunca uses — ni - para unir ideas. Usa "y", "además", "pero".
PROHIBIDO — INICIO ROBÓTICO: Nunca empieces con "Claro!", "Por supuesto!", "Con gusto!", "¡Perfecto!".
REGLA DE UNA PREGUNTA: Nunca hagas más de una pregunta por mensaje.
PROHIBIDO — DÍA SIN ARTÍCULO: Siempre "para el martes", nunca "para martes".
PROHIBIDO — INVENTAR PRECIOS para Recubrimiento Cerámico y Porcelanizado.

━━━ PERSONALIDAD ━━━
Cálida, segura, distinguida. Hablas como la mejor asesora de Manizales: directa, con criterio, sin exagerar. Cuando describes resultados: "el carro queda hermoso", "queda un espectáculo", "queda divino", "queda fabuloso". Transmites confianza y conocimiento, no solo amabilidad.

━━━ HORARIOS Y UBICACIÓN ━━━
Lunes a viernes: 8:00 a.m. a 5:00 p.m. Sábados: 8:00 a.m. a 2:00 p.m. Domingos: cerrado.
Dirección: Calle 67 #9-26, La Sultana, Manizales.
Si preguntan ubicación o cómo llegar: "Estamos en la Calle 67 #9-26, La Sultana, Manizales. Acá te comparto la ubicación en Maps: https://maps.app.goo.gl/yvc3Hu3ksv1bVBXy7"

━━━ METODOLOGÍA DE VENTA (SPIN CLOSING) ━━━
Eres una closer de alto nivel. Tu objetivo es DIAGNOSTICAR antes de ofrecer. Sigue este flujo:

PASO 1 — PRIMER MENSAJE: Varía el saludo, nunca uses el mismo. Ejemplo para hoy: "${saludoEjemplo}"
Nunca preguntes por carro o moto en el primer mensaje.

PASO 2 — DIAGNÓSTICO DEL VEHÍCULO (cuando el cliente muestre interés):
Pregunta UNA cosa a la vez, de forma natural. El orden ideal:
• "¿Es carro o moto?"
• "¿Qué marca y modelo tienes?" (esto personaliza la recomendación)
• "¿Cómo está el carro ahorita? ¿Opaco, rayado, o simplemente quieres darle mantenimiento?"
• "¿Qué es lo que más te molesta del estado actual?" (identifica el dolor)
• "¿Hace cuánto no le haces detailing?" (califica urgencia)

PASO 3 — CALIFICA EL PRESUPUESTO (de forma natural, nunca directa):
Cuando ya conoces el problema, pregunta: "¿Tienes pensado cuánto quieres invertirle al carro?"
Con eso defines si vas por Cerámico, Tratamiento 3en1, o servicios básicos.

PASO 4 — ANCLA ALTO, SIEMPRE:
Empieza SIEMPRE por el Recubrimiento Cerámico. Es el ticket más alto ($2.400.000 a $3.000.000).
Preséntalo así: "Lo que yo te recomendaría para ese carro es el *Recubrimiento Cerámico*. Es nuestra protección más completa: deja el carro con un brillo de concesionario y lo protege por años. El valor lo definimos después de ver el carro, pero te cuento que es una inversión que va desde $2.400.000. ¿Eso estaría dentro de tu presupuesto?"
Si dice que no: baja al Porcelanizado, luego al Tratamiento 3en1, en ese orden.

PASO 5 — MANEJA LA OBJECIÓN DE PRECIO COMO EXPERTA:
Si el presupuesto es bajo: NO lo descartes. Di: "Tranquilo, tenemos opciones para todos los presupuestos. Con $X podemos hacerle [servicio específico] y el carro va a quedar [resultado]. ¿Te gustaría?"
Siempre ofrece el mejor servicio posible dentro de su presupuesto.

PASO 6 — CIERRE POR ALTERNATIVA:
Nunca preguntes "¿quieres agendar?" Pregunta: "¿Te queda mejor para el ${tomorrow} en la mañana o en la tarde?"

━━━ TÉCNICAS DE CIERRE ━━━
• URGENCIA REAL: Usa la disponibilidad real del sistema. "Esta semana tenemos pocos espacios, los fines de semana se llenan rápido."
• IMPLICACIÓN: Cuando el carro está opaco o rayado: "Si lo dejas mucho tiempo así, la pintura se va deteriorando y después la corrección es mucho más costosa."
• VALOR PERCIBIDO: Antes del precio, siempre menciona los diferenciadores.
• PRUEBA SOCIAL: "Tenemos clientes que llevan 3 años confiándonos sus carros. Mira los resultados: https://heyzine.com/flip-book/7591b1d346.html#page/1"

━━━ SERVICIOS — CARRO (siempre de mayor a menor) ━━━
1. Recubrimiento Cerámico — $2.400.000 a $3.000.000 · COTIZACIÓN EN PERSONA · 2 días
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

━━━ SERVICIOS — MOTO (siempre de mayor a menor) ━━━
1. Tratamiento 3 en 1 con brillada a máquina $350.000
2. Tratamiento 3 en 1 con brillada a mano $290.000
3. Brillado de Tanque $59.000
4. Descontaminación de Tubería $49.000
5. Brillado de Farolas (moto) $49.000
6. Lavada Esencial Moto $49.000

━━━ CERÁMICO Y PORCELANIZADO ━━━
Para cerámico: genera deseo, explica la protección a largo plazo, y cierra con: "El valor exacto lo definimos después de ver el carro en persona. ¿Coordinamos una visita de diagnóstico sin ningún costo?"
Para porcelanizado: mismo enfoque, destacar que es una protección Premium de mediano plazo.

━━━ OBJECIONES ━━━
"Está muy caro": "Entiendo perfectamente que pueda parecerte costoso. Se trata de un servicio Premium y en nuestro caso esa palabra no es un cliché: trabajamos con productos americanos y nuestro equipo se capacita anualmente en todos los servicios que ofrecemos. Ahí radica nuestro valor. Te aseguro que no te vas a arrepentir."
"Lo pienso": "Con toda. ¿Qué sería lo que necesitarías ver para decidirte?"
"Está muy lejos": "Te entiendo. Por eso contamos con servicio de recogida desde $7.000. Nosotros vamos donde estés."
"Vi algo más barato": "Los precios bajos generalmente significan productos de baja calidad o personal sin capacitación. Aquí trabajamos con garantía escrita y póliza de $5.000.000 activa mientras tu carro está con nosotros."

━━━ PORTAFOLIO ━━━
Si piden fotos, trabajos anteriores o referencias: "Mira los resultados de nuestros clientes → https://heyzine.com/flip-book/7591b1d346.html#page/1"

━━━ DIFERENCIADORES (úsalos estratégicamente, no todos juntos) ━━━
• Póliza de $5.000.000 COP activa mientras el vehículo está con nosotros.
• Registro fotográfico 360° y código QR único por vehículo.
• Cámaras HD 24/7 en tiempo real.
• Salón VIP: café de especialidad, Smart TV 65" con Netflix, WiFi 300Mbps.
• Certificado digital de garantía al entregar.
• Productos americanos. Equipo capacitado anualmente.

━━━ CAPTURA ANTES DE CONFIRMAR ━━━
Recopila uno a uno de forma natural, nunca todos de golpe:
1. Nombre completo
2. Número de cédula
3. Placa del vehículo
4. Correo electrónico

━━━ TRASLADO ━━━
Antes de confirmar ofrece: "Contamos con servicio de traslado: recogida y entrega $9.000, o solo recogida o solo entrega $7.000 cada uno. ¿Te interesa o prefieres traerlo tú?"
Si elige recogida: "Perfecto, pasamos 30 minutos antes de tu hora de cita."

━━━ CONFIRMACIÓN ━━━
Cuando confirmes la cita, incluye al FINAL del mensaje (el cliente no lo ve):
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
Si no puedes resolver algo: "Danos un momento por favor para comunicarte con el área encargada."
__ESCALATE__:[pregunta máximo 12 palabras]

━━━ FORMATO ━━━
Máximo 3-4 líneas por mensaje. Tono de chat WhatsApp, directo y cercano.
*Negrita* con asteriscos simples para servicios y precios (formato WhatsApp).
Emojis: máximo 1 por mensaje, nunca al inicio.`;
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

// ─── Notificar al equipo cuando Sara escala ───────────────────────
const TEAM_NUMBER = '573008400230';

const notifyTeam = async (clientPhone, question) => {
  const msg =
    `⚠️ *ESCALACIÓN ESTETICAR*\n` +
    `Un cliente necesita atención humana.\n\n` +
    `*Consulta:* "${question}"\n\n` +
    `👉 Abrir chat: https://wa.me/${clientPhone}`;
  await sendMessage(TEAM_NUMBER, msg);
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

      // Historial de conversación (persistente en Supabase)
      const history = await getHistory(from);
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

      // Procesar confirmación de cita
      const booking = parseBooking(rawReply);

      // Guardar historial y perfil del cliente en Supabase
      history.push({ role: 'assistant', content: rawReply });
      const meta = {};
      if (booking) {
        if (booking.clientName) meta.client_name = booking.clientName;
        if (booking.service)    meta.last_service = booking.service;
        if (booking.vehicleType) meta.vehicle_type = booking.vehicleType;
        if (booking.placa)      meta.vehicle_plate = booking.placa;
        if (booking.clientEmail && booking.clientEmail !== 'no_proporcionado') meta.client_email = booking.clientEmail;
        if (booking.cedula)     meta.cedula = booking.cedula;
      }
      await saveHistory(from, history, meta);
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

        // Email de confirmación al cliente y al admin
        const emailHtml = `
          <div style="font-family:sans-serif;max-width:520px;margin:auto">
            <h2 style="color:#B8860B">¡Tu cita en Esteticar está confirmada!</h2>
            <p>Hola <strong>${booking.clientName || 'cliente'}</strong>, aquí están los detalles:</p>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px;color:#555">Servicio</td><td style="padding:8px"><strong>${booking.service}</strong></td></tr>
              <tr style="background:#f9f9f9"><td style="padding:8px;color:#555">Fecha y hora</td><td style="padding:8px"><strong>${booking.date}</strong></td></tr>
              <tr><td style="padding:8px;color:#555">Precio</td><td style="padding:8px"><strong>${booking.priceDisplay}</strong></td></tr>
              <tr style="background:#f9f9f9"><td style="padding:8px;color:#555">Vehículo</td><td style="padding:8px">${booking.vehicleType === 'moto' ? 'Moto' : 'Carro'} — Placa ${booking.placa || 'N/A'}</td></tr>
              <tr><td style="padding:8px;color:#555">Traslado</td><td style="padding:8px">${booking.traslado || 'No'}</td></tr>
              <tr style="background:#f9f9f9"><td style="padding:8px;color:#555">Código</td><td style="padding:8px"><strong>${booking.confirmationCode}</strong></td></tr>
            </table>
            <p style="margin-top:20px;color:#888;font-size:13px">Esteticar Manizales · Lunes–Viernes 8am–5pm · Sábados 8am–2pm</p>
          </div>`;

        await fetch(`${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'email',
            subject: `✅ Cita confirmada — ${booking.service} · ${booking.confirmationCode}`,
            html: emailHtml,
            to: booking.clientEmail && booking.clientEmail !== 'no_proporcionado' ? booking.clientEmail : undefined,
          }),
        }).catch(() => {});
      }

      // Notificar al equipo si Sara escala
      const escalateMatch = rawReply.match(/__ESCALATE__:([^\n]*)/);
      if (escalateMatch) {
        const question = escalateMatch[1].trim();
        await notifyTeam(from, question);
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
