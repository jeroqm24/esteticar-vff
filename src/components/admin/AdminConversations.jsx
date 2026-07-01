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
  if (last.audioUrl) return prefix + "🎵 Audio";
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

function getChannel(phone) {
  if (!phone) return "web";
  if (phone.startsWith("ig_")) return "instagram";
  if (phone.startsWith("fb_")) return "facebook";
  if (phone.startsWith("web_")) return "web";
  return "whatsapp";
}

function isWhatsApp(phone) {
  return getChannel(phone) === "whatsapp";
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
  otro:         { label: "Otro",          bg: "bg-gray-100",    text: "text-gray-500"    },
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
  const ch = getChannel(phone);
  if (ch === "whatsapp") return (
    <span className="inline-flex items-center gap-1 text-[9px] font-ui text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.556 4.112 1.524 5.84L0 24l6.364-1.498A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.79 9.79 0 01-5.003-1.374l-.36-.213-3.714.875.936-3.617-.235-.372A9.789 9.789 0 012.182 12c0-5.418 4.4-9.818 9.818-9.818 5.418 0 9.818 4.4 9.818 9.818 0 5.418-4.4 9.818-9.818 9.818z"/></svg>
      WhatsApp
    </span>
  );
  if (ch === "instagram") return (
    <span className="inline-flex items-center gap-1 text-[9px] font-ui text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded-full">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
      Instagram
    </span>
  );
  if (ch === "facebook") return (
    <span className="inline-flex items-center gap-1 text-[9px] font-ui text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
      Facebook
    </span>
  );
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

  // Cliente → izquierda
  if (isUser) {
    return (
      <div className="flex justify-start mb-1.5">
        <div className="max-w-[75%] px-3 py-2 rounded-2xl rounded-bl-sm text-[13px] leading-relaxed bg-[#F0F0F0] text-[#111B21]">
          {clean}
          <div className="text-[10px] mt-0.5 text-[#8696A0]">
            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : ""}
          </div>
        </div>
      </div>
    );
  }

  // Admin → derecha
  if (isAdmin) {
    const ts = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : "";
    if (msg.audioUrl) {
      return (
        <div className="flex justify-end mb-1.5">
          <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-br-sm bg-[#E3E8FF] border border-indigo-200">
            <div className="text-[9px] font-ui font-bold text-indigo-500 mb-1 uppercase tracking-wider">Admin</div>
            <audio controls src={msg.audioUrl} className="h-9 max-w-[220px]" />
            <div className="text-[10px] mt-0.5 text-right text-indigo-400">{ts}</div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex justify-end mb-1.5">
        <div className="max-w-[75%] px-3 py-2 rounded-2xl rounded-br-sm text-[13px] leading-relaxed bg-[#E3E8FF] text-[#1e2a6a] border border-indigo-200">
          <div className="text-[9px] font-ui font-bold text-indigo-500 mb-1 uppercase tracking-wider">Admin</div>
          {clean}
          <div className="text-[10px] mt-0.5 text-right text-indigo-400">{ts}</div>
        </div>
      </div>
    );
  }

  // Bot → derecha
  return (
    <div className="flex justify-end mb-1.5">
      <div className="max-w-[75%] px-3 py-2 rounded-2xl rounded-br-sm text-[13px] leading-relaxed bg-[#D9FDD3] text-[#111B21]">
        {clean}
        <div className="text-[10px] mt-0.5 text-right text-[#8696A0]">
          {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : ""} · Isabella
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
  const [resolving, setResolving] = useState(false);
  const bottomRef = useRef(null);
  const replyRef = useRef(null);
  const sendingRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const [sendingAudio, setSendingAudio] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleResolved = async () => {
    if (!selected || resolving) return;
    setResolving(true);
    const clientName = selected.client_name || selected.phone;
    const msg = `✅ SOLICITUD RESUELTA\n👤 Cliente: ${clientName}\n\nLa escalación fue atendida y resuelta por el equipo.`;
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'telegram', message: msg }),
      });
    } catch (_) {}
    setResolving(false);
  };

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const data = await db.conversations.list();
    setConversations(data);
    if (selected) {
      const updated = data.find(c => c.phone === selected.phone);
      if (updated) setSelected(updated);
    } else if (initialPhone) {
      const match = data.find(c => c.phone === initialPhone);
      if (match) setSelected(match);
    }
    if (!silent) setLoading(false);
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

  // Auto-refresh every 6s (silent — no loading flicker)
  useEffect(() => {
    const interval = setInterval(() => load(true), 6000);
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

    // When resuming: if last message is from client (unanswered), trigger the bot immediately
    if (!newPaused) {
      const hist = selected.history || [];
      const lastMsg = hist[hist.length - 1];
      if (lastMsg && lastMsg.role === 'user') {
        setTimeout(async () => {
          try {
            await fetch('/api/process-pending', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone: selected.phone }),
            });
          } catch (_) {}
          await load();
        }, 800);
      }
    }
  };

  const handleLeadChange = async (leadType) => {
    if (!selected) return;
    setUpdatingLead(true);
    setSelected(prev => ({ ...prev, lead_type: leadType || null }));
    setConversations(prev => prev.map(c => c.phone === selected.phone ? { ...c, lead_type: leadType || null } : c));
    await db.conversations.update(selected.phone, { lead_type: leadType || null });
    setUpdatingLead(false);
  };

  const handleRemarkChange = async (status) => {
    if (!selected) return;
    const val = status || null;
    setSelected(prev => ({ ...prev, remarketing_status: val }));
    setConversations(prev => prev.map(c => c.phone === selected.phone ? { ...c, remarketing_status: val } : c));
    await db.conversations.update(selected.phone, { remarketing_status: val });
  };

  const handleSend = async () => {
    if (!replyText.trim() || !selected || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    const text = replyText.trim();
    setReplyText("");
    setShowCanned(false);

    // Optimistically add to UI
    const optimistic = { role: "admin", content: text, timestamp: new Date().toISOString() };
    const newHistory = [...(Array.isArray(selected.history) ? selected.history : []), optimistic];
    setSelected(prev => ({ ...prev, history: newHistory }));
    setConversations(prev => prev.map(c => c.phone === selected.phone ? { ...c, history: newHistory, updated_at: new Date().toISOString() } : c));

    await db.conversations.sendMessage(selected.phone, text);
    sendingRef.current = false;
    setSending(false);
    setTimeout(() => replyRef.current?.focus(), 100);
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/ogg; codecs=opus')
        ? 'audio/ogg; codecs=opus'
        : 'audio/webm; codecs=opus';
      const mr = new MediaRecorder(stream, { mimeType });
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType.split(';')[0] });
        setAudioBlob(blob);
        setAudioPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch { /* mic not available or permission denied */ }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleCancelAudio = () => {
    if (isRecording) { mediaRecorderRef.current?.stop(); setIsRecording(false); }
    setAudioBlob(null);
    setAudioPreviewUrl(null);
  };

  const handleSendAudio = async () => {
    if (!audioBlob || !selected || sendingRef.current) return;
    sendingRef.current = true;
    setSendingAudio(true);
    const blob = audioBlob;
    const previewUrl = audioPreviewUrl;
    setAudioBlob(null);
    setAudioPreviewUrl(null);

    const optimistic = { role: 'admin', content: '🎵 Audio', audioUrl: previewUrl || '', timestamp: new Date().toISOString() };
    const newHistory = [...(Array.isArray(selected.history) ? selected.history : []), optimistic];
    setSelected(prev => ({ ...prev, history: newHistory }));
    setConversations(prev => prev.map(c => c.phone === selected.phone ? { ...c, history: newHistory, updated_at: new Date().toISOString() } : c));

    const result = await db.conversations.sendAudio(selected.phone, blob);
    if (result?.audioUrl) {
      setSelected(prev => ({
        ...prev,
        history: (prev.history || []).map(m => m === optimistic ? { ...m, audioUrl: result.audioUrl } : m),
      }));
    }
    sendingRef.current = false;
    setSendingAudio(false);
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
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden lg:rounded-sm lg:border lg:border-black/[0.06] lg:shadow-sm">

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
          <div className="px-4 pt-4 pb-3 border-b border-black/[0.06] bg-white">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading text-[17px] text-ec-dark">Conversaciones</h2>
              <button onClick={load} className="w-8 h-8 flex items-center justify-center text-ec-text-muted active:text-ec-gold rounded-full active:bg-ec-cream" title="Recargar">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
              </button>
            </div>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-ec-text-muted pointer-events-none" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre o teléfono…"
                className="w-full pl-9 pr-3 py-2.5 border border-black/[0.08] rounded-xl bg-[#F0F2F5] focus:border-ec-gold focus:outline-none font-body"
                style={{ fontSize: '16px' }}
              />
            </div>
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
                  className={`w-full text-left px-4 py-3.5 border-b border-black/[0.05] transition-colors group relative ${
                    isActive ? "bg-ec-gold/[0.08] border-l-[3px] border-l-ec-gold" : "active:bg-ec-cream"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-ec-gold/30 to-ec-gold/10 flex items-center justify-center font-heading text-base text-ec-dark">
                        {getDisplayName(conv).charAt(0).toUpperCase()}
                      </div>
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${conv.bot_paused ? "bg-orange-400" : "bg-emerald-500"}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Fila 1: nombre + tiempo */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`font-ui text-[13px] font-semibold truncate ${unread > 0 ? "text-ec-dark" : "text-ec-dark/80"}`}>
                          {getDisplayName(conv)}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {unread > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-ec-gold flex items-center justify-center text-[10px] text-white font-bold">{unread}</span>
                          )}
                          <span className="text-[11px] text-ec-text-muted font-ui whitespace-nowrap">{timeAgo(conv.updated_at)}</span>
                        </div>
                      </div>
                      {/* Fila 2: canal + pausado */}
                      <div className="flex items-center gap-1.5 mb-1">
                        <ChannelBadge phone={conv.phone} />
                        {conv.bot_paused && (
                          <span className="text-[9px] font-ui text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">⏸ Pausado</span>
                        )}
                      </div>
                      {/* Fila 3: tipo de lead + estado */}
                      {(conv.lead_type || conv.remarketing_status) && (
                        <div className="flex items-center gap-1.5 mb-1">
                          {conv.lead_type && <LeadBadge type={conv.lead_type} />}
                          {conv.remarketing_status && <RemarkBadge status={conv.remarketing_status} />}
                        </div>
                      )}
                      {/* Fila 4: preview */}
                      <p className="text-[12px] text-ec-text-muted font-body truncate leading-snug">{getPreview(conv.history)}</p>
                    </div>
                  </div>

                  {/* Delete — siempre visible en móvil, hover en desktop */}
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteModal(conv); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-600 rounded-full hover:bg-red-50"
                    title="Eliminar"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Panel de conversación ── */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#efeae2]">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-ec-text-muted px-8 text-center">
              <div className="w-20 h-20 rounded-full bg-ec-gold/10 flex items-center justify-center">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div>
                <p className="font-ui text-[13px] font-semibold text-ec-dark mb-1">Ninguna conversación activa</p>
                <p className="font-body text-[12px]">Selecciona un chat de la lista para responder</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-[#075E54] flex-shrink-0 px-3 pt-2.5 pb-2">
                {/* Fila 1: back + avatar + nombre + info */}
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setSelected(null)}
                    className="lg:hidden w-8 h-8 flex items-center justify-center text-white/80 active:text-white flex-shrink-0 -ml-1"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                  </button>
                  <div className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {getDisplayName(selected).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-[14px] leading-tight truncate">{getDisplayName(selected)}</p>
                    {(() => {
                      const lastUserMsg = [...selectedHistory].reverse().find(m => m.role === 'user');
                      const daysSilent = lastUserMsg?.timestamp
                        ? Math.floor((Date.now() - new Date(lastUserMsg.timestamp).getTime()) / 86400000)
                        : null;
                      return (
                        <p className="text-white/60 text-[11px] mt-0.5 flex items-center gap-2">
                          <span>{selectedHistory.length} msgs · {timeAgo(selected.updated_at)}</span>
                          {daysSilent !== null && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-ui font-semibold ${
                              daysSilent >= 20 ? 'bg-red-500/80 text-white' :
                              daysSilent >= 7  ? 'bg-amber-400/80 text-white' :
                                                 'bg-white/15 text-white/80'
                            }`}>
                              {daysSilent === 0 ? 'Hoy' : `${daysSilent}d sin escribir`}
                            </span>
                          )}
                        </p>
                      );
                    })()}
                  </div>
                  <button
                    onClick={() => setShowInfo(v => !v)}
                    title="Ver datos del cliente"
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${showInfo ? "bg-white/25 text-white" : "text-white/60 active:text-white active:bg-white/15"}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </button>
                </div>

                {/* Fila 2: controles — scroll horizontal, nunca wrappea */}
                <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
                  {/* Lead type */}
                  <div className="relative">
                    <select
                      value={selected.lead_type || ""}
                      onChange={e => handleLeadChange(e.target.value)}
                      disabled={updatingLead}
                      className="text-[10px] font-ui bg-white/15 text-white border border-white/20 rounded-full px-2.5 py-1 focus:outline-none cursor-pointer appearance-none"
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

                  {/* Remarketing status */}
                  <div className="relative">
                    <select
                      value={selected.remarketing_status || ""}
                      onChange={e => handleRemarkChange(e.target.value)}
                      className="text-[10px] font-ui bg-white/15 text-white border border-white/20 rounded-full px-2.5 py-1 focus:outline-none cursor-pointer appearance-none"
                      style={{ paddingRight: "1.5rem" }}
                    >
                      <option value="" style={{ color: "#111", background: "#fff" }}>Sin estado</option>
                      <option value="potencial"     style={{ color: "#111", background: "#fff" }}>🔵 Potencial</option>
                      <option value="efectivo"      style={{ color: "#111", background: "#fff" }}>🟢 Efectivo</option>
                      <option value="desinteresado" style={{ color: "#111", background: "#fff" }}>⚫ Desinteresado</option>
                      <option value="otro"          style={{ color: "#111", background: "#fff" }}>⚪ Otro</option>
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

                  {/* Solicitud resuelta */}
                  {selectedHistory.some(m => m.role === 'admin') && (
                    <button
                      onClick={handleResolved}
                      disabled={resolving}
                      title="Notificar al grupo que la solicitud fue resuelta"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-ui font-bold transition-all bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-50"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      {resolving ? "Enviando..." : "Solicitud resuelta"}
                    </button>
                  )}
                </div>
              </div>

              {/* Bot paused notice */}
              {selected.bot_paused && (
                <div className="bg-orange-50 border-b border-orange-200 px-4 py-2 flex items-center gap-2 flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  <p className="font-ui text-[11px] text-orange-700">Bot pausado — estás en control. Los mensajes de Isabella no se enviarán hasta que lo reanudes.</p>
                </div>
              )}

              {/* Messages + sidebar */}
              <div className="flex flex-1 min-h-0 overflow-hidden relative">
                <div className="flex-1 overflow-y-auto px-4 py-3">
                  {selectedHistory.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
                  <div ref={bottomRef} />
                </div>

                {/* Info panel: slide-over on mobile, inline on desktop */}
                <AnimatePresence>
                  {showInfo && (
                    <>
                      {/* Mobile: backdrop */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="lg:hidden absolute inset-0 z-40 bg-black/40 backdrop-blur-sm"
                        onClick={() => setShowInfo(false)}
                      />
                      {/* Mobile: slide-over panel */}
                      <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 260 }}
                        className="lg:hidden absolute right-0 top-0 bottom-0 z-50 w-4/5 max-w-xs shadow-2xl overflow-hidden"
                      >
                        <InfoSidebar conv={selected} appointments={[]} />
                      </motion.div>
                      {/* Desktop: inline sidebar */}
                      <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "auto", opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="hidden lg:block overflow-hidden flex-shrink-0"
                      >
                        <InfoSidebar conv={selected} appointments={[]} />
                      </motion.div>
                    </>
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

                {/* Audio preview bar */}
                {audioPreviewUrl && !isRecording && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border-t border-indigo-100">
                    <audio controls src={audioPreviewUrl} className="flex-1 h-9" />
                    <button
                      onClick={handleSendAudio}
                      disabled={sendingAudio}
                      className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full transition-all active:scale-95"
                      style={{ background: sendingAudio ? "#CBD5E1" : "#075E54" }}
                      title="Enviar audio"
                    >
                      {sendingAudio
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                      }
                    </button>
                    <button
                      onClick={handleCancelAudio}
                      className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-white border border-black/[0.08] text-ec-text-muted hover:text-red-500 transition-colors"
                      title="Cancelar"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                )}

                <div className="flex items-end gap-2 px-3 py-2.5">
                  {/* Canned toggle */}
                  <button
                    onClick={() => setShowCanned(v => !v)}
                    title="Respuestas rápidas"
                    className={`w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full transition-colors ${showCanned ? "bg-ec-gold text-white" : "text-ec-text-muted bg-white border border-black/[0.08]"}`}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
                  </button>

                  {isRecording ? (
                    <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-red-300 bg-red-50">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                      <span className="text-[13px] text-red-600 font-body">Grabando audio…</span>
                    </div>
                  ) : (
                    <textarea
                      ref={replyRef}
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder={selected.bot_paused ? "Escribe tu respuesta…" : "Escribe (el bot seguirá activo)…"}
                      rows={1}
                      className="flex-1 px-4 py-2.5 rounded-2xl border border-black/[0.08] bg-white focus:border-[#128C7E] focus:outline-none font-body resize-none leading-relaxed"
                      style={{ fontSize: '16px', minHeight: "40px", maxHeight: "120px", overflow: "auto" }}
                    />
                  )}

                  {isRecording ? (
                    <button
                      onClick={handleStopRecording}
                      className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 transition-colors active:scale-95"
                      title="Detener grabación"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleSend}
                        disabled={!replyText.trim() || sending}
                        className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full transition-all active:scale-95"
                        style={{ background: replyText.trim() && !sending ? "#075E54" : "#CBD5E1" }}
                        title={isWhatsApp(selected.phone) ? "Enviar por WhatsApp" : "Enviar"}
                      >
                        {sending
                          ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        }
                      </button>
                      <button
                        onClick={handleStartRecording}
                        className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-white border border-black/[0.08] text-ec-text-muted hover:text-indigo-600 hover:border-indigo-300 transition-colors active:scale-95"
                        title="Grabar audio"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="9" y1="22" x2="15" y2="22"/></svg>
                      </button>
                    </>
                  )}
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
