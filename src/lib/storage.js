// ═══════════════════════════════════════════════════════════════════
// ESTETICAR — SUPABASE DB + AI ENGINE v9.0
// Tono elegante · Disponibilidad real por franjas · Memoria cliente
// Supabase · ntfy · Resend · Recordatorio 20d
// ═══════════════════════════════════════════════════════════════════

import { supabase } from './supabase.js';

// Mensajes de conversación se mantienen en memoria de sesión (localStorage)
const MSG_KEY = 'esteticar_messages_v1';
const getMessages = () => { try { return JSON.parse(localStorage.getItem(MSG_KEY) || '[]'); } catch { return []; } };
const saveMessages = (msgs) => { try { localStorage.setItem(MSG_KEY, JSON.stringify(msgs)); } catch { } };

// Session ID único por pestaña/visita
const SESSION_KEY = 'esteticar_session_id';
const getSessionId = () => {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `web_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
};

// ─── Mappers entre Supabase (snake_case) y app (camelCase) ────────
const mapAppt = (r) => ({
  id: r.id, service: r.service, vehicleType: r.vehicle_type,
  date: r.date, time: r.time, priceDisplay: r.price_display, confirmationCode: r.confirmation_code,
  clientName: r.client_name, clientPhone: r.client_phone, clientEmail: r.client_email,
  traslado: r.traslado, cedula: r.cedula, placa: r.placa,
  status: r.status, channel: r.channel, created_date: r.created_date,
  services: r.services || [], totalAmount: r.total_amount || 0,
  pickupOption: r.pickup_option, reminderSent: r.reminder_sent || false,
});

const toApptRow = (d) => ({
  id: d.id, service: d.service, vehicle_type: d.vehicleType,
  date: d.date, time: d.time, price_display: d.priceDisplay, confirmation_code: d.confirmationCode,
  client_name: d.clientName, client_phone: d.clientPhone, client_email: d.clientEmail,
  traslado: d.traslado, cedula: d.cedula, placa: d.placa,
  status: d.status || 'pending', channel: d.channel || 'manual',
  created_date: d.created_date || new Date().toISOString(),
});

// ═══════════════════════════════════════════════════════════════════
// DB SUPABASE
// ═══════════════════════════════════════════════════════════════════
export const db = {
  appointments: {
    list: async () => {
      try {
        const { data } = await supabase.from('appointments').select('*').order('created_date', { ascending: false });
        return (data || []).map(mapAppt);
      } catch { return []; }
    },
    create: async (data) => {
      try {
        const row = toApptRow(data);
        const { data: inserted } = await supabase.from('appointments').insert(row).select().single();
        return inserted ? mapAppt(inserted) : null;
      } catch { return null; }
    },
    update: async (id, data) => {
      try {
        await supabase.from('appointments').update(toApptRow(data)).eq('id', id);
        return true;
      } catch { return false; }
    },
    delete: async (id) => {
      try {
        await supabase.from('appointments').delete().eq('id', id);
        return true;
      } catch { return false; }
    },
    filter: async () => {
      try {
        const { data } = await supabase.from('appointments').select('*').order('created_date', { ascending: false });
        return (data || []).map(mapAppt);
      } catch { return []; }
    },
  },

  clients: {
    upsert: async ({ name, phone, service, date }) => {
      try {
        const record = { phone, name, last_service: service, last_date: date, reminded_20d: false, updated: new Date().toISOString() };
        await supabase.from('clients').upsert(record, { onConflict: 'phone' });
        return { name, phone, lastService: service, lastDate: date };
      } catch { return null; }
    },
    findByName: async (name) => {
      try {
        if (!name) return null;
        const norm = (s) => s?.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
        const { data } = await supabase.from('clients').select('*');
        const found = (data || []).find(c => norm(c.name)?.includes(norm(name)));
        return found ? { name: found.name, phone: found.phone, lastService: found.last_service, lastDate: found.last_date } : null;
      } catch { return null; }
    },
    list: async () => {
      try {
        const { data } = await supabase.from('clients').select('*');
        return (data || []).map(c => ({ name: c.name, phone: c.phone, lastService: c.last_service, lastDate: c.last_date, reminded20d: c.reminded_20d }));
      } catch { return []; }
    },
    markReminded: async (phone) => {
      try { await supabase.from('clients').update({ reminded_20d: true }).eq('phone', phone); } catch { }
    },
  },

  botConfig: {
    get: async () => {
      try {
        const { data } = await supabase.from('bot_config').select('*').eq('key', 'default').single();
        return data ? JSON.parse(data.value || '{}') : {};
      } catch { return {}; }
    },
    update: async (updates) => {
      try {
        const current = await db.botConfig.get();
        const merged = { ...current, ...updates };
        await supabase.from('bot_config').upsert({ key: 'default', value: JSON.stringify(merged) });
        return merged;
      } catch { return {}; }
    },
  },

  agents: {
    addMessage: async (role, content) => {
      try {
        const msgs = getMessages();
        const msg = { role, content, timestamp: new Date().toISOString() };
        msgs.push(msg);
        if (msgs.length > 40) msgs.splice(0, msgs.length - 40);
        saveMessages(msgs);

        // Guardar en Supabase para que el dashboard lo vea
        const sessionId = getSessionId();
        supabase.from('conversations').upsert({
          phone: sessionId,
          session_id: sessionId,
          history: msgs,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'phone' }).catch(() => {});

        return msg;
      } catch { return null; }
    },
    getMessages: async () => { return getMessages(); },
    clearMessages: async () => {
      try {
        saveMessages([]);
        const sessionId = getSessionId();
        supabase.from('conversations').delete().eq('phone', sessionId).catch(() => {});
      } catch { }
    },
  },

  conversations: {
    list: async () => {
      try {
        const { data } = await supabase
          .from('conversations')
          .select('phone, session_id, history, client_name, updated_at, created_at, lead_type, bot_paused, vehicle_type, vehicle_plate, client_email, last_service, direccion, objection, remarketing_status, admin_notes')
          .not('history', 'eq', '[]')
          .not('history', 'is', null)
          .order('updated_at', { ascending: false })
          .limit(300);
        return data || [];
      } catch (e) {
        // Fallback without newer columns
        try {
          const { data } = await supabase
            .from('conversations')
            .select('phone, session_id, history, client_name, updated_at, created_at, lead_type, bot_paused')
            .not('history', 'eq', '[]')
            .not('history', 'is', null)
            .order('updated_at', { ascending: false })
            .limit(300);
          return data || [];
        } catch { return []; }
      }
    },
    update: async (phone, updates) => {
      try {
        await fetch('/api/conversations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': 'esteticar2026' },
          body: JSON.stringify({ phone, updates }),
        });
        return true;
      } catch { return false; }
    },
    sendMessage: async (phone, text) => {
      try {
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': 'esteticar2026' },
          body: JSON.stringify({ phone, text }),
        });
        return await res.json();
      } catch { return { ok: false }; }
    },
    delete: async (phone) => {
      try {
        await fetch('/api/conversations', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': 'esteticar2026' },
          body: JSON.stringify({ phone }),
        });
      } catch { }
    },
  },
};

// ═══════════════════════════════════════════════════════════════════
// GOOGLE SHEETS SYNC (opcional, complementa Supabase)
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
export const notifyEmail = async ({ subject, html, to }) => {
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'email', subject, html, to }),
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

export const notifyNewBooking = async ({ clientName, clientPhone, service, date, price, code, advisorName, traslado }) => {
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
          `${getGreeting()}, ${client.name} 👋 Te saluda el equipo de *Esteticar*.\n\nHan pasado ${diffDays} días desde el último tratamiento de tu vehículo — el momento ideal para renovar la protección y mantener ese acabado impecable.\n\n¿Te agendamos esta semana? ✨`
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
export const getGreeting = () => {
  const hour = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" })).getHours();
  if (hour >= 5 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 19) return "Buenas tardes";
  return "Buenas noches";
};


export const generateEscalationURL = (userQuestion) => {
  const g = getGreeting().toLowerCase();
  const msg = encodeURIComponent(
    `Hola Sara 👋 ${g}. Un cliente en la web nos está preguntando:\n\n_"${userQuestion}"_\n\nTe lo paso para que lo puedas atender personalmente. 🙏`
  );
  return `https://wa.me/573181983601?text=${msg}`;
};

export const resetConversationState = () => {};

// ═══════════════════════════════════════════════════════════════════
// AI ENGINE — proxy a /api/chat (clave Anthropic 100% server-side)
// ═══════════════════════════════════════════════════════════════════
export const ai = {
  invoke: async (userMessage, advisorName = 'Sara') => {
    const history = getMessages();
    const sessionId = getSessionId();
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage, advisorName, history, sessionId }),
    });
    if (!res.ok) throw new Error('Chat API error ' + res.status);
    const { reply } = await res.json();
    return reply || '';
  },
};

// ─── EmailJS (legacy, no se usa activamente) ──────────────────────
export const email = {
  send: async ({ to, subject, body }) => {
    console.log(`[Esteticar Email] To: ${to}`, { subject, body });
    return true;
  },
};
