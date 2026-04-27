// ═══════════════════════════════════════════════════════════════════
// ESTETICAR — LOCAL DB + AI ENGINE v8.0
// Tono elegante · Disponibilidad real por franjas · Memoria cliente
// Google Sheets sync · ntfy · Resend · Recordatorio 20d
// ═══════════════════════════════════════════════════════════════════

const DB_KEY = 'esteticar_db_v7';

const DEFAULT_DB = () => ({
  appointments: [],
  clients: [],
  messages: [],
  botConfig: { key: "default" },
});

const getDB = () => {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return DEFAULT_DB();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.appointments)) return DEFAULT_DB();
    if (!Array.isArray(parsed.messages)) parsed.messages = [];
    if (!Array.isArray(parsed.clients)) parsed.clients = [];
    return parsed;
  } catch { return DEFAULT_DB(); }
};

const saveDB = (db) => {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { }
};

// ═══════════════════════════════════════════════════════════════════
// DB LOCAL
// ═══════════════════════════════════════════════════════════════════
export const db = {
  appointments: {
    list: async () => {
      try { return getDB().appointments.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)); }
      catch { return []; }
    },
    create: async (data) => {
      try {
        const database = getDB();
        const appt = { ...data, id: Math.random().toString(36).substr(2, 9), created_date: new Date().toISOString() };
        database.appointments.push(appt);
        saveDB(database);
        return appt;
      } catch { return null; }
    },
    update: async (id, data) => {
      try {
        const database = getDB();
        database.appointments = database.appointments.map(a => a.id === id ? { ...a, ...data } : a);
        saveDB(database);
        return true;
      } catch { return false; }
    },
    filter: async (criteria) => {
      try {
        return getDB().appointments.filter(a => {
          if (criteria.date?.$gte && (a.date < criteria.date.$gte || a.date > criteria.date.$lte)) return false;
          return true;
        });
      } catch { return []; }
    },
  },

  clients: {
    upsert: async ({ name, phone, service, date }) => {
      try {
        const database = getDB();
        const idx = database.clients.findIndex(c => c.phone === phone);
        const record = {
          name, phone,
          lastService: service,
          lastDate: date,
          reminded20d: false,
          updated: new Date().toISOString(),
        };
        if (idx >= 0) database.clients[idx] = { ...database.clients[idx], ...record };
        else database.clients.push(record);
        saveDB(database);
        return record;
      } catch { return null; }
    },
    findByName: async (name) => {
      try {
        if (!name) return null;
        const norm = (s) => s?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const clients = getDB().clients;
        return clients.find(c => norm(c.name)?.includes(norm(name))) || null;
      } catch { return null; }
    },
    list: async () => { try { return getDB().clients; } catch { return []; } },
    markReminded: async (phone) => {
      try {
        const database = getDB();
        database.clients = database.clients.map(c =>
          c.phone === phone ? { ...c, reminded20d: true } : c
        );
        saveDB(database);
      } catch { }
    },
  },

  botConfig: {
    get: async () => { try { return getDB().botConfig; } catch { return {}; } },
    update: async (data) => {
      try {
        const database = getDB();
        database.botConfig = { ...database.botConfig, ...data };
        saveDB(database);
        return database.botConfig;
      } catch { return {}; }
    },
  },

  agents: {
    addMessage: async (role, content) => {
      try {
        const database = getDB();
        const msg = { role, content, timestamp: new Date().toISOString() };
        database.messages.push(msg);
        if (database.messages.length > 40) database.messages = database.messages.slice(-40);
        saveDB(database);
        return msg;
      } catch { return null; }
    },
    getMessages: async () => { try { return getDB().messages; } catch { return []; } },
    clearMessages: async () => {
      try { const d = getDB(); d.messages = []; saveDB(d); } catch { }
    },
  },
};

// ═══════════════════════════════════════════════════════════════════
// GOOGLE SHEETS SYNC
// ═══════════════════════════════════════════════════════════════════
export const sheets = {
  pushAppointment: async (appt) => {
    try {
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'appointment', ...appt }),
      });
    } catch { }
  },
  pushClient: async (client) => {
    try {
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'client', ...client }),
      });
    } catch { }
  },
  getOccupiedDates: async () => {
    try {
      const res = await fetch('/api/sheets');
      const data = await res.json();
      return data.dates || [];
    } catch { return []; }
  },
};

// ═══════════════════════════════════════════════════════════════════
// NOTIFICACIONES
// ═══════════════════════════════════════════════════════════════════
export const notifyEmail = async ({ subject, html }) => {
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'email', subject, html }),
    });
  } catch { }
};

export const notifyPush = async ({ title, message, priority = 3 }) => {
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'push', title, message, priority }),
    });
  } catch { }
};

export const notifyNewBooking = async ({ clientName, clientPhone, service, date, price, code, advisorName }) => {
  const subject = `🚗 Nueva cita — ${clientName} · ${service}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden">
      <div style="background:#000;padding:20px 24px;text-align:center">
  <img src="https://esteticar-vff.vercel.app/logo.png" alt="Esteticar" style="height:60px;object-fit:contain;" />
  <div style="color:#F8C840;opacity:0.6;font-size:11px;letter-spacing:2px;margin-top:8px">CUSTODIA VEHICULAR PREMIUM</div>
</div>
      <div style="padding:28px 24px;background:#fafafa">
        <h2 style="color:#111;margin:0 0 20px 0;font-size:18px">Nueva cita agendada ✅</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#888;width:140px">Cliente</td><td style="padding:10px 0;font-weight:600">${clientName}</td></tr>
          <tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#888">Teléfono</td><td style="padding:10px 0;font-weight:600">${clientPhone || "No capturado"}</td></tr>
          <tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#888">Servicio</td><td style="padding:10px 0;font-weight:600">${service}</td></tr>
          <tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#888">Fecha</td><td style="padding:10px 0;font-weight:600">${date}</td></tr>
          <tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#888">Precio</td><td style="padding:10px 0;font-weight:700;color:#B4821E">${price}</td></tr>
          <tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#888">Traslado</td><td style="padding:10px 0;font-weight:600">${traslado || "Cliente trae y recoge (gratis)"}</td></tr>
<tr><td style="padding:10px 0;color:#888">Código</td><td style="padding:10px 0;font-family:monospace;font-size:16px;font-weight:700;color:#000">${code}</td></tr>
        </table>
        <div style="margin-top:20px;padding:14px 16px;background:#FFF8E7;border-left:3px solid #F8C840;border-radius:4px;font-size:13px;color:#555">
          Agendado por asesora: <strong>${advisorName}</strong>
        </div>
      </div>
      <div style="padding:14px;background:#111;text-align:center">
        <span style="color:#555;font-size:11px">Esteticar · Cll 67 #9-26, La Sultana, Manizales</span>
      </div>
    </div>
  `;
  await Promise.allSettled([
    notifyEmail({ subject, html }),
    notifyPush({
      title: `🚗 Nueva cita — ${clientName}`,
      message: `${service} · ${date} · ${price}\nTel: ${clientPhone || "N/A"}`,
      priority: 4,
    }),
  ]);
};

// ═══════════════════════════════════════════════════════════════════
// RECORDATORIO 20 DÍAS
// ═══════════════════════════════════════════════════════════════════
export const check20DayReminders = async () => {
  try {
    const clients = await db.clients.list();
    const now = new Date();
    for (const client of clients) {
      if (client.reminded20d) continue;
      if (!client.lastDate) continue;
      const lastDate = new Date(client.lastDate);
      const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
      if (diffDays >= 20) {
        const subject = `⏰ Recordatorio 20 días — ${client.name} (${diffDays}d)`;
        const whatsappMsg = encodeURIComponent(
          `${getGreeting()}, ${client.name}. Te saluda Esteticar. Han pasado unos días desde que atendimos tu vehículo. Cuando quieras renovar el tratamiento, aquí estamos.`
        );
        const whatsappUrl = `https://wa.me/57${(client.phone || '').replace(/\D/g, '')}?text=${whatsappMsg}`;
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden">
            <div style="background:#000;padding:20px 24px;text-align:center">
              <span style="color:#F8C840;font-size:20px;font-weight:bold;letter-spacing:4px">ESTETICAR</span>
            </div>
            <div style="padding:28px 24px;background:#fafafa">
              <h2 style="color:#111;margin:0 0 8px 0;font-size:18px">⏰ Recordatorio de seguimiento</h2>
              <p style="color:#555;font-size:14px;margin:0 0 20px 0">Han pasado <strong style="color:#B4821E">${diffDays} días</strong> desde el último servicio.</p>
              <table style="width:100%;border-collapse:collapse;font-size:14px">
                <tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#888;width:160px">Cliente</td><td style="padding:10px 0;font-weight:600">${client.name}</td></tr>
                <tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#888">Teléfono</td><td style="padding:10px 0;font-weight:600">${client.phone}</td></tr>
                <tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#888">Último servicio</td><td style="padding:10px 0">${client.lastService}</td></tr>
                <tr><td style="padding:10px 0;color:#888">Días sin visitar</td><td style="padding:10px 0;font-weight:700;color:#B4821E">${diffDays} días</td></tr>
              </table>
              <a href="${whatsappUrl}" style="display:inline-flex;align-items:center;gap:8px;margin-top:20px;background:#25D366;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px">
                Escribirle por WhatsApp →
              </a>
            </div>
          </div>
        `;
        await Promise.allSettled([
          notifyEmail({ subject, html }),
          notifyPush({
            title: `⏰ ${diffDays}d sin visita — ${client.name}`,
            message: `${client.phone} · Último: ${client.lastService}`,
            priority: 3,
          }),
        ]);
        await db.clients.markReminded(client.phone);
      }
    }
  } catch { }
};

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════
const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRST";
  return `EST-${chars[Math.floor(Math.random() * chars.length)]}${Math.floor(Math.random() * 9000) + 1000}`;
};

export const getGreeting = () => {
  const hour = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" })).getHours();
  if (hour >= 5 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 19) return "Buenas tardes";
  return "Buenas noches";
};

// Duración de cada servicio en horas
const SERVICE_DURATION_HOURS = {
  "Lavada Esencial": 2,
  "Lavado de Techo": 2,
  "Lavado de Chasis": 2,
  "Brillado Farolas": 1,
  "Brillado de Farolas": 1,
  "Descontaminacion de Tuberia": 2,
  "Descontaminación de Tubería": 2,
  "Brillado de Tanque": 2,
  "Descontaminacion de Vidrios": 2,
  "Descontaminación de Vidrios": 2,
  "Brillado a Maquina": 3,
  "Brillado a Máquina": 3,
  "Restauracion de Farolas": 3,
  "Restauración de Farolas": 3,
  "Lavado de Cojineria": 8,
  "Lavado de Cojinería": 8,
  "Mantenimiento Interior": 16,
  "Tratamiento 3 en 1 Manual": 5,
  "Tratamiento 3 en 1 a Maquina": 6,
  "Tratamiento 3 en 1 a Máquina": 6,
};

const getServiceDuration = (serviceName) => {
  if (!serviceName) return 2;
  const key = Object.keys(SERVICE_DURATION_HOURS).find(k =>
    serviceName.toLowerCase().includes(k.toLowerCase())
  );
  return key ? SERVICE_DURATION_HOURS[key] : 2;
};

const extractHourFromDate = (dateStr) => {
  if (!dateStr) return null;
  const match = dateStr.match(/(\d{1,2}):(\d{2})/);
  if (match) return parseInt(match[1]);
  if (dateStr.includes('8') && dateStr.includes('am')) return 8;
  if (dateStr.includes('9') && dateStr.includes('am')) return 9;
  return null;
};

// Calcula disponibilidad REAL por franja horaria
// Lógica: máximo 3 vehículos trabajando SIMULTÁNEAMENTE
// Un vehículo ocupa un "slot" desde su hora de entrada hasta su hora de salida
const getAvailableSlots = () => {
  const appointments = getDB().appointments.filter(a =>
    a.status !== 'cancelada' && a.status !== 'cancelled'
  );
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
  const slots = [];

  for (let d = 1; d <= 7; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    const dow = date.getDay(); // 0=dom
    if (dow === 0) continue; // domingo cerrado

    const isSaturday = dow === 6;
    const dayStart = 8;
    const dayEnd = isSaturday ? 14 : 17;

    const dateStr = date.toLocaleDateString('es-CO', {
      timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long',
    });
    const dayName = dateStr.split(',')[0].toLowerCase();

    // Citas de ese día
    const dayAppts = appointments.filter(a =>
      a.date && a.date.toLowerCase().includes(dayName)
    );

    // Para cada franja de entrada posible (cada hora), verificar cuántos
    // vehículos estarían trabajando simultáneamente
    const availableMorning = []; // horas disponibles en la mañana
    const availableAfternoon = []; // horas disponibles en la tarde

    for (let hour = dayStart; hour < dayEnd; hour++) {
      // Contar cuántos vehículos estarán trabajando en esta hora
      let concurrent = 0;
      for (const appt of dayAppts) {
        const startHour = extractHourFromDate(appt.date) || extractHourFromDate(appt.time);
        if (startHour === null) continue;
        const duration = getServiceDuration(appt.service);
        const endHour = startHour + duration;
        // ¿Este vehículo está siendo trabajado en la hora `hour`?
        if (hour >= startHour && hour < endHour) {
          concurrent++;
        }
      }
      if (concurrent < 3) {
        if (hour < 12) availableMorning.push(hour);
        else availableAfternoon.push(hour);
      }
    }

    if (availableMorning.length > 0 || availableAfternoon.length > 0) {
      const firstMorning = availableMorning[0];
      const firstAfternoon = availableAfternoon[0];
      slots.push({
        date: dateStr,
        morning: availableMorning.length > 0,
        afternoon: availableAfternoon.length > 0,
        firstMorningHour: firstMorning ? `${firstMorning}:00 a.m.` : null,
        firstAfternoonHour: firstAfternoon ? `${firstAfternoon}:00 p.m.` : null,
      });
    }
  }
  return slots;
};

export const generateEscalationURL = (userQuestion) => {
  const g = getGreeting().toLowerCase();
  const msg = encodeURIComponent(
    `Hola Sara, ${g}. Un cliente nos está preguntando: "${userQuestion}". Te lo paso para que lo puedas atender.`
  );
  return `https://wa.me/573181983601?text=${msg}`;
};

// ─── Estado de conversación ───────────────────────────────────────
let conversationState = {
  stage: 'greeting',
  clientName: null,
  clientPhone: null,
  clientEmail: null,
  vehicleType: null,
  lastService: null,
  isReturningClient: false,
  turnCount: 0,
  occupiedDates: [],
};

export const resetConversationState = () => {
  conversationState = {
    stage: 'greeting', clientName: null, clientPhone: null,
    clientEmail: null, vehicleType: null, lastService: null,
    isReturningClient: false, turnCount: 0, occupiedDates: [],
  };
};

// ═══════════════════════════════════════════════════════════════════
// SYSTEM PROMPT v8 — Tono elegante, clase alta, sin informalidades
// ═══════════════════════════════════════════════════════════════════
const buildSystemPrompt = (advisorName) => {
  const greeting = getGreeting();
  const today = new Date().toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long',
  });
  const todayDate = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
  const tomorrow = new Date(todayDate); tomorrow.setDate(todayDate.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long' });
  const dayAfter = new Date(todayDate); dayAfter.setDate(todayDate.getDate() + 2);
  const dayAfterStr = dayAfter.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long' });

  const slots = getAvailableSlots();
  const availabilityText = slots.length > 0
    ? slots.slice(0, 4).map(s => {
      const parts = [];
      if (s.morning && s.firstMorningHour) parts.push(`mañana desde las ${s.firstMorningHour}`);
      if (s.afternoon && s.firstAfternoonHour) parts.push(`tarde desde las ${s.firstAfternoonHour}`);
      return `${s.date}: ${parts.join(' o ')}`;
    }).join(' | ')
    : 'agenda completa esta semana';

  const clientContext = conversationState.clientName
    ? `CLIENTE CONOCIDO: ${conversationState.clientName}${conversationState.lastService ? ` · Último servicio: ${conversationState.lastService}` : ''}${conversationState.isReturningClient ? ' · CLIENTE RECURRENTE' : ''}`
    : 'CLIENTE NUEVO';

  return `Eres ${advisorName}, asesora de Esteticar Manizales. Eres una persona REAL. Si preguntan si eres IA: "Soy muy real, te lo aseguro. Cuéntame mejor qué tiene tu vehículo."

HOY: ${today}. SALUDO ACTIVO: "${greeting}".
MAÑANA: ${tomorrowStr}. PASADO: ${dayAfterStr}.
DISPONIBILIDAD REAL (3 vehículos simultáneos, calculado por duración de servicio): ${availabilityText}
${clientContext}

━━━ REGLAS ABSOLUTAS — LEER ANTES DE RESPONDER ━━━

PROHIBIDO — SARA ES MUJER: Nunca digas "mi gerente", "el gerente", "él". Siempre "Sara, la administradora" o "ella".
PROHIBIDO — NO SUMES PRECIOS: Si mencionas varios servicios, menciona cada precio por separado. Nunca sumes.
PROHIBIDO — EL VEHÍCULO NO ES LA PERSONA: Nunca "te deja impecable" o "te queda perfecto". Es el carro o la moto el que queda bien. Di "el carro queda impecable" o "la moto queda como nueva".
PROHIBIDO — GUIONES: Nunca uses guiones (— ni -) para unir ideas. Usa "y", "además", "pero", "aunque".
PROHIBIDO — INICIO ROBÓTICO: Nunca empieces un mensaje con "Claro!", "Por supuesto!", "Con gusto!", "Con mucho gusto" como primera palabra. Úsalas dentro de la conversación cuando sea natural, pero no como apertura de cada respuesta porque suena a call center.
PROHIBIDO — EXPRESIONES EXTRANJERAS: Nunca digas "Bien por aquí". Cuando te pregunten cómo estás, responde como colombiano: "Todo bien, gracias a Dios, ¿y tú?", "Muy bien, ¿y tú?", "Excelente, gracias a Dios".
REGLA DE REINICIO: Si el cliente saluda de nuevo tras una conversación previa, trátalo fresco. No retomes el hilo anterior.
REGLA DE UNA PREGUNTA: Nunca hagas más de una pregunta por mensaje.
PROHIBIDO — "TE VIENE MEJOR": Nunca digas "qué día te viene mejor". Siempre di "qué día te queda mejor" o "qué día te queda más fácil".
PROHIBIDO — CONJUGACIÓN INCORRECTA: Nunca digas "antes de que nos vemos". Siempre di "antes de que nos veamos".

━━━ QUIÉN ERES ━━━
Consultora de detailing premium. Colombiana, de Manizales, con criterio y clase. Conoces el oficio a profundidad. Tu lenguaje es cálido pero distinguido, nunca vulgar ni excesivamente informal. Hablas en tuteo (tú, te, tu) pero con elegancia. No eres una vendedora de call center ni una amiga del barrio. Eres una profesional que trata a sus clientes como personas que valoran lo mejor.

Así hablas:
✅ "Mira, te cuento algo que marca la diferencia..."
✅ "Basado en lo que me describes, te recomendaría..."
✅ "La mayoría de nuestros clientes con vehículos similares optan por..."
✅ "Entiendo perfectamente. Muchos piensan lo mismo al principio."
✅ "Si quieres que te lo detalle mejor, con gusto."
✅ "¿Te queda mejor en la mañana o en la tarde?"

NUNCA uses:
❌ "Uy sí", "Chévere", "Bacano", "Qué bueno", "De una", "Perfecto papi"
❌ Signos de exclamación excesivos
❌ Más de 2 emojis por mensaje

━━━ DISPONIBILIDAD — LÓGICA DE 3 SIMULTÁNEOS ━━━
Trabajamos con máximo 3 vehículos al mismo tiempo. La disponibilidad depende de cuántos carros están siendo atendidos en cada franja, considerando la duración de cada servicio. Si a las 9am entra un Tratamiento 3en1 (6h), ese cupo está ocupado hasta las 3pm.
Franjas disponibles esta semana: ${availabilityText}
Si no hay disponibilidad en el horario que pide: "Ese espacio ya lo tenemos completo. Tengo disponibilidad [siguiente franja disponible]. ¿Qué te parece?"

━━━ HORARIOS ━━━
Lunes a viernes: 8:00 a.m. a 5:00 p.m.
Sábados: 8:00 a.m. a 2:00 p.m.
Domingos: cerrado. Si piden domingo: "Los domingos no trabajamos, pero el lunes abrimos a las 8. ¿Te funciona?"

━━━ ESTRATEGIA HIGH-TICKET ━━━
Primero identifica si es carro o moto. Si dice carro, pregunta también si es automóvil o camioneta — el Tratamiento 3 en 1 tiene un incremento de $10.000 en camionetas.

SI ES CARRO O MOTO — ofrece de mayor a menor según aplique:
1. Tratamiento 3 en 1 con brillada a máquina $350.000 (camioneta $360.000) — carro y moto
2. Tratamiento 3 en 1 con brillada a mano $290.000 (camioneta $300.000) — carro y moto
3. Mantenimiento del Interior $280.000 — SOLO CARRO
4. Lavado de Cojinería $199.000 — SOLO CARRO
5. Restauración de Farolas $180.000 — SOLO CARRO
6. Brillado a Máquina $100.000 — carro y moto
7. Brillado de Tanque $59.000 — SOLO MOTO
8. Lavado de Chasis $59.000 — SOLO CARRO
9. Lavado de Techo y Parasoles $49.000 — SOLO CARRO
10. Descontaminación de Tubería $49.000 — SOLO MOTO
11. Brillado de Farolas $49.000 — SOLO MOTO
12. Lavada Esencial Carro $49.000 — SOLO CARRO (último recurso)
13. Lavada Esencial Moto $49.000 — SOLO MOTO (último recurso)

REGLA: Nunca ofrezcas servicios de carro a quien tiene moto, ni viceversa.
REGLA: Si el cliente dice que tiene carro, pregunta si es automóvil o camioneta antes de cotizar el Tratamiento 3 en 1.

━━━ PROCESO DE VENTA ━━━
PASO 1 DESCUBRIR — Con calma, sin presionar:
Cuando el cliente saluda, responde el saludo con calidez y haz UNA sola pregunta abierta: "¿En qué te puedo ayudar?" Nada más. Deja que el cliente lleve la conversación. A medida que responde, vas indagando naturalmente, una pregunta a la vez. Si el cliente no sabe qué quiere después de varios mensajes, ahí sí le ofreces orientación o el portafolio. Nunca en el primer mensaje. Nunca des tres opciones de entrada.

PASO 2 ENSEÑAR — Un insight antes de recomendar:
"Algo que mucha gente no sabe es que los micro-rayones que apenas se ven ahora, en pocos meses se vuelven muy evidentes. El tratamiento 3 en 1 los elimina y protege la pintura para que no vuelvan."

PASO 3 RECOMENDAR — Una sola opción, justificada:
"Basado en lo que me cuentas, te recomendaría el Tratamiento 3 en 1 a Máquina. Es nuestro servicio estrella y deja el vehículo como si saliera de concesionario. ¿Te cuento qué incluye?"

PASO 4 CERRAR — Siempre con opciones concretas:
"¿Te queda mejor mañana en la mañana o en la tarde?"
"¿Arrancamos esta semana o prefieres la siguiente?"
NUNCA preguntes "¿quieres reservar?" de forma abierta.

━━━ OBJECIONES ━━━
"Está muy caro": "Entiendo. ¿Qué precio tenías en mente?" → "Lo que sí te puedo decir es que tu vehículo queda cubierto con una póliza de $5.000.000 mientras está con nosotros, y el resultado es completamente diferente a lo que consigues en cualquier otro lugar."
"Lo pienso": "Con toda. ¿Qué sería lo que necesitarías ver para decidirte?" → "Esta semana tenemos poco espacio, no quiero que se te vaya el tuyo."
"Lo hago yo mismo": "Totalmente válido. Lo que sí te digo es que los productos que usamos no están en el mercado normal. La diferencia en el resultado es notoria."

━━━ UPSELL (solo después de que acepte el servicio base) ━━━
"Ya que vas a traer el vehículo, ¿cómo tienes el interior? Muchos lo combinan para salir con todo listo de una vez."
"¿Las farolas cómo las tienes? Si están opacas, la restauración transforma completamente la apariencia y también mejora la seguridad."

━━━ PORTAFOLIO ━━━
Si el cliente pide fotos, trabajos o referencias → compartir en ese mismo mensaje:
"Aquí está nuestro portafolio con trabajos reales → https://heyzine.com/flip-book/7591b1d346.html#page/1"
Si llevan varios mensajes sin decidirse → compartirlo proactivamente.

━━━ MEMORIA DE CLIENTE ━━━
Si es CLIENTE CONOCIDO: salúdalo por nombre, menciona el último servicio, recomienda el paso lógico siguiente.

━━━ CAPTURA OBLIGATORIA ANTES DE CONFIRMAR CITA ━━━
SIEMPRE antes de confirmar, debes tener estos 4 datos. Pídelos uno a la vez de forma natural:
1. Nombre completo
2. Número de cédula
3. Placa del vehículo
4. Correo electrónico

Si no tienes alguno, pídelo antes de confirmar. Sin estos 4 datos NO puedes confirmar la cita.

━━━ TRASLADO — PREGUNTAR SIEMPRE ANTES DE CONFIRMAR ━━━
Antes de confirmar la cita, menciona el servicio de traslado de forma natural y premium:
"Por cierto, contamos con un servicio de traslado para que no tengas que preocuparte por nada. Si quieres, podemos recogerte el vehículo en tu casa y devolvértelo cuando esté listo, tiene un valor adicional de $9.000. Si prefieres solo la recogida o solo la entrega, también lo hacemos por $7.000 cada una. ¿Te interesa alguna de estas opciones o prefieres traerlo tú mismo?"
NUNCA digas "cómo vas a manejar el vehículo".
REGLA DE RECOGIDA: Si el cliente elige recogida o recogida y entrega, infórmale que pasaremos por su vehículo 30 minutos ANTES de la hora de la cita. Si la cita es a las 8:00 a.m., la recogida es a las 7:30 a.m. Siempre menciona esto antes de confirmar.

━━━ CATÁLOGO OFICIAL — SOLO ESTOS SERVICIOS EXISTEN ━━━
PROHIBIDO inventar servicios, nombres o precios que no estén en esta lista.

CARROS:
- **Tratamiento 3 en 1 con brillada a máquina** $350.000 · 1 día · lavada esencial + descontaminación + desmanchado + brillado a máquina. Camionetas: $360.000
- **Tratamiento 3 en 1 con brillada a mano** $290.000 · 1 día · lavada esencial + descontaminación + desmanchado + brillado manual. Camionetas: $300.000
- **Mantenimiento del Interior** $280.000 · 2 días · lavada esencial + desmonte y lavada de sillas + lavada de techo + limpieza y aspirada de carteras
- **Lavado de Cojinería** $199.000 · 2 horas · lavado profundo con máquina de inyección-succión en todos los asientos
- **Restauración de Farolas** $180.000 · 2 horas · eliminación de opacidad y amarillamiento, restaura transparencia y protege el resultado
- **Brillado a Máquina** $100.000 · 2 horas · realza el brillo y mejora la apariencia de la pintura con acabado uniforme
- **Descontaminación de Vidrios (todos)** $250.000 · 2 horas · elimina sarro y contaminantes, restaura claridad real
- **Descontaminación de Vidrios (solo parabrisas)** $60.000 · 2 horas
- **Lavado de Chasis** $59.000 · 2 horas · lavado a presión con agentes anticorrosivos en la parte inferior
- **Lavado de Techo y Parasoles** $49.000 · 2 horas · limpieza en seco de tapicería superior, elimina olor y manchas
- **Lavada Esencial Carro** $49.000 · 2 horas · lavado de lámina externa, rines y llantas + limpieza de carteras y sillas + aspirada e hidratación de partes negras externas

MOTOS:
- **Brillado de Tanque** $59.000 · 1 hora · brillado a máquina del tanque
- **Lavada Esencial Moto** $49.000 · 2 horas · lavado general + desengrasado de kit de arrastre, cadena, guardacadena, rin trasero y motor + hidratación de partes negras y cera en partes brillantes
- **Brillado de Farolas (moto)** $49.000 · 1 hora · mejora apariencia y transparencia de los faros
- **Descontaminación de Tubería** $49.000 · 1 hora · elimina suciedad y residuos adheridos a la tubería

━━━ DIFERENCIADORES ━━━
• Póliza de $5.000.000 COP activa mientras el vehículo está con nosotros.
• Registro fotográfico 360° y código QR único por vehículo.
• Cámaras HD 24/7, el cliente puede ver en tiempo real lo que le estamos haciendo.
• Salón VIP: café de especialidad, Smart TV 65" con Netflix, WiFi 300Mbps.
• Certificado digital de garantía al momento de la entrega.

━━━ FECHAS — HABLAR NATURAL ━━━
Usa: "mañana", "pasado mañana", "el viernes", "esta semana". NUNCA fechas numéricas en plena conversación.
Solo en la confirmación final incluye la fecha exacta:
"Listo, quedamos para mañana, ${tomorrowStr}, a las 9:00 a.m. Tu código es **EST-XXXX**."

━━━ MENSAJE DE CONFIRMACIÓN VISIBLE AL CLIENTE ━━━
Cuando confirmes la cita, el mensaje que ve el cliente debe incluir el desglose así:
"Listo, tu cita quedó confirmada. Te resumo todo:
Servicio: [nombre] $[precio]
Traslado: [opción y valor, o gratis si trae y recoge]
[Si hay recogida: pasamos por tu vehículo a las [hora de cita menos 30 min]]
Tu código es **[código]**. Te esperamos."

━━━ AL CONFIRMAR CITA (añadir al final, invisible para el cliente) ━━━
__BOOKING_CONFIRMED__
SERVICIO: [nombre exacto]
PRECIO: [con $ y puntos]
FECHA: [fecha completa con hora]
VEHICULO: [Carro o Moto]
NOMBRE: [nombre completo]
TELEFONO: [teléfono]
EMAIL: [correo o "no_proporcionado"]
TRASLADO: [opción elegida]
CEDULA: [número de cédula]
PLACA: [placa del vehículo]
__END_BOOKING__

━━━ ESCALACIÓN ━━━
Si no puedes resolver algo: "Espera que te paso con Sara, la administradora, ella te puede ayudar con eso."
__ESCALATE__:[pregunta máximo 12 palabras]

━━━ FORMATO ━━━
Máximo 3-4 líneas por mensaje. Tono de chat, directo.
**Negrita** solo para servicios y precios.
Emojis: máximo 1-2 por mensaje, nunca al inicio.
Cada mensaje cierra con pregunta o acción concreta.`;
};

// ═══════════════════════════════════════════════════════════════════
// AI ENGINE v8
// ═══════════════════════════════════════════════════════════════════
export const ai = {
  invoke: async (userMessage, advisorName = "Sofia") => {
    conversationState.turnCount++;

    if (conversationState.turnCount <= 2 && !conversationState.clientName) {
      const words = userMessage.split(/\s+/).filter(w => w.length > 3);
      for (const word of words) {
        const found = await db.clients.findByName(word);
        if (found) {
          conversationState.clientName = found.name;
          conversationState.clientPhone = found.phone;
          conversationState.lastService = found.lastService;
          conversationState.isReturningClient = true;
          break;
        }
      }
    }

    if (conversationState.occupiedDates.length === 0 && conversationState.turnCount === 1) {
      conversationState.occupiedDates = await sheets.getOccupiedDates().catch(() => []);
    }

    let history = [];
    try { history = await db.agents.getMessages(); } catch { history = []; }

    const apiMessages = history
      .slice(-18)
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role,
        content: typeof m.content === 'string'
          ? m.content
            .replace(/__BOOKING_CONFIRMED__[\s\S]*?__END_BOOKING__/g, '')
            .replace(/__ESCALATE__:[^\n]*/g, '')
            .trim()
          : '',
      }))
      .filter(m => m.content.length > 0);

    apiMessages.push({ role: 'user', content: userMessage });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
        "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: buildSystemPrompt(advisorName),
        messages: apiMessages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Esteticar AI v8] API error:', response.status, errText);
      throw new Error(`API error ${response.status}`);
    }

    const data = await response.json();
    const rawResponse = data.content?.[0]?.text || '';

    const baseDelay = 3000;
    const extraDelay = Math.min(rawResponse.replace(/__BOOKING_CONFIRMED__[\s\S]*?__END_BOOKING__/, '').length * 10, 2000);
    const randomDelay = Math.floor(Math.random() * 1000);
    await new Promise(r => setTimeout(r, baseDelay + extraDelay + randomDelay));

    const bookingMatch = rawResponse.match(/__BOOKING_CONFIRMED__([\s\S]*?)__END_BOOKING__/);
    if (bookingMatch) {
      const block = bookingMatch[1];
      const extract = (key) => {
        const m = block.match(new RegExp(`${key}:\\s*(.+)`));
        return m ? m[1].trim() : null;
      };

      const code = generateCode();
      const clientName = extract('NOMBRE');
      const clientPhone = extract('TELEFONO');
      const clientEmail = extract('EMAIL');
      const service = extract('SERVICIO');
      const date = extract('FECHA');
      const price = extract('PRECIO');
      const vehicleType = extract('VEHICULO');
      const traslado = extract('TRASLADO');

      conversationState.stage = 'confirmed';
      conversationState.clientName = clientName;
      conversationState.clientPhone = clientPhone;
      conversationState.clientEmail = clientEmail;

      const cedula = extract('CEDULA');
      const placa = extract('PLACA');

      const appt = {
        id: Math.random().toString(36).substr(2, 9),
        service, vehicleType, date, priceDisplay: price,
        confirmationCode: code, clientName, clientPhone,
        clientEmail: clientEmail !== 'no_proporcionado' ? clientEmail : null,
        traslado, cedula, placa, status: 'pending', channel: 'chat',
        created_date: new Date().toISOString(),
      };
      const database = getDB();
      database.appointments.push(appt);
      saveDB(database);

      const clientRecord = { name: clientName, phone: clientPhone, service, date };
      await db.clients.upsert(clientRecord);

      await Promise.allSettled([
        sheets.pushAppointment(appt),
        sheets.pushClient(clientRecord),
        notifyNewBooking({ clientName, clientPhone, service, date, price, code, advisorName }),
      ]);

      if (clientEmail && clientEmail !== 'no_proporcionado' && clientEmail.includes('@')) {
        const clientHtml = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden">
      <div style="background:#000;padding:20px 24px;text-align:center">
        <img src="https://esteticar-vff.vercel.app/logo.png" alt="Esteticar" style="height:60px;object-fit:contain;" />
        <div style="color:#F8C840;opacity:0.6;font-size:11px;letter-spacing:2px;margin-top:8px">CUSTODIA VEHICULAR PREMIUM</div>
      </div>
      <div style="padding:28px 24px;background:#fafafa">
        <h2 style="color:#111;margin:0 0 8px 0;font-size:18px">Tu cita está confirmada ✅</h2>
        <p style="color:#555;font-size:14px;margin:0 0 20px 0">Hola ${clientName}, aquí está el resumen de tu cita en Esteticar.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#888;width:140px">Servicio</td><td style="padding:10px 0;font-weight:600">${service}</td></tr>
          <tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#888">Fecha</td><td style="padding:10px 0;font-weight:600">${date}</td></tr>
          <tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#888">Precio</td><td style="padding:10px 0;font-weight:700;color:#B4821E">${price}</td></tr>
          <tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#888">Traslado</td><td style="padding:10px 0">${traslado || 'Cliente trae y recoge (gratis)'}</td></tr>
          <tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#888">Placa</td><td style="padding:10px 0">${placa || 'No registrada'}</td></tr>
          <tr><td style="padding:10px 0;color:#888">Código</td><td style="padding:10px 0;font-family:monospace;font-size:16px;font-weight:700;color:#000">${code}</td></tr>
        </table>
        <div style="margin-top:20px;padding:14px 16px;background:#FFF8E7;border-left:3px solid #F8C840;border-radius:4px;font-size:13px;color:#555">
          Dirección: Cll 67 #9-26, Barrio La Sultana, Manizales<br/>WhatsApp: 318 198 3601
        </div>
      </div>
      <div style="padding:14px;background:#111;text-align:center">
        <span style="color:#555;font-size:11px">Esteticar · Manizales, Colombia</span>
      </div>
    </div>
  `;
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'email', subject: `Tu cita en Esteticar — ${code}`, html: clientHtml, to: clientEmail }),
        }).catch(() => { });
      }

      const cleanResponse = rawResponse.replace(/__BOOKING_CONFIRMED__[\s\S]*?__END_BOOKING__/, '').trim();
      return cleanResponse || `Listo ${clientName}, tu cita quedó registrada. Código: **${code}**. Te esperamos.`;
    }

    const escalateMatch = rawResponse.match(/__ESCALATE__:(.+)/);
    if (escalateMatch) {
      return `${rawResponse.replace(/__ESCALATE__:.+/, '').trim()}\n__ESCALATE__:${escalateMatch[1].trim()}`;
    }

    return rawResponse;
  },
};

// ─── EmailJS ───────────────────────────────────────────────────────
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE || "service_XXXXXXX";
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE || "template_XXXXXXX";
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_KEY || "XXXXXXXXXXXXXXX";

export const sendConfirmationEmail = async ({ toEmail, serviceName, price, date, code, advisorName }) => {
  try {
    if (!window.emailjs) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
        script.onload = resolve; script.onerror = reject;
        document.head.appendChild(script);
      });
      window.emailjs.init(EMAILJS_PUBLIC_KEY);
    }
    await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: toEmail, service_name: serviceName, price, date, code,
      advisor_name: advisorName, company_name: "Esteticar",
      company_address: "Cll 67 #9-26, Barrio La Sultana, Manizales",
    });
    return true;
  } catch { return false; }
};

export const email = {
  send: async ({ to, subject, body }) => {
    console.log(`[Esteticar Email] To: ${to}`, { subject, body });
    return true;
  },
};