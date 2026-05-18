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
  origin: r.origin || null,
  leadType: r.lead_type || null,
});

const toApptRow = (d) => ({
  id: d.id, service: d.service, vehicle_type: d.vehicleType,
  date: d.date, time: d.time, price_display: d.priceDisplay, confirmation_code: d.confirmationCode,
  client_name: d.clientName, client_phone: d.clientPhone, client_email: d.clientEmail,
  traslado: d.traslado, cedula: d.cedula, placa: d.placa,
  status: d.status || 'pending', channel: d.channel || 'manual',
  created_date: d.created_date || new Date().toISOString(),
  origin: d.origin || null,
  lead_type: d.leadType || null,
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
        const { data, error } = await supabase
          .from('conversations')
          .select('phone, session_id, history, client_name, updated_at, created_at, lead_type, bot_paused, vehicle_type, vehicle_plate, client_email, last_service, direccion, objection, remarketing_status, admin_notes')
          .order('updated_at', { ascending: false })
          .limit(300);
        if (error) throw error;
        return (data || []).filter(r => Array.isArray(r.history) && r.history.length > 0);
      } catch {
        try {
          const { data } = await supabase
            .from('conversations')
            .select('phone, session_id, history, client_name, lead_type, bot_paused')
            .limit(300);
          return (data || []).filter(r => Array.isArray(r.history) && r.history.length > 0);
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
  const subject = `Nueva cita — ${clientName} · ${service}`;
  const html = `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nueva cita · Esteticar</title></head>
<body style="margin:0;padding:0;background:#F4F1EC;font-family:Georgia,serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1EC;padding:40px 16px">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#ffffff;border-radius:2px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.10)">

  <!-- HEADER -->
  <tr><td style="background:#0A0A0A;padding:36px 40px;text-align:center;border-bottom:3px solid #C9A84C">
    <img src="https://esteticar-vff.vercel.app/logo.png" alt="Esteticar" width="120" style="display:block;margin:0 auto 12px;height:auto" />
    <div style="color:#C9A84C;font-size:9px;letter-spacing:4px;font-family:Arial,sans-serif;font-weight:600;text-transform:uppercase">Custodia Vehicular Premium · Manizales</div>
  </td></tr>

  <!-- BADGE -->
  <tr><td style="background:#0A0A0A;padding:0 40px 28px;text-align:center">
    <div style="display:inline-block;background:#C9A84C;color:#0A0A0A;font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;padding:7px 20px;border-radius:2px">Nueva cita agendada</div>
  </td></tr>

  <!-- INTRO -->
  <tr><td style="padding:36px 40px 0">
    <p style="margin:0;font-size:22px;color:#0A0A0A;font-weight:400;line-height:1.3">Hola, tienes una nueva reserva.</p>
    <p style="margin:10px 0 0;font-size:14px;color:#888;font-family:Arial,sans-serif;line-height:1.6">La siguiente cita fue agendada a través del sistema Esteticar.</p>
    <div style="margin:24px 0 0;height:1px;background:linear-gradient(90deg,#C9A84C 0%,#f4f1ec 100%)"></div>
  </td></tr>

  <!-- DATA GRID -->
  <tr><td style="padding:28px 40px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="44%" style="padding:14px 16px;background:#FAF8F4;border-radius:2px 0 0 2px;font-family:Arial,sans-serif;font-size:10px;color:#A0916E;letter-spacing:2px;text-transform:uppercase;font-weight:600;vertical-align:middle">Cliente</td>
        <td style="padding:14px 16px;background:#FAF8F4;border-radius:0 2px 2px 0;font-size:15px;color:#0A0A0A;font-weight:600;vertical-align:middle">${clientName}</td>
      </tr>
      <tr><td colspan="2" style="height:4px"></td></tr>
      <tr>
        <td style="padding:14px 16px;background:#FAF8F4;font-family:Arial,sans-serif;font-size:10px;color:#A0916E;letter-spacing:2px;text-transform:uppercase;font-weight:600;vertical-align:middle">Teléfono</td>
        <td style="padding:14px 16px;background:#FAF8F4;font-size:15px;color:#0A0A0A;font-weight:600;vertical-align:middle">${clientPhone || "No capturado"}</td>
      </tr>
      <tr><td colspan="2" style="height:4px"></td></tr>
      <tr>
        <td style="padding:14px 16px;background:#FAF8F4;font-family:Arial,sans-serif;font-size:10px;color:#A0916E;letter-spacing:2px;text-transform:uppercase;font-weight:600;vertical-align:middle">Servicio</td>
        <td style="padding:14px 16px;background:#FAF8F4;font-size:15px;color:#0A0A0A;font-weight:600;vertical-align:middle">${service}</td>
      </tr>
      <tr><td colspan="2" style="height:4px"></td></tr>
      <tr>
        <td style="padding:14px 16px;background:#FAF8F4;font-family:Arial,sans-serif;font-size:10px;color:#A0916E;letter-spacing:2px;text-transform:uppercase;font-weight:600;vertical-align:middle">Fecha y hora</td>
        <td style="padding:14px 16px;background:#FAF8F4;font-size:15px;color:#0A0A0A;font-weight:600;vertical-align:middle">${date}</td>
      </tr>
      <tr><td colspan="2" style="height:4px"></td></tr>
      <tr>
        <td style="padding:14px 16px;background:#FAF8F4;font-family:Arial,sans-serif;font-size:10px;color:#A0916E;letter-spacing:2px;text-transform:uppercase;font-weight:600;vertical-align:middle">Traslado</td>
        <td style="padding:14px 16px;background:#FAF8F4;font-size:14px;color:#555;vertical-align:middle">${traslado || "Cliente trae y recoge (gratis)"}</td>
      </tr>
    </table>
  </td></tr>

  <!-- PRECIO + CÓDIGO -->
  <tr><td style="padding:0 40px 36px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="50%" style="padding:20px 24px;background:#0A0A0A;border-radius:2px 0 0 2px;text-align:center">
          <div style="font-family:Arial,sans-serif;font-size:9px;color:#A0916E;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px">Valor del servicio</div>
          <div style="font-size:22px;font-weight:700;color:#C9A84C;font-family:Arial,sans-serif">${price}</div>
        </td>
        <td width="4px" style="background:#1a1a1a"></td>
        <td width="50%" style="padding:20px 24px;background:#0A0A0A;border-radius:0 2px 2px 0;text-align:center">
          <div style="font-family:Arial,sans-serif;font-size:9px;color:#A0916E;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px">Código de reserva</div>
          <div style="font-size:20px;font-weight:700;color:#ffffff;font-family:'Courier New',monospace;letter-spacing:2px">${code}</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- ASESORA -->
  <tr><td style="padding:0 40px 28px">
    <div style="padding:16px 20px;border:1px solid #E8E0D0;border-left:3px solid #C9A84C;border-radius:2px;background:#FFFDF9">
      <span style="font-family:Arial,sans-serif;font-size:11px;color:#A0916E;letter-spacing:1px;text-transform:uppercase">Agendado por</span>
      <span style="font-family:Arial,sans-serif;font-size:14px;color:#0A0A0A;font-weight:700;margin-left:10px">${advisorName}</span>
    </div>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#0A0A0A;padding:24px 40px;text-align:center">
    <div style="font-family:Arial,sans-serif;font-size:11px;color:#C9A84C;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px">Esteticar</div>
    <div style="font-family:Arial,sans-serif;font-size:11px;color:#555;margin-bottom:4px">Cll 67 #9-26, La Sultana · Manizales, Colombia</div>
    <div style="font-family:Arial,sans-serif;font-size:11px;color:#444">www.esteticarmanizales.com</div>
  </td></tr>

</table>
</td></tr></table>
</body></html>
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
      if (diffDays >= 30) {
        const subject = `⏰ Recordatorio 20 días — ${client.name} (${diffDays}d)`;
        const whatsappMsg = encodeURIComponent(
          `${getGreeting()}, ${client.name} 👋 Te saluda el equipo de *Esteticar*.\n\nHan pasado ${diffDays} días desde el último tratamiento de tu vehículo — el momento ideal para renovar la protección y mantener ese acabado impecable.\n\n¿Te agendamos esta semana? ✨`
        );
        const whatsappUrl = `https://api.whatsapp.com/send/?phone=57${(client.phone || '').replace(/\D/g, '')}&text=${whatsappMsg}`;
        const html = `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Seguimiento cliente · Esteticar</title></head>
<body style="margin:0;padding:0;background:#F4F1EC;font-family:Georgia,serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1EC;padding:40px 16px">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#ffffff;border-radius:2px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.10)">

  <!-- HEADER -->
  <tr><td style="background:#0A0A0A;padding:36px 40px;text-align:center;border-bottom:3px solid #C9A84C">
    <img src="https://esteticar-vff.vercel.app/logo.png" alt="Esteticar" width="120" style="display:block;margin:0 auto 12px;height:auto" />
    <div style="color:#C9A84C;font-size:9px;letter-spacing:4px;font-family:Arial,sans-serif;font-weight:600;text-transform:uppercase">Custodia Vehicular Premium · Manizales</div>
  </td></tr>

  <!-- BADGE -->
  <tr><td style="background:#0A0A0A;padding:0 40px 28px;text-align:center">
    <div style="display:inline-block;background:#7C5C2E;color:#F8C840;font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;padding:7px 20px;border-radius:2px">${diffDays} días sin visita</div>
  </td></tr>

  <!-- INTRO -->
  <tr><td style="padding:36px 40px 0">
    <p style="margin:0;font-size:22px;color:#0A0A0A;font-weight:400;line-height:1.3">Momento de hacer seguimiento.</p>
    <p style="margin:10px 0 0;font-size:14px;color:#888;font-family:Arial,sans-serif;line-height:1.6">Este cliente lleva <strong style="color:#7C5C2E">${diffDays} días</strong> sin agendar un nuevo servicio. Es el momento ideal para reactivar la relación.</p>
    <div style="margin:24px 0 0;height:1px;background:linear-gradient(90deg,#C9A84C 0%,#f4f1ec 100%)"></div>
  </td></tr>

  <!-- DATA GRID -->
  <tr><td style="padding:28px 40px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="44%" style="padding:14px 16px;background:#FAF8F4;border-radius:2px 0 0 2px;font-family:Arial,sans-serif;font-size:10px;color:#A0916E;letter-spacing:2px;text-transform:uppercase;font-weight:600;vertical-align:middle">Cliente</td>
        <td style="padding:14px 16px;background:#FAF8F4;border-radius:0 2px 2px 0;font-size:15px;color:#0A0A0A;font-weight:600;vertical-align:middle">${client.name}</td>
      </tr>
      <tr><td colspan="2" style="height:4px"></td></tr>
      <tr>
        <td style="padding:14px 16px;background:#FAF8F4;font-family:Arial,sans-serif;font-size:10px;color:#A0916E;letter-spacing:2px;text-transform:uppercase;font-weight:600;vertical-align:middle">Teléfono</td>
        <td style="padding:14px 16px;background:#FAF8F4;font-size:15px;color:#0A0A0A;font-weight:600;vertical-align:middle">${client.phone}</td>
      </tr>
      <tr><td colspan="2" style="height:4px"></td></tr>
      <tr>
        <td style="padding:14px 16px;background:#FAF8F4;font-family:Arial,sans-serif;font-size:10px;color:#A0916E;letter-spacing:2px;text-transform:uppercase;font-weight:600;vertical-align:middle">Último servicio</td>
        <td style="padding:14px 16px;background:#FAF8F4;font-size:14px;color:#555;vertical-align:middle">${client.lastService}</td>
      </tr>
      <tr><td colspan="2" style="height:4px"></td></tr>
      <tr>
        <td style="padding:14px 16px;background:#FAF8F4;font-family:Arial,sans-serif;font-size:10px;color:#A0916E;letter-spacing:2px;text-transform:uppercase;font-weight:600;vertical-align:middle">Días sin visita</td>
        <td style="padding:14px 16px;background:#FAF8F4;font-size:15px;color:#7C5C2E;font-weight:700;font-family:Arial,sans-serif;vertical-align:middle">${diffDays} días</td>
      </tr>
    </table>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#0A0A0A;padding:24px 40px;text-align:center">
    <div style="font-family:Arial,sans-serif;font-size:11px;color:#C9A84C;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px">Esteticar</div>
    <div style="font-family:Arial,sans-serif;font-size:11px;color:#555;margin-bottom:4px">Cll 67 #9-26, La Sultana · Manizales, Colombia</div>
    <div style="font-family:Arial,sans-serif;font-size:11px;color:#444">www.esteticarmanizales.com</div>
  </td></tr>

</table>
</td></tr></table>
</body></html>
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
  return `https://wa.me/573156071041?text=${msg}`;
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
  send: async ({ to, subject, body, html }) => {
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'email',
          subject: subject || 'Recordatorio Esteticar',
          html: html || `<p>${body || ''}</p>`,
          to: to || undefined,
        }),
      });
      return res.ok;
    } catch { return false; }
  },
};
