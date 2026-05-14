// api/chat.js
// Web chat AI endpoint — clave de Anthropic 100% server-side

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

// ─── Festivos colombianos 2025–2026 ───────────────────────────────
// Fijos: 1 ene, 1 may, 20 jul, 7 ago, 8 dic, 25 dic, Jue/Vie Santos
// Emiliani (se mueven al lunes siguiente): reyes, san josé, ascensión,
// corpus christi, sagrado corazón, san pedro, asunción, raza, todos santos, ctg
const HOLIDAYS = new Set([
  '2025-01-01','2025-01-06','2025-03-24','2025-04-17','2025-04-18',
  '2025-05-01','2025-06-02','2025-06-23','2025-06-30','2025-07-20',
  '2025-08-07','2025-08-18','2025-10-13','2025-11-03','2025-11-17',
  '2025-12-08','2025-12-25',
  '2026-01-01','2026-01-12','2026-03-23','2026-04-02','2026-04-03',
  '2026-05-01','2026-05-18','2026-06-08','2026-06-15','2026-06-29',
  '2026-07-20','2026-08-07','2026-08-17','2026-10-12','2026-11-02',
  '2026-11-16','2026-12-08','2026-12-25',
]);

// ─── Helpers de tiempo ─────────────────────────────────────────────
const toColombiaDate = (date = new Date()) =>
  new Date(date.toLocaleString('en-US', { timeZone: 'America/Bogota' }));

const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

const isHoliday = (date) => HOLIDAYS.has(toISO(toColombiaDate(date)));

const getGreeting = () => {
  const h = toColombiaDate().getHours();
  if (h >= 5 && h < 12) return 'Buenos días';
  if (h >= 12 && h < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

const getTodayStr = () =>
  new Date().toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long',
  });

const getTomorrowStr = () => {
  const d = toColombiaDate();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long',
  });
};

const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRST';
  return `EST-${chars[Math.floor(Math.random() * chars.length)]}${Math.floor(Math.random() * 9000) + 1000}`;
};

// Próximos festivos (máx. 5) para incluir en el prompt
const getNextHolidaysText = () => {
  const todayISO = toISO(toColombiaDate());
  return [...HOLIDAYS]
    .filter(h => h >= todayISO)
    .sort()
    .slice(0, 6)
    .map(h => new Date(h + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', weekday: 'long' }))
    .join('; ');
};

// ─── Disponibilidad ────────────────────────────────────────────────
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
      .not('status', 'in', '("cancelada","cancelada_ok","cancelled")');

    const appts = data || [];
    const now = toColombiaDate();
    const currentHour = now.getHours();
    const slots = [];
    let available = 0;

    for (let d = 0; d <= 14; d++) {
      const date = new Date(now);
      date.setDate(now.getDate() + d);
      const dow = date.getDay();

      if (dow === 0) continue;
      if (isHoliday(date)) continue;

      const isSat = dow === 6;
      const dayEnd = isSat ? 14 : 17;
      // Para hoy, solo mostrar horas que aún no pasaron (con 1h de anticipación mínima)
      const startHour = d === 0 ? Math.max(8, currentHour + 1) : 8;

      if (startHour >= dayEnd) continue;

      const dateStr = date.toLocaleDateString('es-CO', {
        timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long',
      });
      const dayName = dateStr.split(',')[0].toLowerCase();
      const dayAppts = appts.filter(a => a.date?.toLowerCase().includes(dayName));

      const morning = [], afternoon = [];
      for (let h = startHour; h < dayEnd; h++) {
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
        if (morning.length) { parts.push(`mañana desde las ${morning[0]}:00`); available++; }
        if (afternoon.length) { parts.push(`tarde desde las ${afternoon[0]}:00`); available++; }
        const label = d === 0 ? `HOY (${dateStr})` : dateStr;
        slots.push(`${label}: ${parts.join(' o ')}`);
        if (slots.length >= 5) break;
      }
    }

    return {
      text: slots.length > 0 ? slots.join(' | ') : 'agenda completa por el momento',
      available,
    };
  } catch {
    return { text: 'consultar disponibilidad directamente', available: 10 };
  }
};

// ─── Citas activas del cliente ─────────────────────────────────────
const getClientAppointments = async (sessionId) => {
  if (!sessionId) return [];
  try {
    const { data } = await supabaseAdmin
      .from('appointments')
      .select('service, date, time, confirmation_code, status, vehicle_type, client_name')
      .eq('client_phone', sessionId)
      .not('status', 'in', '("cancelada","cancelada_ok","cancelled")')
      .order('created_date', { ascending: false })
      .limit(5);
    return data || [];
  } catch { return []; }
};

// ─── System prompt ─────────────────────────────────────────────────
const buildPrompt = async (advisorName, sessionId = null) => {
  const greeting = getGreeting();
  const today = getTodayStr();
  const todayISO = toISO(toColombiaDate());
  const tomorrow = getTomorrowStr();
  const { text: availability, available } = await getAvailability();
  const nextHolidays = getNextHolidaysText();
  const clientAppts = await getClientAppointments(sessionId);

  const scarcity = available > 0 && available <= 3
    ? `\nESCASEZ ACTIVA: Solo quedan ${available} espacio${available === 1 ? '' : 's'} disponibles. Menciónalo con naturalidad.`
    : '';

  return `Eres ${advisorName}, asesora de Esteticar Manizales. Eres una persona REAL, colombiana. Si preguntan si eres IA: "Soy muy real, te lo aseguro."

HOY: ${today} (${todayISO}). SALUDO ACTIVO: "${greeting}". MAÑANA: ${tomorrow}.
DISPONIBILIDAD REAL (máx. 3 vehículos simultáneos, próximos 14 días hábiles): ${availability}${scarcity}

━━━ REGLAS ABSOLUTAS ━━━
SIEMPRE tutea. Nunca uses usted.
PROHIBIDO — CONDICIONAL: Nunca "estaría", "recomendaría", "vendría". Usa presente: "está", "recomiendo", "queda".
PROHIBIDO — NO SUMES PRECIOS: Menciona cada precio por separado.
PROHIBIDO — EL VEHÍCULO NO ES LA PERSONA: NUNCA "te deja impecable". SIEMPRE "tu carro queda impecable".
PROHIBIDO — GUIONES: Nunca uses — ni -. Usa "y", "además", "pero".
PROHIBIDO — INICIO ROBÓTICO: Nunca empieces con "Claro!", "Por supuesto!", "Con gusto!".
PROHIBIDO — SIGNO DE APERTURA: Nunca uses ¿ ni ¡.
REGLA DE UNA PREGUNTA: Nunca hagas más de una pregunta por mensaje.
PROHIBIDO — DÍA SIN ARTÍCULO: Siempre "para el martes", nunca "para martes".
PROHIBIDO — INVENTAR PRECIOS para Recubrimiento Cerámico y Porcelanizado.
PROHIBIDO — REPETIR PREGUNTAS: Revisa el historial antes de pedir información.
━━━ REGLAS DE CALENDARIO — CRÍTICAS ━━━
HOY ES: ${todayISO}. Esta fecha es la referencia absoluta.

PROHIBIDO — FECHAS PASADAS: Si el cliente pide "ayer", "el viernes pasado", "la semana pasada", o cualquier fecha anterior a ${todayISO}, NUNCA generes __BOOKING_CONFIRMED__. Responde: "Solo puedo agendar desde hoy en adelante. Qué día te queda bien?" Punto. Sin explicaciones adicionales.

VALIDACIÓN OBLIGATORIA ANTES DE CONFIRMAR CITA:
Antes de generar __BOOKING_CONFIRMED__, verifica las 5 condiciones:
  1. La fecha es igual o posterior a ${todayISO}
  2. No es domingo
  3. No es festivo (próximos festivos: ${nextHolidays})
  4. Está dentro de los próximos 14 días desde hoy
  5. La hora está dentro del horario: L-V 8:00-17:00, Sábados 8:00-14:00
Si cualquier condición falla, NO confirmes. Redirige con naturalidad.

MISMO DÍA: Puedes agendar para HOY si la disponibilidad muestra "HOY" con espacios libres. Si no aparece "HOY" en la disponibilidad, el día de hoy ya está lleno o cerrado.

MÁXIMO 14 DÍAS: Solo agenda dentro de los próximos 14 días. Si piden más adelante: "Para esa fecha me toca pasarte con Sara para coordinar, te parece bien?" y usa __ESCALATE__.

FESTIVOS — CERRADO: ${nextHolidays}. Nunca ofrezcas ni confirmes citas en esas fechas. Si el cliente propone una de esas fechas, di: "Ese día es festivo y estamos cerrados. El día siguiente hábil tenemos disponibilidad, qué te parece?"

SÁBADOS: Solo hasta las 2:00 p.m. Si proponen sábado después de las 2, di que solo atendemos hasta las 2.

━━━ PERSONALIDAD ━━━
Asesora premium, cálida, segura. Conoces tu producto en profundidad. Cercana pero distinguida.
Resultados: "el carro queda hermoso", "queda un espectáculo", "queda divino".

━━━ HORARIOS ━━━
Lunes a viernes: 8:00 a.m. a 5:00 p.m. Sábados: 8:00 a.m. a 2:00 p.m. Domingos y festivos: cerrado.
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
1. Recubrimiento Cerámico — BAJO COTIZACIÓN · protección 5 años
2. Porcelanizado — BAJO COTIZACIÓN · protección 6 meses a 1 año
3. Tratamiento 3 en 1 a Máquina $350.000
4. Tratamiento 3 en 1 Manual $290.000
5. Brillado de Tanque $59.000
6. Descontaminación de Tubería $49.000
7. Brillado de Farolas $49.000
8. Lavada Esencial Moto $49.000
NOTA: Para Recubrimiento Cerámico y Porcelanizado en motos, el precio se cotiza según el tipo y estado de la moto. Usa __ESCALATE__ para coordinar la cotización con Sara.

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

━━━ CITAS ACTIVAS DE ESTE CLIENTE ━━━
${clientAppts.length > 0
  ? clientAppts.map((a, i) =>
      `${i + 1}. ${a.service} · ${a.date}${a.time ? ' · ' + a.time : ''} · Código: ${a.confirmation_code} · Estado: ${a.status}`
    ).join('\n')
  : 'Sin citas activas registradas para este número.'}

━━━ CANCELACIONES ━━━
NUNCA le pidas el código al cliente. Tú ya tienes sus citas activas en la sección de arriba.
Si el cliente quiere cancelar:
1. Si tiene una sola cita activa: "Tienes agendado [servicio] para [fecha]. Quieres cancelarlo?"
   Si tiene varias: lista las opciones y pregunta cuál quiere cancelar.
2. Cuando confirme, añade EXACTAMENTE al final del mensaje (invisible para el cliente):
__CANCEL_CONFIRMED__
CODIGO: [código de la cita activa correspondiente, de la lista de arriba]
NOMBRE: [nombre del cliente si lo conoces, o "no_disponible"]
__END_CANCEL__
3. Dile: "Listo, tu cita queda cancelada. Si en algún momento quieres reagendar, aquí estamos."
Si NO hay citas activas para este número: "No encontré citas activas para tu número. Si crees que es un error, escríbenos directamente al 318 198 3601."
REAGENDAMIENTO: Si quiere mover la cita, cancela la actual usando el flujo de arriba y luego agenda la nueva normalmente.

━━━ MÚLTIPLES SERVICIOS / OTRAS PERSONAS ━━━
Un cliente puede traer el carro para más de un servicio. Agenda el servicio principal (el de mayor valor o duración). Menciona: "Cuando vengas le comentamos al equipo para incluir los dos." Si quiere agendar para otra persona (pareja, familiar), agenda normalmente como nuevo cliente en una conversación nueva o en el mismo chat.

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

// ─── Parsers ───────────────────────────────────────────────────────
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

const parseCancel = (text) => {
  if (!text.includes('__CANCEL_CONFIRMED__')) return null;
  const block = text.match(/__CANCEL_CONFIRMED__([\s\S]*?)__END_CANCEL__/)?.[1] || '';
  if (!block) return null;
  const get = (key) => block.match(new RegExp(`${key}:\\s*(.+)`))?.[1]?.trim() || '';
  return { code: get('CODIGO'), name: get('NOMBRE') };
};

const cleanReply = (text) => text
  .replace(/__BOOKING_CONFIRMED__[\s\S]*?__END_BOOKING__/g, '')
  .replace(/__CANCEL_CONFIRMED__[\s\S]*?__END_CANCEL__/g, '')
  .replace(/__NAME__:[^\n]*/g, '')
  .replace(/__LEAD_TYPE__:[^\n]*/g, '')
  .replace(/__OBJECTION__:[^\n]*/g, '')
  .trim();

// ─── Handler ───────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userMessage, advisorName = 'Sara', history = [], sessionId } = req.body || {};
  if (!userMessage?.trim()) return res.status(400).json({ error: 'Missing userMessage' });

  try {
    const systemPrompt = await buildPrompt(advisorName, sessionId);

    const apiMessages = history
      .slice(-18)
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role,
        content: (typeof m.content === 'string' ? m.content : '')
          .replace(/__BOOKING_CONFIRMED__[\s\S]*?__END_BOOKING__/g, '')
          .replace(/__CANCEL_CONFIRMED__[\s\S]*?__END_CANCEL__/g, '')
          .replace(/__ESCALATE__:[^\n]*/g, '')
          .replace(/__LEAD_TYPE__:[^\n]*/g, '')
          .replace(/__NAME__:[^\n]*/g, '')
          .replace(/__OBJECTION__:[^\n]*/g, '')
          .trim(),
      }))
      .filter(m => m.content.length > 0);

    apiMessages.push({ role: 'user', content: userMessage });

    const aiResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 450,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: apiMessages,
    });

    const rawReply = aiResponse.content[0]?.text || 'Disculpa, algo salió mal. Intenta de nuevo.';

    const nameMatch  = rawReply.match(/__NAME__:([^\n]+)/);
    const leadMatch  = rawReply.match(/__LEAD_TYPE__:([^\n]+)/);
    const escalMatch = rawReply.match(/__ESCALATE__:([^\n]*)/);
    const booking    = parseBooking(rawReply);
    const cancelData = parseCancel(rawReply);

    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

    // ── Guardar cita nueva ──
    if (booking?.service) {
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

      supabaseAdmin.from('appointments').insert({
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
      }).catch(e => console.error('Appt insert:', e.message));

      if (booking.clientName) {
        supabaseAdmin.from('clients').upsert({
          phone: sessionId || 'web_sin_telefono',
          name: booking.clientName,
          last_service: booking.service,
          last_date: new Date().toISOString(),
          updated: new Date().toISOString(),
        }, { onConflict: 'phone' }).catch(() => {});
      }

      // Marcar lead como activo para no enviarle remarketing de no-convertido
      if (sessionId) {
        supabaseAdmin.from('conversations')
          .update({ remarketing_status: 'cliente_activo', updated_at: new Date().toISOString() })
          .eq('phone', sessionId).catch(() => {});
      }

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
        fetch(`${baseUrl}/api/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'email', subject: `Cita confirmada — ${code}`, html: emailHtml, to: booking.clientEmail }),
        }).catch(() => {});
      }

      fetch(`${baseUrl}/api/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'push',
          title: `Nueva cita web — ${booking.clientName}`,
          message: `${booking.service} · ${booking.date} · ${booking.priceDisplay}`,
          priority: 4,
        }),
      }).catch(() => {});
    }

    // ── Procesar cancelación ──
    if (cancelData?.code) {
      supabaseAdmin.from('appointments')
        .update({ status: 'cancelada', updated_at: new Date().toISOString() })
        .ilike('confirmation_code', cancelData.code)
        .catch(e => console.error('Cancel update:', e.message));

      fetch(`${baseUrl}/api/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'push',
          title: `Cita cancelada — ${cancelData.code}`,
          message: `${cancelData.name && cancelData.name !== 'no_disponible' ? cancelData.name : 'Cliente'} canceló su cita`,
          priority: 3,
        }),
      }).catch(() => {});
    }

    // ── Actualizar metadata de conversación ──
    if (sessionId) {
      const meta = {};
      if (nameMatch) meta.client_name = nameMatch[1].trim();
      if (leadMatch) meta.lead_type = leadMatch[1].trim();
      if (escalMatch) meta.bot_paused = true;
      if (Object.keys(meta).length > 0) {
        supabase.from('conversations')
          .update({ ...meta, updated_at: new Date().toISOString() })
          .eq('phone', sessionId).catch(() => {});
      }
    }

    const finalReply = cleanReply(rawReply) + (escalMatch ? `\n__ESCALATE__:${escalMatch[1].trim()}` : '');
    return res.status(200).json({ reply: finalReply });

  } catch (err) {
    console.error('[api/chat] Error:', err.message);
    return res.status(500).json({ reply: 'Uy, tuve un problemita de conexión. Intenta de nuevo 😊' });
  }
}
