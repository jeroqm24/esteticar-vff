import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../../lib/storage";

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

function getPreview(history) {
  if (!Array.isArray(history) || history.length === 0) return "Sin mensajes";
  const last = [...history].reverse().find(m => m.role === "user");
  return last ? last.content.slice(0, 70) + (last.content.length > 70 ? "…" : "") : "Sin mensajes";
}

function getDisplayName(conv) {
  if (conv.client_name) return conv.client_name;
  if (conv.phone && !conv.phone.startsWith("web_")) return conv.phone;
  return "Visitante web";
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  const clean = (msg.content || "")
    .replace(/__BOOKING_CONFIRMED__[\s\S]*?__END_BOOKING__/g, "✅ Cita confirmada")
    .replace(/__ESCALATE__:[^\n]*/g, "")
    .trim();

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-1`}>
      <div
        className={`max-w-[75%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${
          isUser
            ? "bg-[#D9FDD3] text-[#111B21] rounded-br-sm"
            : "bg-white text-[#111B21] rounded-bl-sm shadow-sm"
        }`}
      >
        {clean}
        <div className={`text-[10px] mt-0.5 ${isUser ? "text-right text-[#8696A0]" : "text-[#8696A0]"}`}>
          {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : ""}
        </div>
      </div>
    </div>
  );
}

export default function AdminConversations() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(null);
  const bottomRef = useRef(null);

  const load = async () => {
    setLoading(true);
    const data = await db.conversations.list();
    setConversations(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected]);

  const handleDelete = async (phone, e) => {
    e.stopPropagation();
    setDeleting(phone);
    await db.conversations.delete(phone);
    setConversations(prev => prev.filter(c => c.phone !== phone));
    if (selected?.phone === phone) setSelected(null);
    setDeleting(null);
  };

  const filtered = conversations.filter(c => {
    const name = getDisplayName(c).toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || (c.phone || "").includes(q);
  });

  const selectedHistory = Array.isArray(selected?.history) ? selected.history : [];

  return (
    <div className="flex flex-col lg:flex-row gap-0 h-[calc(100dvh-12rem)] min-h-[500px] rounded-sm overflow-hidden border border-black/[0.06] shadow-sm">

      {/* ── Lista de conversaciones ── */}
      <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 flex flex-col border-r border-black/[0.06] bg-white">
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
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-ec-text-muted text-sm font-body">
              Cargando…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-ec-text-muted">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span className="text-sm font-body">Sin conversaciones</span>
            </div>
          ) : (
            filtered.map(conv => {
              const isActive = selected?.phone === conv.phone;
              const msgCount = Array.isArray(conv.history) ? conv.history.length : 0;
              return (
                <button
                  key={conv.phone}
                  onClick={() => setSelected(conv)}
                  className={`w-full text-left px-4 py-3 border-b border-black/[0.04] transition-colors group relative ${
                    isActive ? "bg-ec-gold/[0.08] border-l-2 border-l-ec-gold" : "hover:bg-ec-cream"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-ui text-[12px] font-semibold text-ec-dark truncate">
                          {getDisplayName(conv)}
                        </span>
                        {conv.lead_type && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-ec-gold/20 text-ec-gold font-ui uppercase tracking-wider flex-shrink-0">
                            {conv.lead_type}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-ec-text-muted font-body truncate mt-0.5">
                        {getPreview(conv.history)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-[10px] text-ec-text-muted font-ui">{timeAgo(conv.updated_at)}</span>
                      <span className="text-[9px] text-ec-text-muted font-ui">{msgCount} msgs</span>
                    </div>
                  </div>
                  <button
                    onClick={e => handleDelete(conv.phone, e)}
                    disabled={deleting === conv.phone}
                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600"
                    title="Eliminar"
                  >
                    {deleting === conv.phone
                      ? <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin"/>
                      : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                    }
                  </button>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Vista de mensajes ── */}
      <div className="flex-1 flex flex-col bg-[#efeae2] min-h-0">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-ec-text-muted">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <p className="font-body text-sm">Selecciona una conversación</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[#128C7E] flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {getDisplayName(selected).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-[14px] leading-tight truncate">{getDisplayName(selected)}</p>
                <p className="text-white/70 text-[11px]">
                  {selected.phone?.startsWith("web_") ? "Chat web" : selected.phone} · {selectedHistory.length} mensajes
                </p>
              </div>
              <span className="text-white/60 text-[11px] font-ui">{timeAgo(selected.updated_at)}</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {selectedHistory.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}
              <div ref={bottomRef} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
