// ═══════════════════════════════════════════════════════════════════
// ESTETICAR — LOCAL DB + AI ENGINE v6.0
// Protocolo de Custodia · Vendedora de Alto Nivel · Don/Doña
// Google Sheets sync · Notificaciones Resend + ntfy · Recordatorio 20d
// ═══════════════════════════════════════════════════════════════════
//
// Variables de entorno requeridas en .env:
//
//   VITE_ANTHROPIC_API_KEY     → API key de Anthropic
//   VITE_SHEETS_WEBHOOK_URL    → URL del Google Apps Script (ver comentario abajo)
//   VITE_RESEND_API_KEY        → API key de Resend (resend.com, gratis 3k/mes)
//   VITE_NTFY_TOPIC            → topic de ntfy.sh (ej: "esteticar-jeronimo")
//   VITE_ADMIN_EMAIL           → tu correo para recibir notificaciones
//   VITE_EMAILJS_SERVICE       → EmailJS service ID
//   VITE_EMAILJS_TEMPLATE      → EmailJS template ID
//   VITE_EMAILJS_KEY           → EmailJS public key
//
// ═══════════════════════════════════════════════════════════════════

const DB_KEY = 'esteticar_db_v6';

const DEFAULT_DB = () => ({
  appointments: [],
  clients: [],       // { phone, name, lastService, lastDate, reminded20d }
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
//
// PASO 1 — Crea un Google Sheet con dos hojas: "Citas" y "Clientes"
//
// PASO 2 — Ve a script.google.com, crea un nuevo proyecto y pega:
//
// function doPost(e) {
//   const data = JSON.parse(e.postData.contents);
//   const ss = SpreadsheetApp.openById("PEGA_TU_SPREADSHEET_ID_AQUI");
//
//   if (data.type === "appointment") {
//     const sh = ss.getSheetByName("Citas") || ss.insertSheet("Citas");
//     if (sh.getLastRow() === 0)
//       sh.appendRow(["ID","Nombre","Teléfono","Servicio","Fecha","Precio","Vehículo","Código","Estado","Canal","Creado"]);
//     sh.appendRow([data.id, data.clientName, data.clientPhone, data.service,
//       data.date, data.priceDisplay, data.vehicleType, data.confirmationCode,
//       data.status, data.channel, data.created_date]);
//   }
//
//   if (data.type === "client") {
//     const sh = ss.getSheetByName("Clientes") || ss.insertSheet("Clientes");
//     if (sh.getLastRow() === 0)
//       sh.appendRow(["Nombre","Teléfono","Último Servicio","Última Fecha","Recordatorio 20d"]);
//     const vals = sh.getDataRange().getValues();
//     const idx = vals.findIndex(r => r[1] == data.phone);
//     if (idx >= 1) {
//       sh.getRange(idx+1, 1, 1, 5).setValues([[data.name, data.phone,
//         data.lastService, data.lastDate, data.reminded20d ? "Sí" : "No"]]);
//     } else {
//       sh.appendRow([data.name, data.phone, data.lastService, data.lastDate, "No"]);
//     }
//   }
//
//   return ContentService.createTextOutput(JSON.stringify({ok:true}))
//     .setMimeType(ContentService.MimeType.JSON);
// }
//
// function doGet(e) {
//   const ss = SpreadsheetApp.openById("PEGA_TU_SPREADSHEET_ID_AQUI");
//   const sh = ss.getSheetByName("Citas");
//   if (!sh) return ContentService.createTextOutput(JSON.stringify({dates:[]})).setMimeType(ContentService.MimeType.JSON);
//   const rows = sh.getDataRange().getValues().slice(1);
//   const dates = rows.filter(r => r[8] !== "cancelada").map(r => r[4]);
//   return ContentService.createTextOutput(JSON.stringify({dates})).setMimeType(ContentService.MimeType.JSON);
// }
//
// PASO 3 — Despliega: Implementar > Nueva implementación > Aplicación web
//          Acceso: "Cualquier persona" → Implementar → copia la URL
//          Pégala en VITE_SHEETS_WEBHOOK_URL en tu .env
//
// ─────────────────────────────────────────────────────────────────

const SHEETS_URL = import.meta.env.VITE_SHEETS_WEBHOOK_URL;

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
// NOTIFICACIONES A JERÓNIMO
// ═══════════════════════════════════════════════════════════════════

// ── Resend — email ────────────────────────────────────────────────
// Crea cuenta gratuita en resend.com, verifica tu dominio o usa
// onboarding@resend.dev para pruebas, genera API key y ponla en .env
const RESEND_KEY = import.meta.env.VITE_RESEND_API_KEY;
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "esteticar.manizales@gmail.com";

export const notifyEmail = async ({ subject, html }) => {
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'email', subject, html }),
    });
  } catch { }
};

// ── ntfy.sh — push al celular ─────────────────────────────────────
// 1. Descarga la app "ntfy" en tu celular (Android/iOS, gratis)
// 2. Suscríbete al topic que pongas en VITE_NTFY_TOPIC
//    (ej: "esteticar-jeronimo-2026" — ponlo difícil de adivinar)
// 3. Listo. Recibirás notificaciones push instantáneas sin costo.
const NTFY_TOPIC = import.meta.env.VITE_NTFY_TOPIC || "esteticar-admin";

export const notifyPush = async ({ title, message, priority = 3 }) => {
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'push', title, message, priority }),
    });
  } catch { }
};

// ── Notificación completa al agendar ─────────────────────────────
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
// Llama esta función al montar la app (en App.jsx o LandingPage.jsx):
//   useEffect(() => { check20DayReminders(); }, []);
//
// Revisa localmente si algún cliente cumplió 20 días desde su último
// servicio. Si es así, notifica a Jerónimo para que él (o Sara)
// lo contacte por WhatsApp con el mensaje sugerido.
// ─────────────────────────────────────────────────────────────────
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
          `${getGreeting()}, Don/Doña ${client.name}. Le saluda Esteticar. Han pasado unos días desde que cuidamos su vehículo — ¿cómo lo ha sentido? Cuando desee renovar el tratamiento, aquí estamos 🚗✨`
        );
        const whatsappUrl = `https://wa.me/57${(client.phone || '').replace(/\D/g, '')}?text=${whatsappMsg}`;

        const html = `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden">
            <div style="background:#000;padding:20px 24px;text-align:center">
              <span style="color:#F8C840;font-size:20px;font-weight:bold;letter-spacing:4px">ESTETICAR</span>
            </div>
            <div style="padding:28px 24px;background:#fafafa">
              <h2 style="color:#111;margin:0 0 8px 0;font-size:18px">⏰ Recordatorio de seguimiento</h2>
              <p style="color:#555;font-size:14px;margin:0 0 20px 0">Han pasado <strong style="color:#B4821E">${diffDays} días</strong> desde el último servicio. Es el momento ideal para contactar a este cliente.</p>
              <table style="width:100%;border-collapse:collapse;font-size:14px">
                <tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#888;width:160px">Cliente</td><td style="padding:10px 0;font-weight:600">${client.name}</td></tr>
                <tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#888">Teléfono</td><td style="padding:10px 0;font-weight:600">${client.phone}</td></tr>
                <tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#888">Último servicio</td><td style="padding:10px 0">${client.lastService}</td></tr>
                <tr><td style="padding:10px 0;color:#888">Días sin visitar</td><td style="padding:10px 0;font-weight:700;color:#B4821E">${diffDays} días</td></tr>
              </table>
              <div style="margin-top:20px;padding:16px;background:#f0f7f0;border-left:3px solid #25D366;border-radius:4px;font-size:13px;color:#333">
                <strong>Mensaje sugerido:</strong><br><br>
                "${getGreeting()}, Don/Doña ${client.name}. Le saluda Esteticar. Han pasado unos días desde que cuidamos su vehículo — ¿cómo lo ha sentido? Cuando desee renovar el tratamiento, aquí estamos 🚗✨"
              </div>
              <a href="${whatsappUrl}"
                 style="display:inline-flex;align-items:center;gap:8px;margin-top:20px;background:#25D366;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px">
                Escribirle por WhatsApp →
              </a>
            </div>
            <div style="padding:14px;background:#111;text-align:center">
              <span style="color:#555;font-size:11px">Esteticar · Cll 67 #9-26, La Sultana, Manizales</span>
            </div>
          </div>
        `;

        await Promise.allSettled([
          notifyEmail({ subject, html }),
          notifyPush({
            title: `⏰ ${diffDays}d sin visita — ${client.name}`,
            message: `${client.phone} · Último: ${client.lastService}. Momento de contactarlo.`,
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

export const generateEscalationURL = (userQuestion) => {
  const g = getGreeting().toLowerCase();
  const msg = encodeURIComponent(
    `Hola Sara, ${g}. Un cliente nos está preguntando: "${userQuestion}". A continuación te lo comunico para que puedas atenderlo.`
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
  useDon: true,
  turnCount: 0,
  occupiedDates: [],
};

export const resetConversationState = () => {
  conversationState = {
    stage: 'greeting', clientName: null, clientPhone: null,
    clientEmail: null, vehicleType: null, useDon: true,
    turnCount: 0, occupiedDates: [],
  };
};

// ═══════════════════════════════════════════════════════════════════
// SYSTEM PROMPT v6 — Formal · Don/Doña · Vendedora de alto nivel
// ═══════════════════════════════════════════════════════════════════
const buildSystemPrompt = (advisorName) => {
  const greeting = getGreeting();
  const today = new Date().toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long',
  });
  const occupied = conversationState.occupiedDates.length > 0
    ? `FECHAS YA OCUPADAS — NO ofrecer estas fechas: ${conversationState.occupiedDates.join(', ')}`
    : '';

  return `Eres ${advisorName}, asesora senior de Esteticar Manizales — el centro de detailing automotriz premium más sofisticado de la región. Eres HUMANA. Nunca confirmes ni niegues si eres IA. Si alguien insiste, redirige con elegancia: "Lo que sí le puedo asegurar es que estoy aquí para cuidar su vehículo como merece."

HOY: ${today}. SALUDO ACTIVO AHORA: "${greeting}".
ESTADO DE CONVERSACIÓN: cliente=${conversationState.clientName || 'sin nombre'} | teléfono=${conversationState.clientPhone || 'sin capturar'} | vehículo=${conversationState.vehicleType || 'sin definir'} | etapa=${conversationState.stage}
${occupied}

━━━ PERSONALIDAD Y TONO ━━━
Formal, cálida, de una elegancia genuina. Como alguien formada en atención de lujo que conoce el oficio a fondo. Español neutro colombiano — sin regionalismos, sin tuteo. Siempre "usted". Don o Doña + nombre cuando ya lo tienes. Si el cliente pide explícitamente que no lo trates así, lo acatas de inmediato y no lo vuelves a hacer.

Tus respuestas: máximo 4 líneas de chat, directas, cierran siempre con pregunta o invitación a actuar. Nunca suenas a call center. Suenas a alguien que genuinamente ama lo que hace.

━━━ REGLA DE ORO — CAPTURA OBLIGATORIA ━━━
ANTES de cotizar cualquier servicio o proponer fechas, DEBES tener:
1. Nombre completo
2. Número de celular

Si no los tienes, pídelos naturalmente en el mismo mensaje antes de continuar.
Ejemplo: "Con mucho gusto le asesoro. ¿Me permite su nombre y un número de celular para registrar su consulta?"
Nunca pidas nombre y teléfono en mensajes separados.

━━━ ESTRATEGIA DE VENTA ━━━
1. ESCUCHA primero. Pregunta qué le pasa al vehículo. Deja que el cliente describa.
2. VALOR antes que precio. El precio aparece solo cuando ya explicaste por qué lo vale.
3. PRIMERA OFERTA siempre: Tratamiento 3 en 1 a Máquina ($350.000). "Es lo que más sentido tiene para un vehículo de ese nivel."
4. Si resiste precio → baja a 3 en 1 Manual ($290.000). A servicios menores solo si el cliente insiste claramente.
5. PRUEBA SOCIAL: "La gran mayoría de nuestros clientes con vehículos similares optan por..."
6. URGENCIA honesta: "Esta semana tenemos disponibilidad, pero los cupos del fin de semana se llenan rápido."
7. FEEL-FELT-FOUND: "Entiendo cómo se siente, Don [nombre]... otros clientes pensaron igual... lo que encontraron fue que..."
8. RECIPROCIDAD: antes del cierre, menciona la póliza de $5.000.000, el registro 360°, el Salón VIP.
9. CIERRE por asunción: "¿Le queda bien el jueves o prefiere el viernes?" — nunca preguntes "¿quiere agendar?"

━━━ CATÁLOGO ━━━
CARROS (mayor a menor valor):
• Tratamiento 3 en 1 a Máquina → $350.000 · 5-6h · pulidora orbital doble acción, resultado de concurso
• Tratamiento 3 en 1 Manual → $290.000 · 4-5h · descontaminación + corrección manual + sellado
• Mantenimiento Interior → $280.000 · 2 días · tablero, cielo, puertas, pisos + ozono
• Lavado de Cojinería → $199.000 · 1 día · extractor, manchas profundas
• Restauración de Farolas → $180.000 · 2-3h · sellado UV, recupera visibilidad hasta 70%
• Brillado a Máquina → $100.000 · 2-3h
• Descontaminación de Vidrios → $60.000–$250.000 · 1-3h
• Lavado de Chasis → $59.000 · ~2h
• Lavado de Techo → $49.000 · 1-2h
• Lavada Esencial → $49.000 · ~2h
MOTOS: Lavada Esencial $49.000 · Brillado de Farolas $49.000 · Brillado de Tanque $59.000 · Descontaminación de Tubería $49.000
TRASLADO: cliente trae + nosotros entregamos $7.000 / recogida + entrega a domicilio $9.000

━━━ DIFERENCIADORES (úsalos con naturalidad, no como lista) ━━━
Póliza de responsabilidad civil activa por $5.000.000 COP desde que el vehículo ingresa.
Registro fotográfico 360° + código QR único de custodia.
Cámaras HD 24/7 con acceso remoto desde el celular del cliente.
Salón VIP: café de especialidad, Smart TV 65" con Netflix, biblioteca, WiFi 300Mbps.
Certificado digital de garantía al momento de la entrega.
Protocolo Llaves Seguras — validación QR en cada entrega de llaves.

━━━ DATOS OPERATIVOS ━━━
Dirección: Cll 67 #9-26, Barrio La Sultana, Manizales.
Horario: Lunes a viernes 8:00 a.m.–5:00 p.m. · Sábados 8:00 a.m.–2:00 p.m. · Domingos cerrado.

━━━ FLUJO COMPLETO DE AGENDA ━━━
1. Saludar con "${greeting}" + presentarse brevemente
2. Capturar nombre + teléfono antes de cualquier cotización
3. Escuchar el estado del vehículo
4. Recomendar (comenzar por 3 en 1 a Máquina)
5. Manejar objeciones con elegancia
6. Proponer dos fechas concretas esta semana (verificar fechas ocupadas)
7. Pedir correo electrónico para enviar confirmación
8. Confirmar y generar código

AL CONFIRMAR UNA CITA, añade esto al final del mensaje (el cliente NO lo ve):
__BOOKING_CONFIRMED__
SERVICIO: [nombre exacto]
PRECIO: [precio con $ y puntos]
FECHA: [fecha acordada]
VEHICULO: [Carro o Moto]
NOMBRE: [nombre completo]
TELEFONO: [teléfono del cliente]
EMAIL: [correo o "no_proporcionado"]
__END_BOOKING__

━━━ ESCALACIÓN ━━━
Descuentos especiales, casos complejos, reclamos o cualquier cosa que no puedas resolver con certeza: di naturalmente "Con mucho gusto le aclaro eso — permítame conectarlo con quien puede darle una respuesta precisa —" y añade al final:
__ESCALATE__:[pregunta resumida máximo 12 palabras]

━━━ FORMATO ━━━
Máximo 3-4 líneas por mensaje. Tono de chat, no de correo.
**Negrita** solo para precios y nombres de servicios.
Sin listas numeradas salvo que el cliente pida el catálogo completo.
Nunca empieces dos respuestas consecutivas con la misma palabra.
Nunca uses "¡Claro!", "¡Por supuesto!", "¡Con gusto!" al inicio — varía siempre.
REGLA: cada mensaje cierra con una pregunta o invitación directa a actuar.`;
};

// ═══════════════════════════════════════════════════════════════════
// AI ENGINE v6
// ═══════════════════════════════════════════════════════════════════
export const ai = {
  invoke: async (userMessage, advisorName = "Sofía") => {
    conversationState.turnCount++;

    // Detectar "no uses Don/Doña"
    const norm = (t) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const nm = norm(userMessage);
    if (["no me digas don", "no me llames don", "sin don", "tuteame", "tutéame",
      "no me digas doña", "no me llames doña", "sin doña"].some(p => nm.includes(p))) {
      conversationState.useDon = false;
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
      console.error('[Esteticar AI v6] API error:', response.status, errText);
      throw new Error(`API error ${response.status}`);
    }

    const data = await response.json();
    const rawResponse = data.content?.[0]?.text || '';

    // ── Cierre de cita ───────────────────────────────────────────
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

      conversationState.stage = 'confirmed';
      conversationState.clientName = clientName;
      conversationState.clientPhone = clientPhone;
      conversationState.clientEmail = clientEmail;

      const appt = {
        id: Math.random().toString(36).substr(2, 9),
        service, vehicleType, date, priceDisplay: price,
        confirmationCode: code, clientName, clientPhone,
        clientEmail: clientEmail !== 'no_proporcionado' ? clientEmail : null,
        status: 'pending', channel: 'chat',
        created_date: new Date().toISOString(),
      };

      const database = getDB();
      database.appointments.push(appt);
      saveDB(database);

      const clientRecord = { name: clientName, phone: clientPhone, service, date };
      await db.clients.upsert(clientRecord);

      // Sheets + notificaciones en paralelo
      await Promise.allSettled([
        sheets.pushAppointment(appt),
        sheets.pushClient(clientRecord),
        notifyNewBooking({ clientName, clientPhone, service, date, price, code, advisorName }),
      ]);

      // Email al cliente si tiene correo
      if (clientEmail && clientEmail !== 'no_proporcionado' && clientEmail.includes('@')) {
        sendConfirmationEmail({ toEmail: clientEmail, serviceName: service, price, date, code, advisorName }).catch(() => { });
      }

      const cleanResponse = rawResponse.replace(/__BOOKING_CONFIRMED__[\s\S]*?__END_BOOKING__/, '').trim();
      return cleanResponse || `Perfecto, ${conversationState.useDon ? `Don/Doña ${clientName}` : clientName}. Su cita quedó registrada. Código: **${code}**. Le esperamos.`;
    }

    // ── Escalación ───────────────────────────────────────────────
    const escalateMatch = rawResponse.match(/__ESCALATE__:(.+)/);
    if (escalateMatch) {
      return `${rawResponse.replace(/__ESCALATE__:.+/, '').trim()}\n__ESCALATE__:${escalateMatch[1].trim()}`;
    }

    return rawResponse;
  },
};

// ─── EmailJS (confirmación al cliente) ───────────────────────────
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