// api/chat.js
// Web chat AI endpoint — clave de Anthropic 100% server-side
// El browser nunca ve ANTHROPIC_API_KEY

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

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

const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRST';
  return `EST-${chars[Math.floor(Math.random() * chars.length)]}${Math.floor(Math.random() * 9000) + 1000}`;
};

// ─── Disponibilidad ───────────────────────────────────────────────
const SERVICE_HOURS = {
  'Descontaminación de Vidrios (parabrisas)': 1, 'Descontaminacion de Vidrios (parabrisas)': 1,
  'Descontaminación de Vidrios': 2, 'Descontaminacion de Vidrios': 2,
  'Tratamiento 3 en 1 a Máquina': 5, 'Tratamiento 3 en 1 a Maquina': 5,
  'Tratamiento 3 en 1 Manual': 4, 'Mantenimiento Interior': 3,
  'Lavado de Cojinería': 4, 'Lavado de Cojineria': 4,
  'Restauración de Farolas': 2, 'Restauracion de Farolas': 2,
  'Brillado a Máquina': 3, 'Brillado a Maquina': 3,
  'Recubrimiento Cerámico': 6, 'Recubrimiento Ceramico': 6,
  'Porcelanizado': 5, 'Limpieza Técnica de Motor': 1, 'Limpieza Tecnica de Motor': 1,
  'Lavado de Techo': 1, 'Lavado de Chasis': 1,
  'Lavada Esencial': 1, 'Brillado de Farolas': 1, 'Brillado Farolas': 1,
  'Brillado de Tanque': 1, 'Descontaminación de Tubería': 1, 'Descontaminacion de Tuberia': 1,
};

const getServiceDuration = (name) => {
  if (!name) return 2;
  const key = Object.keys(SERVICE_HOURS).find(k => name.toLowerCase().includes(k.toLowerCase()));
  return key ? SERVICE_HOURS[key] : 2;
};

const extractHour = (str) => {
  if (!str) return null;
  const m = str.match(/(\d{1,2}):(\d{2})/);
  return m ? parseInt(m[1]) : null;
};

const getAvailability = async () => {
  try {
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .not('status', 'in', '("cancelada","cancelled")');

    const appts = data || [];
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
    const slots = [];
    let available = 0;

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
        if (morning.length) { parts.push(`mañana desde las ${morning[0]}:00 a.m.`); available++; }
        if (afternoon.length) { parts.push(`tarde desde las ${afternoon[0]}:00 p.m.`); available++; }
        slots.push(`${dateStr}: ${parts.join(' o ')}`);
      }
    }

    return {
      text: slots.length > 0 ? slots.slice(0, 4).join(' | ') : 'agenda completa esta semana',
      available,
    };
  } catch {
    return { text: 'consultar disponibilidad directamente', available: 10 };
  }
};

// ─── System prompt ────────────────────────────────────────────────
const buildPrompt = async (advisorName) => {
  const greeting = getGreeting();
  const today = getTodayStr();
  const tomorrow = getTomorrowStr();
  const { text: availability, available } = await getAvailability();

  const scarcity = available <= 3
    ? `\nESCASEZ ACTIVA: Solo quedan ${available} espacio${available === 1 ? '' : 's'} disponibles esta semana. Menciónalo naturalmente.`
    : '';

  return `Eres ${advisorName}, asesora de Esteticar Manizales. Eres una persona REAL, colombiana. Si preguntan si eres IA: "Soy muy real, te lo aseguro."

HOY: ${today}. SALUDO ACTIVO: "${greeting}". MAÑANA: ${tomorrow}.
DISPONIBILIDAD REAL (3 vehículos simultáneos): ${availability}${scarcity}

━━━ REGLAS ABSOLUTAS ━━━
SIEMPRE tutea. Nunca uses usted.
PROHIBIDO — CONDICIONAL: Nunca "estaría", "recomendaría", "vendría". Usa presente: "está", "recomiendo", "queda".
PROHIBIDO — NO SUMES PRECIOS: Menciona cada precio por separado.
PROHIBIDO — EL VEHÍCULO NO ES LA PERSONA: NUNCA "te deja impecable". SIEMPRE "tu carro queda impecable".
PROHIBIDO — GUIONES: Nunca uses — ni -. Usa "y", "además", "pero".
PROHIBIDO — INICIO ROBÓTICO: Nunca empieces con "Claro!", "Por supuesto!", "Con gusto!".
PROHIBIDO — SIGNO DE APERTURA: Nunca uses ¿ ni ¡.
PROHIBIDO — DOMINGOS: Esteticar NO trabaja los domingos.
REGLA DE UNA PREGUNTA: Nunca hagas más de una pregunta por mensaje.
PROHIBIDO — DÍA SIN ARTÍCULO: Siempre "para el martes", nunca "para martes".
PROHIBIDO — INVENTAR PRECIOS para Recubrimiento Cerámico y Porcelanizado.
PROHIBIDO — REPETIR PREGUNTAS: Revisa el historial antes de pedir información.

━━━ PERSONALIDAD ━━━
Asesora premium, cálida, segura. Conoces tu producto en profundidad. Cercana pero distinguida.
Resultados: "el carro queda hermoso", "queda un espectáculo", "queda divino".

━━━ HORARIOS ━━━
Lunes a viernes: 8:00 a.m. a 5:00 p.m. Sábados: 8:00 a.m. a 2:00 p.m. Domingos: cerrado.
Ubicación: Calle 67 #9-26, La Sultana, Manizales.

━━━ CLASIFICACIÓN DE LEADS ━━━
Clasifica en cada mensaje (invisible para el cliente):
__LEAD_TYPE__:[regateador|analista|embalado|billetudo]

🫰 REGATEADOR: solo pide precio, busca lo más barato.
📚 ANALISTA: quiere entender, pregunta "qué incluye?", primer servicio.
⚡ EMBALADO: urgencia — "lo voy a vender", "se manchó", "para este fin de semana".
💸 BILLETUDO: pregunta por cerámico, protección completa, no pregunta precios.

Si rechaza o se enfría: __OBJECTION__:[razón en máximo 5 palabras]

━━━ ESTRATEGIA DE VENTA ━━━
PASO 1: Responde el saludo con calidez. UNA sola pregunta abierta. Nunca empieces ofreciendo el portafolio.
PASO 2: Una vez muestre interés, pregunta UNA A UNA: carro o moto → marca y modelo → qué quiere mejorarle.
PASO 3: Recomienda UNA opción justificada según lo que dijo.
PASO 4: Cierre por alternativa: "Te queda mejor mañana en la mañana o en la tarde?"

Nombre del cliente — en cuanto lo sepas: __NAME__:[nombre completo]

━━━ SERVICIOS — CARRO ━━━
1. Recubrimiento Cerámico — BAJO COTIZACIÓN · 2 días · protección 5 años
2. Porcelanizado — BAJO COTIZACIÓN · 2 días · protección 6 meses a 1 año
3. Tratamiento 3 en 1 a Máquina $350.000 (camioneta $360.000)
4. Tratamiento 3 en 1 Manual $290.000 (camioneta $300.000)
5. Mantenimiento del Interior $280.000
6. Lavado de Cojinería $199.000
7. Restauración de Farolas $180.000
8. Descontaminación de Vidrios (todos) $250.000 · (solo parabrisas $60.000)
9. Brillado a Máquina $100.000
10. Lavado de Chasis $59.000
11. Lavado de Techo y Parasoles $49.000
12. Limpieza Técnica de Motor $49.000
13. Lavada Esencial Carro $49.000

━━━ SERVICIOS — MOTO ━━━
1. Tratamiento 3 en 1 a Máquina $350.000
2. Tratamiento 3 en 1 Manual $290.000
3. Brillado de Tanque $59.000
4. Descontaminación de Tubería $49.000
5. Brillado de Farolas $49.000
6. Lavada Esencial Moto $49.000

━━━ DIFERENCIADORES ━━━
• Póliza de $5.000.000 COP activa mientras el vehículo está con nosotros.
• Registro fotográfico 360° y código QR único.
• Cámaras HD 24/7 en tiempo real.
• Salón VIP: café de especialidad, Smart TV 65" Netflix, WiFi 300Mbps.
• Portafolio: https://heyzine.com/flip-book/7591b1d346.html#page/1

━━━ CAPTURA ANTES DE CONFIRMAR (pedir UNO A UNO) ━━━
1. Nombre completo
2. Placa del vehículo
3. Cédula
4. Correo electrónico
Si el cliente no quiere dar alguno: acepta "no_proporcionado" y continúa. NUNCA bloquees la cita.

━━━ TRASLADO ━━━
Antes de confirmar: "Contamos con traslado: recogida y entrega $9.000, solo una dirección $7.000. Te interesa?"
Si elige recogida: pide dirección. Confirma: "Llegamos 30 minutos antes de tu cita."
Si lleva él mismo: NO menciones recogida en la confirmación.

━━━ CONFIRMAR CITA — OBLIGATORIO ━━━
Al confirmar, añade al FINAL del mensaje (invisible para el cliente):
__BOOKING_CONFIRMED__
SERVICIO: [nombre exacto]
PRECIO: [con $ y puntos]
FECHA: [fecha completa con hora]
VEHICULO: [Carro o Moto]
NOMBRE: [nombre completo]
TELEFONO: [teléfono o "no_proporcionado"]
EMAIL: [correo o "no_proporcionado"]
TRASLADO: [opción o "sin traslado"]
DIRECCION: [dirección o "no_aplica"]
CEDULA: [cédula o "no_proporcionado"]
PLACA: [placa o "no_proporcionado"]
__END_BOOKING__

━━━ ESCALACIÓN ━━━
Si no puedes resolver: "Dame un momento, te paso con Sara la administradora."
__ESCALATE__:[pregunta máximo 12 palabras]

━━━ FORMATO ━━━
Máximo 3-4 líneas. Tono de chat.
**Negrita** para servicios y precios. Emojis: máximo 1-2 por mensaje, nunca al inicio.`;
};

// ─── Booking parser ───────────────────────────────────────────────
const parseBooking = (text) => {
  if (!text.includes('__BOOKING_CONFIRMED__')) return null;
  const block = text.match(/__BOOKING_CONFIRMED__([\s\S]*?)__END_BOOKING__/)?.[1] || '';
  if (!block) return null;
  const get = (key) => block.match(new RegExp(`${key}:\\s*(.+)`))?.[1]?.trim() || '';
  return {
    service: get('SERVICIO'), priceDisplay: get('PRECIO'), date: get('FECHA'),
    vehicleType: /moto/i.test(get('VEHICULO')) ? 'Moto' : 'Carro',
    clientName: get('NOMBRE'), clientPhone: get('TELEFONO'), clientEmail: get('EMAIL'),
    traslado: get('TRASLADO'), direccion: get('DIRECCION'),
    cedula: get('CEDULA'), placa: get('PLACA'),
  };
};

const cleanReply = (text) => text
  .replace(/__BOOKING_CONFIRMED__[\s\S]*?__END_BOOKING__/g, '')
  .replace(/__NAME__:[^\n]*/g, '')
  .replace(/__LEAD_TYPE__:[^\n]*/g, '')
  .replace(/__OBJECTION__:[^\n]*/g, '')
  .trim();

// ─── Handler ──────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userMessage, advisorName = 'Sara', history = [], sessionId } = req.body || {};
  if (!userMessage?.trim()) return res.status(400).json({ error: 'Missing userMessage' });

  try {
    const systemPrompt = await buildPrompt(advisorName);

    // Build message array for Claude (last 18 turns, filter out admin messages)
    const apiMessages = history
      .slice(-18)
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role,
        content: (typeof m.content === 'string' ? m.content : '')
          .replace(/__BOOKING_CONFIRMED__[\s\S]*?__END_BOOKING__/g, '')
          .replace(/__ESCALATE__:[^\n]*/g, '')
          .replace(/__LEAD_TYPE__:[^\n]*/g, '')
          .replace(/__NAME__:[^\n]*/g, '')
          .replace(/__OBJECTION__:[^\n]*/g, '')
          .trim(),
      }))
      .filter(m => m.content.length > 0);

    apiMessages.push({ role: 'user', content: userMessage });

    const aiResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 450,
      system: systemPrompt,
      messages: apiMessages,
    });

    const rawReply = aiResponse.content[0]?.text || 'Disculpa, algo salió mal. Intenta de nuevo.';

    // Extract meta tags
    const nameMatch  = rawReply.match(/__NAME__:([^\n]+)/);
    const leadMatch  = rawReply.match(/__LEAD_TYPE__:([^\n]+)/);
    const escalMatch = rawReply.match(/__ESCALATE__:([^\n]*)/);
    const booking    = parseBooking(rawReply);

    // Save booking to Supabase
    if (booking && booking.service) {
      const code = generateCode();
      const timeMatch = booking.date?.match(/(\d{1,2}):(\d{2})/);
      const bookingTime = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : null;

      let trasladoFinal = null;
      if (booking.traslado && !['sin traslado', 'no_proporcionado'].includes(booking.traslado)) {
        trasladoFinal = booking.traslado;
        if (booking.direccion && !['no_aplica', 'no_proporcionado'].includes(booking.direccion)) {
          trasladoFinal += ` · Dir: ${booking.direccion}`;
        }
      }

      const apptPayload = {
        service: booking.service,
        vehicle_type: booking.vehicleType,
        date: booking.date,
        time: bookingTime,
        price_display: booking.priceDisplay,
        confirmation_code: code,
        client_name: booking.clientName,
        client_phone: sessionId || 'web_sin_telefono',
        client_email: booking.clientEmail !== 'no_proporcionado' ? booking.clientEmail : null,
        traslado: trasladoFinal,
        cedula: booking.cedula !== 'no_proporcionado' ? booking.cedula : null,
        placa: booking.placa !== 'no_proporcionado' ? booking.placa : null,
        status: 'pending',
        channel: 'web_chat',
        created_date: new Date().toISOString(),
      };

      supabaseAdmin.from('appointments').insert(apptPayload).catch(e => console.error('Appt insert:', e.message));

      if (booking.clientName) {
        supabaseAdmin.from('clients').upsert({
          phone: sessionId || 'web_sin_telefono',
          name: booking.clientName,
          last_service: booking.service,
          last_date: new Date().toISOString(),
          updated: new Date().toISOString(),
        }, { onConflict: 'phone' }).catch(() => {});
      }

      // Send confirmation email
      if (booking.clientEmail && booking.clientEmail !== 'no_proporcionado' && booking.clientEmail.includes('@')) {
        const emailHtml = `<div style="font-family:sans-serif;max-width:520px;margin:auto;border:1px solid #eee;border-radius:8px;overflow:hidden">
          <div style="background:#000;padding:20px;text-align:center">
            <img src="https://esteticar-vff.vercel.app/logo.png" alt="Esteticar" style="height:50px"/>
            <div style="color:#F8C840;font-size:11px;letter-spacing:2px;margin-top:8px">CUSTODIA VEHICULAR PREMIUM</div>
          </div>
          <div style="padding:24px;background:#fafafa">
            <h2 style="color:#111;margin:0 0 16px 0">Tu cita está confirmada ✅</h2>
            <p style="color:#555;margin:0 0 16px 0">Hola <strong>${booking.clientName}</strong>, aquí está el resumen:</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr style="border-bottom:1px solid #eee"><td style="padding:8px 0;color:#888;width:130px">Servicio</td><td style="padding:8px 0;font-weight:600">${booking.service}</td></tr>
              <tr style="border-bottom:1px solid #eee"><td style="padding:8px 0;color:#888">Fecha</td><td style="padding:8px 0;font-weight:600">${booking.date}</td></tr>
              <tr style="border-bottom:1px solid #eee"><td style="padding:8px 0;color:#888">Precio</td><td style="padding:8px 0;font-weight:700;color:#B4821E">${booking.priceDisplay}</td></tr>
              <tr><td style="padding:8px 0;color:#888">Código</td><td style="padding:8px 0;font-family:monospace;font-size:16px;font-weight:700">${code}</td></tr>
            </table>
            <div style="margin-top:16px;padding:12px;background:#FFF8E7;border-left:3px solid #F8C840;font-size:13px;color:#555">
              Calle 67 #9-26, La Sultana, Manizales · WhatsApp: 318 198 3601
            </div>
          </div>
        </div>`;
        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
        fetch(`${baseUrl}/api/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'email', subject: `Cita confirmada — ${code}`, html: emailHtml, to: booking.clientEmail }),
        }).catch(() => {});
      }

      // Push + email to team
      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
      fetch(`${baseUrl}/api/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'push',
          title: `🚗 Nueva cita web — ${booking.clientName}`,
          message: `${booking.service} · ${booking.date} · ${booking.priceDisplay}`,
          priority: 4,
        }),
      }).catch(() => {});
    }

    // Update conversation in Supabase with lead/name/bot_paused
    if (sessionId) {
      const meta = {};
      if (nameMatch) meta.client_name = nameMatch[1].trim();
      if (leadMatch) meta.lead_type = leadMatch[1].trim();
      if (escalMatch) meta.bot_paused = true;
      if (Object.keys(meta).length > 0) {
        supabase.from('conversations').update({ ...meta, updated_at: new Date().toISOString() }).eq('phone', sessionId).catch(() => {});
      }
    }

    const finalReply = cleanReply(rawReply) + (escalMatch ? `\n__ESCALATE__:${escalMatch[1].trim()}` : '');

    return res.status(200).json({ reply: finalReply });

  } catch (err) {
    console.error('[api/chat] Error:', err.message);
    return res.status(500).json({ reply: 'Uy, tuve un problemita de conexión. Intenta de nuevo 😊' });
  }
}
