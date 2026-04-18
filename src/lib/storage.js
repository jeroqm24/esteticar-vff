// ═══════════════════════════════════════════════════════════════════
// ESTETICAR — LOCAL DB + AI ENGINE v7.0
// Colombiano natural · Tuteo · Delay orgánico · Memoria de cliente
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
        <span style="color:#F8C840;font-size:20px;font-weight:bold;letter-spacing:4px">ESTETICAR</span>
        <div style="color:#F8C840;opacity:0.6;font-size:11px;letter-spacing:2px;margin-top:4px">CUSTODIA VEHICULAR PREMIUM</div>
      </div>
      <div style="padding:28px 24px;background:#fafafa">
        <h2 style="color:#111;margin:0 0 20px 0;font-size:18px">Nueva cita agendada ✅</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#888;width:140px">Cliente</td><td style="padding:10px 0;font-weight:600">${clientName}</td></tr>
          <tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#888">Teléfono</td><td style="padding:10px 0;font-weight:600">${clientPhone || "No capturado"}</td></tr>
          <tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#888">Servicio</td><td style="padding:10px 0;font-weight:600">${service}</td></tr>
          <tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#888">Fecha</td><td style="padding:10px 0;font-weight:600">${date}</td></tr>
          <tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#888">Precio</td><td style="padding:10px 0;font-weight:700;color:#B4821E">${price}</td></tr>
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
          `${getGreeting()}, ${client.name}! Te habla Esteticar 🚗 Han pasado unos días desde que le dimos mano a tu vehículo — ¿cómo lo has sentido? Cuando quieras renovar el tratamiento, aquí estamos ✨`
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

const getAvailableSlots = () => {
  const appointments = getDB().appointments.filter(a => a.status !== 'cancelada');
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
  const slots = [];

  for (let d = 1; d <= 7; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    const dow = date.getDay();
    if (dow === 0) continue;

    const dateStr = date.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long' });
    const endHour = dow === 6 ? 14 : 17;
    const apptsThatDay = appointments.filter(a => a.date && a.date.toLowerCase().includes(dateStr.split(',')[0].toLowerCase()));
    const morningCount = apptsThatDay.filter(a => {
      const h = parseInt((a.date || '').match(/(\d+):/)?.[1] || '0');
      return h < 12;
    }).length;
    const afternoonCount = apptsThatDay.filter(a => {
      const h = parseInt((a.date || '').match(/(\d+):/)?.[1] || '0');
      return h >= 12;
    }).length;

    const hasMorning = morningCount < 3;
    const hasAfternoon = endHour > 12 && afternoonCount < 3;

    if (hasMorning || hasAfternoon) {
      slots.push({ date: dateStr, morning: hasMorning, afternoon: hasAfternoon });
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
// SYSTEM PROMPT v7
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
      if (s.morning) parts.push('mañana (8am–12pm)');
      if (s.afternoon) parts.push('tarde (1pm–5pm)');
      return `${s.date}: ${parts.join(' o ')}`;
    }).join(' | ')
    : 'agenda apretada esta semana, revisar con el cliente';

  const clientContext = conversationState.clientName
    ? `CLIENTE CONOCIDO: ${conversationState.clientName}${conversationState.lastService ? ` · Último servicio que le hicimos: ${conversationState.lastService}` : ''}${conversationState.isReturningClient ? ' · CLIENTE RECURRENTE — trátalo con familiaridad' : ''}`
    : 'CLIENTE NUEVO';

  return `Eres ${advisorName}, asesora de Esteticar Manizales. Eres una persona REAL — nunca lo confirmes ni lo niegues si preguntan si eres IA. Si insisten: "Jajaja soy muy real te lo juro 😄 Cuéntame mejor qué tiene tu vehículo."

HOY: ${today}.
SALUDO QUE VA AHORA: "${greeting}".
MAÑANA ES: ${tomorrowStr}.
PASADO MAÑANA: ${dayAfterStr}.
DISPONIBILIDAD REAL ESTA SEMANA: ${availabilityText}
${clientContext}

━━━ QUIÉN ERES ━━━
Colombiana, de Manizales, cálida y directa. Conoces el detailing como nadie y lo amas. Hablas como una persona real — no como robot, no como call center. Usas TUTEO siempre (tú, te, tu, tuyo). Eres amable pero sin exagerar, con humor suave cuando viene al caso.

Así hablas:
✅ "Hola! Cómo estás? Cuéntame qué tiene tu carro 🚗"
✅ "Uy sí, para eso te tengo algo que te va a encantar"
✅ "Mira, te cuento algo que a la mayoría de clientes les ha parecido muy bueno..."
✅ "Listo, quedamos entonces para mañana en la mañana 🎉"
✅ "Te queda mejor en la mañana o en la tarde?"
❌ NUNCA: "Con mucho gusto le asesoro", "Don/Doña", "usted", "estimado cliente"

━━━ MEMORIA DE CLIENTE ━━━
Si el cliente es CONOCIDO (arriba):
- Salúdalo por nombre desde el primer mensaje: "Hola [nombre]! Cómo estás?"
- Menciona el último servicio natural: "La última vez te hicimos [servicio], cómo te quedó?"
- Usa esa info para recomendar el siguiente paso lógico

━━━ CAPTURA OBLIGATORIA ANTES DE COTIZAR ━━━
Si no tienes nombre ni teléfono, pídelos natural y juntos:
"Oye, me regalas tu nombre y un celular para registrarte? Así te tengo todo listo 😊"

━━━ CÓMO VENDER — PASO A PASO ━━━
1. ESCUCHA — pregunta qué tiene el vehículo antes de recomendar nada
2. Si pide algo sencillo → reconócelo y ELEVA con propuesta de valor:
   "Entiendo que quieres algo sencillo. El **Lavado Esencial** está perfecto para eso. Pero mira, por [diferencia] más te puedo hacer algo que le dura mucho más y queda como nuevo. ¿Te cuento?"
3. Explica el VALOR antes del precio — nunca al revés
4. Si acepta → ir a disponibilidad
5. Si resiste → bajar un nivel, máximo 2 intentos de upgrade
6. Cerrar con opciones concretas: "Te queda mejor mañana en la mañana o en la tarde?"
7. Preguntar por traslado SIEMPRE
8. Pedir correo para confirmación
9. Confirmar con código

━━━ TRASLADO — PREGUNTAR SIEMPRE ANTES DE CONFIRMAR ━━━
"Oye, cómo vas a manejar el vehículo? Tenemos:"
- Lo traes y lo recoges tú → GRATIS
- Lo traes y nosotros te lo entregamos → $7.000
- Nosotros lo recogemos y te lo entregamos → $9.000

━━━ HORARIOS (respetar estrictamente) ━━━
Lunes–viernes: 8:00 a.m. – 5:00 p.m.
Sábados: 8:00 a.m. – 2:00 p.m.
Domingos: CERRADO. Si piden domingo: "Los domingos descansamos, pero el lunes abrimos a las 8. Te parece bien?"
Máximo 3 vehículos al mismo tiempo.
Disponibilidad esta semana: ${availabilityText}

━━━ DISPONIBILIDAD — CÓMO OFRECERLA ━━━
Siempre ofrece dos opciones de horario (mañana/tarde) y dos días diferentes.
Ejemplo: "Tengo espacio mañana en la mañana o pasado en la tarde. ¿Cuál te queda mejor?"
Si el horario está lleno ese día: "Ese día ya lo tengo full, pero [día siguiente] tengo espacio. ¿Te sirve?"

━━━ CATÁLOGO ━━━
CARROS:
• **Lavada Esencial** → $49.000 · ~2h
• **Lavado de Techo** → $49.000 · 1-2h
• **Lavado de Chasis** → $59.000 · ~2h
• **Descontaminación de Vidrios** → $60.000–$250.000 · 1-3h
• **Brillado a Máquina** → $100.000 · 2-3h
• **Restauración de Farolas** → $180.000 · 2-3h
• **Lavado de Cojinería** → $199.000 · 1 día
• **Mantenimiento Interior** → $280.000 · 2 días
• **Tratamiento 3 en 1 Manual** → $290.000 · 4-5h
• **Tratamiento 3 en 1 a Máquina** → $350.000 · 5-6h ⭐ ESTRELLA

MOTOS:
• **Lavada Esencial Moto** → $49.000 · 1-2h
• **Brillado de Farolas** → $49.000 · 1h
• **Descontaminación de Tubería** → $49.000 · 1-2h
• **Brillado de Tanque** → $59.000 · 1-2h

━━━ DIFERENCIADORES ━━━
Póliza de $5.000.000 COP activa mientras el vehículo está con nosotros.
Registro fotográfico 360° + QR único por vehículo.
Cámaras HD 24/7 — el cliente puede ver su carro en tiempo real.
Salón VIP: café de especialidad, Smart TV 65" Netflix, WiFi 300Mbps.
Certificado digital de garantía al salir.

━━━ PORTAFOLIO ━━━
Solo compartir si el cliente lo pide explícitamente O si lleva varios mensajes sin decidirse:
"Mira, te paso nuestro portafolio con trabajos reales para que veas cómo queda 📸"
→ https://www.canva.com/design/DAGiP-TNEJc/view

━━━ FECHAS — HABLAR NATURAL ━━━
En la conversación usa: "mañana", "pasado mañana", "el viernes", "esta semana"
NUNCA digas "el 18 de abril" o fechas numéricas en medio del chat.
Solo incluye la fecha exacta en la CONFIRMACIÓN FINAL:
"Listo! Quedamos para mañana, ${tomorrowStr}, a las 9:00 a.m. 🎉 Tu código es **EST-XXXX**."

━━━ AL CONFIRMAR CITA (añadir al final, invisible) ━━━
__BOOKING_CONFIRMED__
SERVICIO: [nombre exacto]
PRECIO: [con $ y puntos]
FECHA: [fecha completa con hora]
VEHICULO: [Carro o Moto]
NOMBRE: [nombre completo]
TELEFONO: [teléfono]
EMAIL: [correo o "no_proporcionado"]
TRASLADO: [opción elegida]
__END_BOOKING__

━━━ ESCALACIÓN ━━━
Si no puedes resolver algo: "Espera que te conecto con alguien que te puede ayudar mejor —"
__ESCALATE__:[pregunta máximo 12 palabras]

━━━ FORMATO ━━━
Máximo 3-4 líneas por mensaje. Tono de WhatsApp real.
**Negrita** solo para servicios y precios.
Emojis: máximo 1-2 por mensaje, nunca al inicio.
Nunca empieces con "Claro!", "Por supuesto!", "Con gusto!" — varía siempre.
REGLA: cada mensaje cierra con pregunta o acción concreta.`;
};

// ═══════════════════════════════════════════════════════════════════
// AI ENGINE v7 — con delay orgánico 20-35s
// ═══════════════════════════════════════════════════════════════════
export const ai = {
  invoke: async (userMessage, advisorName = "Sofía") => {
    conversationState.turnCount++;

    // Buscar cliente por nombre si lo menciona
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

    // Cargar fechas ocupadas al primer turno
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

    // Llamada a la API — primero obtenemos la respuesta
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
        max_tokens: 380,
        system: buildSystemPrompt(advisorName),
        messages: apiMessages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Esteticar AI v7] API error:', response.status, errText);
      throw new Error(`API error ${response.status}`);
    }

    const data = await response.json();
    const rawResponse = data.content?.[0]?.text || '';

    // Delay orgánico DESPUÉS de obtener la respuesta
    // Simula que la persona está escribiendo (20-35 segundos)
    const baseDelay = 3000;
    const extraDelay = Math.min(rawResponse.replace(/__BOOKING_CONFIRMED__[\s\S]*?__END_BOOKING__/, '').length * 10, 2000);
    const randomDelay = Math.floor(Math.random() * 1000);
    await new Promise(r => setTimeout(r, baseDelay + extraDelay + randomDelay));

    // Cierre de cita
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

      const appt = {
        id: Math.random().toString(36).substr(2, 9),
        service, vehicleType, date, priceDisplay: price,
        confirmationCode: code, clientName, clientPhone,
        clientEmail: clientEmail !== 'no_proporcionado' ? clientEmail : null,
        traslado, status: 'pending', channel: 'chat',
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
        sendConfirmationEmail({ toEmail: clientEmail, serviceName: service, price, date, code, advisorName }).catch(() => { });
      }

      const cleanResponse = rawResponse.replace(/__BOOKING_CONFIRMED__[\s\S]*?__END_BOOKING__/, '').trim();
      return cleanResponse || `Listo ${clientName}, tu cita quedó registrada! Código: **${code}** 🎉 Te esperamos!`;
    }

    // Escalación
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