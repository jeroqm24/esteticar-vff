import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../../lib/storage";

// ─── Helpers ──────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  return `hace ${d}d`;
}

function getDisplayName(conv) {
  if (conv.client_name) return conv.client_name;
  if (conv.phone && !conv.phone.startsWith("web_")) return conv.phone;
  return "Visitante web";
}

function getPreview(history) {
  if (!Array.isArray(history) || history.length === 0) return "Sin mensajes";
  const last = [...history].reverse().find(m => m.role === "user" || m.role === "admin");
  if (!last) return "Sin mensajes";
  const prefix = last.role === "admin" ? "Tú: " : "";
  const text = (last.content || "")
    .replace(/__BOOKING_CONFIRMED__[\s\S]*?__END_BOOKING__/g, "✅ Cita")
    .replace(/__ESCALATE__:[^\n]*/g, "")
    .replace(/__LEAD_TYPE__:[^\n]*/g, "")
    .replace(/__LEAD_STATUS__:[^\n]*/g, "")
    .replace(/__NAME__:[^\n]*/g, "")
    .replace(/__EMAIL__:[^\n]*/g, "")
    .replace(/__OBJECTION__:[^\n]*/g, "")
    .replace(/__CANCEL_BOOKING__/g, "")
    .trim();
  return prefix + text.slice(0, 65) + (text.length > 65 ? "…" : "");
}

function isWhatsApp(phone) {
  return phone && !phone.startsWith("web_");
}

function getUnreadCount(conv) {
  const key = `conv_seen_${conv.phone}`;
  const lastSeen = parseInt(localStorage.getItem(key) || "0");
  if (!Array.isArray(conv.history)) return 0;
  const lastUpdated = new Date(conv.updated_at || 0).getTime();
  if (lastUpdated <= lastSeen) return 0;
  return conv.history.filter(m => m.role === "user" && new Date(m.timestamp || 0).getTime() > lastSeen).length;
}

function markSeen(phone) {
  localStorage.setItem(`conv_seen_${phone}`, Date.now().toString());
}

const LEAD_CONFIG = {
  billetudo:   { label: "💸 Billetudo",   bg: "bg-amber-100",  text: "text-amber-700",  dot: "bg-amber-500" },
  analista:    { label: "📚 Analista",    bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500"  },
  embalado:    { label: "⚡ Embalado",    bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500"},
  regateador:  { label: "🫰 Regateador",  bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500"},
};

const REMARKETING_CONFIG = {
  efectivo:     { label: "Efectivo",      bg: "bg-emerald-100", text: "text-emerald-700" },
  converted:    { label: "Efectivo",      bg: "bg-emerald-100", text: "text-emerald-700" },
  potencial:    { label: "Potencial",     bg: "bg-orange-100",  text: "text-orange-700"  },
  desinteresado:{ label: "Desinteresado", bg: "bg-slate-100",   text: "text-slate-500"   },
};

function RemarkBadge({ status, size = "sm" }) {
  if (!status || !REMARKETING_CONFIG[status]) return null;
  const c = REMARKETING_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-ui ${size === "sm" ? "text-[9px]" : "text-[11px] px-2.5 py-1"} ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

const CANNED = [
  "Un momento, ya te confirmo esa información 🙏",
  "Claro, con gusto. Cuéntame qué tienes en mente.",
  "Para el registro, ¿me das tu nombre completo?",
  "Perfecto, quedamos así. Te esperamos.",
  "¿Me confirmas la placa del vehículo?",
  "Trabajamos con garantía y póliza de $5.000.000 activa durante el proceso.",
  "Tenemos disponibilidad esta semana. ¿Qué día te queda mejor?",
  "¿Tienes carro o moto?",
  "Te puedo agendar para mañana mismo si quieres.",
];

// ─── Sub-components ────────────────────────────────────────────────

function LeadBadge({ type, size = "sm" }) {
  if (!type || !LEAD_CONFIG[type]) return null;
  const c = LEAD_CONFIG[type];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-ui ${size === "sm" ? "text-[9px]" : "text-[11px] px-2.5 py-1"} ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function ChannelBadge({ phone }) {
  if (isWhatsApp(phone)) {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-ui text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.556 4.112 1.524 5.84L0 24l6.364-1.498A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.79 9.79 0 01-5.003-1.374l-.36-.213-3.714.875.936-3.617-.235-.372A9.789 9.789 0 012.182 12c0-5.418 4.4-9.818 9.818-9.818 5.418 0 9.818 4.4 9.818 9.818 0 5.418-4.4 9.818-9.818 9.818z"/></svg>
        WhatsApp
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-ui text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded-full">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
      Web
    </span>
  );
}

function MessageBubble({ msg }) {
  const isUser  = msg.role === "user";
  const isAdmin = msg.role === "admin";
  const isBot   = msg.role === "assistant";

  const clean = (msg.content || "")
    .replace(/__BOOKING_CONFIRMED__[\s\S]*?__END_BOOKING__/g, "✅ Cita confirmada")
    .replace(/__ESCALATE__:[^\n]*/g, "")
    .replace(/__LEAD_TYPE__:[^\n]*/g, "")
    .replace(/__LEAD_STATUS__:[^\n]*/g, "")
    .replace(/__NAME__:[^\n]*/g, "")
    .replace(/__EMAIL__:[^\n]*/g, "")
    .replace(/__OBJECTION__:[^\n]*/g, "")
    .replace(/__CANCEL_BOOKING__/g, "")
    .trim();

  if (!clean) return null;

  if (isUser) {
    return (
      <div className="flex justify-end mb-1.5">
        <div className="max-w-[75%] px-3 py-2 rounded-2xl rounded-br-sm text-[13px] leading-relaxed bg-[#D9FDD3] text-[#111B21]">
          {clean}
          <div className="text-[10px] mt-0.5 text-right text-[#8696A0]">
            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : ""}
          </div>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="flex justify-end mb-1.5">
        <div className="max-w-[75%] px-3 py-2 rounded-2xl rounded-br-sm text-[13px] leading-relaxed bg-[#E3E8FF] text-[#1e2a6a] border border-indigo-200">
          <div className="text-[9px] font-ui font-bold text-indigo-500 mb-1 uppercase tracking-wider">Admin</div>
          {clean}
          <div className="text-[10px] mt-0.5 text-right text-indigo-400">
            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : ""}
          </div>
        </div>
      </div>
    );
  }

  // Bot
  return (
    <div className="flex justify-start mb-1.5">
      <div className="max-w-[75%] px-3 py-2 rounded-2xl rounded-bl-sm text-[13px] leading-relaxed bg-white text-[#111B21] shadow-sm">
        {clean}
        <div className="text-[10px] mt-0.5 text-[#8696A0]">
          {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : ""} · Sara
        </div>
      </div>
    </div>
  );
}

function DeleteModal({ conv, onConfirm, onCancel }) {
  const [text, setText] = useState("");
  const valid = text === "ELIMINAR";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-sm shadow-2xl w-full max-w-sm p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </div>
          <div>
            <p className="font-ui text-[12px] font-semibold text-ec-dark">Eliminar conversación</p>
            <p className="font-body text-[11px] text-ec-text-muted">{getDisplayName(conv)}</p>
          </div>
        </div>
        <p className="font-body text-[12px] text-ec-text-muted mb-4 leading-relaxed">
          Esta acción es irreversible. Todo el historial de mensajes y datos de este contacto serán eliminados permanentemente.
        </p>
        <p className="font-ui text-[11px] text-ec-dark mb-2">Escribe <strong>ELIMINAR</strong> para confirmar:</p>
        <input
          autoFocus
          value={text}
          onChange={e => setText(e.target.value.toUpperCase())}
          placeholder="ELIMINAR"
          className="w-full px-3 py-2 border border-black/[0.1] rounded-sm font-ui text-sm bg-ec-cream focus:border-red-400 focus:outline-none mb-4 tracking-widest"
        />
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-black/[0.1] rounded-sm font-ui text-[11px] text-ec-text-muted hover:bg-ec-cream transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => valid && onConfirm()}
            disabled={!valid}
            className="flex-1 py-2.5 rounded-sm font-ui text-[11px] font-bold text-white transition-all"
            style={{ background: valid ? "#ef4444" : "#ccc", cursor: valid ? "pointer" : "not-allowed" }}
          >
            Eliminar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function InfoSidebar({ conv, appointments }) {
  const fields = [
    { label: "Teléfono", value: isWhatsApp(conv.phone) ? conv.phone : null },
    { label: "Email", value: conv.client_email },
    { label: "Vehículo", value: conv.vehicle_type },
    { label: "Placa", value: conv.vehicle_plate },
    { label: "Último servicio", value: conv.last_service },
    { label: "Dirección", value: conv.direccion },
    { label: "Objeción", value: conv.objection },
    { label: "Remarketing", value: conv.remarketing_status },
  ].filter(f => f.value);

  const apptCount = appointments?.filter(a =>
    a.clientPhone === conv.phone || a.client_phone === conv.phone
  ).length || 0;

  return (
    <div className="w-64 xl:w-72 flex-shrink-0 border-l border-black/[0.06] bg-white overflow-y-auto">
      <div className="p-4 border-b border-black/[0.06]">
        <div className="w-12 h-12 rounded-full bg-ec-gold/20 flex items-center justify-center mx-auto mb-3">
          <span className="font-heading text-xl text-ec-gold">{getDisplayName(conv).charAt(0).toUpperCase()}</span>
        </div>
        <p className="font-ui text-[12px] font-semibold text-ec-dark text-center">{getDisplayName(conv)}</p>
        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
          <ChannelBadge phone={conv.phone} />
          {conv.lead_type && <LeadBadge type={conv.lead_type} />}
          {conv.remarketing_status && <RemarkBadge status={conv.remarketing_status} size="md" />}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {apptCount > 0 && (
          <div className="p-3 rounded-sm bg-ec-gold/[0.08] border border-ec-gold/20">
            <p className="font-ui text-[10px] tracking-widest text-ec-gold uppercase mb-1">Citas registradas</p>
            <p className="font-heading text-2xl text-ec-dark">{apptCount}</p>
          </div>
        )}

        {fields.length > 0 && (
          <div className="space-y-2">
            <p className="font-ui text-[9px] tracking-[0.3em] text-ec-text-muted uppercase">Datos del cliente</p>
            {fields.map(f => (
              <div key={f.label} className="flex flex-col gap-0.5">
                <span className="font-ui text-[9px] text-ec-text-muted uppercase tracking-wider">{f.label}</span>
                <span className="font-body text-[11px] text-ec-dark break-words">{f.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-1.5 pt-2 border-t border-black/[0.06]">
          <p className="font-ui text-[9px] tracking-[0.3em] text-ec-text-muted uppercase">Actividad</p>
          <div className="flex justify-between">
            <span className="font-body text-[11px] text-ec-text-muted">Mensajes</span>
            <span className="font-ui text-[11px] font-semibold text-ec-dark">{Array.isArray(conv.history) ? conv.history.length : 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-body text-[11px] text-ec-text-muted">Primera visita</span>
            <span className="font-ui text-[11px] text-ec-dark">{conv.created_at ? new Date(conv.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short" }) : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-body text-[11px] text-ec-text-muted">Última actividad</span>
            <span className="font-ui text-[11px] text-ec-dark">{timeAgo(conv.updated_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────
const FILTERS = [
  { id: "all",          label: "Todos" },
  { id: "efectivo",     label: "✅ Efectivos" },
  { id: "potencial",    label: "🔥 Potenciales" },
  { id: "desinteresado",label: "💤 Desinteresados" },
  { id: "leads",        label: "Leads clasificados" },
  { id: "paused",       label: "⏸ Pausados" },
];

export default function AdminConversations({ initialPhone }) {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showInfo, setShowInfo] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [showCanned, setShowCanned] = useState(false);
  const [updatingLead, setUpdatingLead] = useState(false);
  const bottomRef = useRef(null);
  const replyRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await db.conversations.list();
    setConversations(data);
    if (selected) {
      const updated = data.find(c => c.phone === selected.phone);
      if (updated) setSelected(updated);
    } else if (initialPhone) {
      const match = data.find(c => c.phone === initialPhone);
      if (match) setSelected(match);
    }
    setLoading(false);
    return data;
  }, [selected?.phone, initialPhone]);

  useEffect(() => {
    load().then(data => {
      const params = new URLSearchParams(window.location.search);
      const convPhone = params.get("conv");
      if (convPhone && data) {
        const found = data.find(c => c.phone === convPhone);
        if (found) {
          setSelected(found);
          markSeen(found.phone);
        }
        window.history.replaceState({}, "", window.location.pathname);
      }
    });
  }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.history?.length]);

  const selectConversation = (conv) => {
    setSelected(conv);
    setShowInfo(false);
    markSeen(conv.phone);
    setConversations(prev => prev.map(c => c.phone === conv.phone ? { ...c, _seen: true } : c));
  };

  const handleToggleBot = async () => {
    if (!selected) return;
    const newPaused = !selected.bot_paused;
    setSelected(prev => ({ ...prev, bot_paused: newPaused }));
    setConversations(prev => prev.map(c => c.phone === selected.phone ? { ...c, bot_paused: newPaused } : c));
    await db.conversations.update(selected.phone, { bot_paused: newPaused });
  };

  const handleLeadChange = async (leadType) => {
    if (!selected) return;
    setUpdatingLead(true);
    setSelected(prev => ({ ...prev, lead_type: leadType || null }));
    setConversations(prev => prev.map(c => c.phone === selected.phone ? { ...c, lead_type: leadType || null } : c));
    await db.conversations.update(selected.phone, { lead_type: leadType || null });
    setUpdatingLead(false);
  };

  const handleSend = async () => {
    if (!replyText.trim() || !selected || sending) return;
    const text = replyText.trim();
    setReplyText("");
    setSending(true);
    setShowCanned(false);

    // Optimistically add to UI
    const optimistic = { role: "admin", content: text, timestamp: new Date().toISOString() };
    const newHistory = [...(Array.isArray(selected.history) ? selected.history : []), optimistic];
    setSelected(prev => ({ ...prev, history: newHistory }));
    setConversations(prev => prev.map(c => c.phone === selected.phone ? { ...c, history: newHistory, updated_at: new Date().toISOString() } : c));

    await db.conversations.sendMessage(selected.phone, text);
    setSending(false);
    setTimeout(() => replyRef.current?.focus(), 100);
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    const phone = deleteModal.phone;
    await db.conversations.delete(phone);
    setConversations(prev => prev.filter(c => c.phone !== phone));
    if (selected?.phone === phone) setSelected(null);
    setDeleteModal(null);
  };

  const filtered = conversations.filter(c => {
    const name = getDisplayName(c).toLowerCase();
    const q = search.toLowerCase();
    const matchSearch = name.includes(q) || (c.phone || "").includes(q);
    if (!matchSearch) return false;
    if (filter === "paused")       return !!c.bot_paused;
    if (filter === "leads")        return !!c.lead_type;
    if (filter === "efectivo")     return c.remarketing_status === "efectivo" || c.remarketing_status === "converted";
    if (filter === "potencial")    return c.remarketing_status === "potencial";
    if (filter === "desinteresado")return c.remarketing_status === "desinteresado";
    return true;
  });

  const selectedHistory = Array.isArray(selected?.history) ? selected.history : [];

  return (
    <div className="flex flex-col h-[calc(100dvh-10rem)] min-h-[500px] rounded-sm overflow-hidden border border-black/[0.06] shadow-sm">

      <AnimatePresence>
        {deleteModal && (
          <DeleteModal
            conv={deleteModal}
            onConfirm={handleDelete}
            onCancel={() => setDeleteModal(null)}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Lista de conversaciones ── */}
        <div className={`${selected ? "hidden lg:flex" : "flex"} w-full lg:w-80 xl:w-96 flex-shrink-0 flex-col border-r border-black/[0.06] bg-white`}>
          {/* Header */}
          <div className="p-4 border-b border-black/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading text-lg text-ec-dark">Conversaciones</h2>
              <button onClick={load} className="text-ec-text-muted hover:text-ec-gold transition-colors" title="Recargar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
              </button>
            </div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o teléfono…"
              className="w-full px-3 py-2 text-sm border border-black/[0.08] rounded-sm bg-ec-cream focus:border-ec-gold focus:outline-none font-body"
            />
            {/* Filter tabs */}
            <div className="flex gap-1 mt-3 overflow-x-auto pb-0.5">
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-full font-ui text-[10px] whitespace-nowrap transition-colors ${
                    filter === f.id
                      ? "bg-ec-dark text-white"
                      : "bg-ec-cream text-ec-text-muted hover:bg-ec-gold/10 hover:text-ec-gold"
                  }`}
                >
                  {f.label}
                  {f.id !== "all" && (() => {
                    const fn = c => {
                      if (f.id === "paused")       return !!c.bot_paused;
                      if (f.id === "leads")        return !!c.lead_type;
                      if (f.id === "efectivo")     return c.remarketing_status === "efectivo" || c.remarketing_status === "converted";
                      if (f.id === "potencial")    return c.remarketing_status === "potencial";
                      if (f.id === "desinteresado")return c.remarketing_status === "desinteresado";
                      return false;
                    };
                    const n = conversations.filter(fn).length;
                    return n > 0 ? <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/20 text-[8px]">{n}</span> : null;
                  })()}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-ec-text-muted text-sm font-body">Cargando…</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-ec-text-muted">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <span className="text-sm font-body">Sin conversaciones</span>
              </div>
            ) : filtered.map(conv => {
              const isActive = selected?.phone === conv.phone;
              const unread = getUnreadCount(conv);
              const msgCount = Array.isArray(conv.history) ? conv.history.length : 0;
              return (
                <button
                  key={conv.phone}
                  onClick={() => selectConversation(conv)}
                  className={`w-full text-left px-4 py-3 border-b border-black/[0.04] transition-colors group relative ${
                    isActive ? "bg-ec-gold/[0.08] border-l-2 border-l-ec-gold" : "hover:bg-ec-cream"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-9 h-9 rounded-full bg-ec-cream flex items-center justify-center font-heading text-sm text-ec-dark border border-black/[0.06]">
                        {getDisplayName(conv).charAt(0).toUpperCase()}
                      </div>
                      <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${conv.bot_paused ? "bg-orange-400" : "bg-emerald-500"}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={`font-ui text-[12px] font-semibold truncate ${unread > 0 ? "text-ec-dark" : "text-ec-dark/80"}`}>
                          {getDisplayName(conv)}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {unread > 0 && (
                            <span className="w-4 h-4 rounded-full bg-ec-gold flex items-center justify-center text-[9px] text-white font-bold">{unread}</span>
                          )}
                          <span className="text-[10px] text-ec-text-muted font-ui">{timeAgo(conv.updated_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <ChannelBadge phone={conv.phone} />
                        {conv.lead_type && <LeadBadge type={conv.lead_type} />}
                        {conv.bot_paused && (
                          <span className="text-[9px] font-ui text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">⏸ Pausado</span>
                        )}
                        {conv.remarketing_status && <RemarkBadge status={conv.remarketing_status} />}
                      </div>
                      <p className="text-[11px] text-ec-text-muted font-body truncate">{getPreview(conv.history)}</p>
                    </div>
                  </div>

                  {/* Delete — only on hover, hidden to prevent accidental tap */}
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteModal(conv); }}
                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600"
                    title="Eliminar"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Panel de conversación ── */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#efeae2]">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-ec-text-muted">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <p className="font-body text-sm">Selecciona una conversación</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-2.5 bg-[#128C7E] flex-shrink-0 flex-wrap gap-y-2">
                {/* Back button (mobile) */}
                <button onClick={() => setSelected(null)} className="lg:hidden text-white/80 hover:text-white mr-1">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                </button>

                {/* Avatar + name */}
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {getDisplayName(selected).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-[13px] leading-tight truncate">{getDisplayName(selected)}</p>
                  <p className="text-white/70 text-[10px]">{selectedHistory.length} mensajes · {timeAgo(selected.updated_at)}</p>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2 flex-shrink-0">

                  {/* Lead type selector */}
                  <div className="relative">
                    <select
                      value={selected.lead_type || ""}
                      onChange={e => handleLeadChange(e.target.value)}
                      disabled={updatingLead}
                      className="text-[10px] font-ui bg-white/15 text-white border border-white/20 rounded-full px-2.5 py-1 focus:outline-none focus:border-white/50 cursor-pointer appearance-none"
                      style={{ paddingRight: "1.5rem" }}
                    >
                      <option value="" style={{ color: "#111", background: "#fff" }}>Sin clasificar</option>
                      <option value="billetudo"  style={{ color: "#111", background: "#fff" }}>💸 Billetudo</option>
                      <option value="analista"   style={{ color: "#111", background: "#fff" }}>📚 Analista</option>
                      <option value="embalado"   style={{ color: "#111", background: "#fff" }}>⚡ Embalado</option>
                      <option value="regateador" style={{ color: "#111", background: "#fff" }}>🫰 Regateador</option>
                    </select>
                    <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>

                  {/* Bot toggle */}
                  <button
                    onClick={handleToggleBot}
                    title={selected.bot_paused ? "Reanudar bot" : "Pausar bot"}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-ui font-bold transition-all ${
                      selected.bot_paused
                        ? "bg-orange-400 text-white hover:bg-orange-300"
                        : "bg-white/15 text-white hover:bg-white/25 border border-white/20"
                    }`}
                  >
                    {selected.bot_paused ? (
                      <><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Reanudar</>
                    ) : (
                      <><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pausar bot</>
                    )}
                  </button>

                  {/* Info panel toggle */}
                  <button
                    onClick={() => setShowInfo(v => !v)}
                    title="Ver datos del cliente"
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${showInfo ? "bg-white/30 text-white" : "text-white/60 hover:text-white hover:bg-white/15"}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </button>
                </div>
              </div>

              {/* Bot paused notice */}
              {selected.bot_paused && (
                <div className="bg-orange-50 border-b border-orange-200 px-4 py-2 flex items-center gap-2 flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  <p className="font-ui text-[11px] text-orange-700">Bot pausado — estás en control. Los mensajes de Sara no se enviarán hasta que lo reanudes.</p>
                </div>
              )}

              {/* Messages + sidebar */}
              <div className="flex flex-1 min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-4 py-3">
                  {selectedHistory.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
                  <div ref={bottomRef} />
                </div>
                <AnimatePresence>
                  {showInfo && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: "auto", opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden flex-shrink-0"
                    >
                      <InfoSidebar conv={selected} appointments={[]} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Reply bar */}
              <div className="flex-shrink-0 bg-[#F0F2F5] border-t border-black/[0.06]">
                {/* Canned responses */}
                <AnimatePresence>
                  {showCanned && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pt-2 pb-1 flex flex-wrap gap-1.5">
                        <p className="w-full font-ui text-[9px] tracking-widest text-ec-text-muted uppercase mb-0.5">Respuestas rápidas</p>
                        {CANNED.map(r => (
                          <button
                            key={r}
                            onClick={() => { setReplyText(r); setShowCanned(false); replyRef.current?.focus(); }}
                            className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-black/[0.08] text-ec-dark hover:border-ec-gold hover:bg-ec-gold/5 transition-colors font-body"
                          >
                            {r.length > 45 ? r.slice(0, 45) + "…" : r}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-end gap-2 px-3 py-2">
                  {/* Canned toggle */}
                  <button
                    onClick={() => setShowCanned(v => !v)}
                    title="Respuestas rápidas"
                    className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full transition-colors ${showCanned ? "bg-ec-gold text-white" : "text-ec-text-muted hover:text-ec-gold bg-white border border-black/[0.08]"}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
                  </button>

                  <textarea
                    ref={replyRef}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder={selected.bot_paused ? "Escribe tu respuesta (Ctrl+Enter para enviar)…" : "Escribe una respuesta (el bot seguirá activo)…"}
                    rows={1}
                    className="flex-1 px-3 py-2 text-[13px] rounded-2xl border border-black/[0.08] bg-white focus:border-[#128C7E] focus:outline-none font-body resize-none leading-relaxed"
                    style={{ minHeight: "36px", maxHeight: "120px", overflow: "auto" }}
                  />

                  <button
                    onClick={handleSend}
                    disabled={!replyText.trim() || sending}
                    className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full transition-all"
                    style={{ background: replyText.trim() && !sending ? "#128C7E" : "#ccc" }}
                    title={isWhatsApp(selected.phone) ? "Enviar por WhatsApp" : "Enviar (se guardará en el historial)"}
                  >
                    {sending
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    }
                  </button>
                </div>

                {!isWhatsApp(selected.phone) && (
                  <p className="px-4 pb-1.5 font-ui text-[9px] text-ec-text-muted text-center">
                    Chat web — tu respuesta se guardará en el historial pero el visitante no la verá en tiempo real
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
