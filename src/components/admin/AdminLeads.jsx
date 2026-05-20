import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../../lib/storage";

// ─── Helpers ──────────────────────────────────────────────────────

const REMARKETING_SLOTS_COL = [
  { h: 8,  m: 0,  label: "8:00 am"  },
  { h: 12, m: 0,  label: "12:00 pm" },
  { h: 17, m: 30, label: "5:30 pm"  },
  { h: 19, m: 30, label: "7:30 pm"  },
];

function getColombiaDate() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
}

function nextRemarketingSlot() {
  const now = getColombiaDate();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (const slot of REMARKETING_SLOTS_COL) {
    const slotMin = slot.h * 60 + slot.m;
    if (slotMin > nowMin) {
      const diff = slotMin - nowMin;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      return { label: slot.label, inMin: diff, text: h > 0 ? `en ${h}h ${m}m` : `en ${m}m` };
    }
  }
  // siguiente día, primer slot
  const first = REMARKETING_SLOTS_COL[0];
  const minsToMidnight = (24 * 60) - nowMin;
  const diff = minsToMidnight + first.h * 60 + first.m;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return { label: first.label, inMin: diff, text: `mañana ${first.label} (${h}h ${m}m)` };
}

function lastRemarketingEntry(history) {
  if (!Array.isArray(history)) return null;
  return [...history].reverse().find(m => m.role === "remarketing") || null;
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

function cleanMsg(text) {
  return (text || "")
    .replace(/__BOOKING_CONFIRMED__[\s\S]*?__END_BOOKING__/g, "✅ Cita confirmada")
    .replace(/__[A-Z_]+__:[^\n]*/g, "")
    .replace(/__CANCEL_BOOKING__/g, "")
    .trim();
}

function getPreview(history) {
  if (!Array.isArray(history) || history.length === 0) return "Sin mensajes";
  const last = [...history].reverse().find(m => m.role === "user" || m.role === "assistant");
  if (!last) return "Sin mensajes";
  const text = cleanMsg(last.content || "");
  return (last.role === "user" ? "" : "Sara: ") + text.slice(0, 80) + (text.length > 80 ? "…" : "");
}

function downloadConversation(conv) {
  const name = conv.client_name || conv.phone || "cliente";
  const lines = [
    `CONVERSACIÓN — ${name}`,
    `Teléfono: ${conv.phone || "—"}`,
    `Servicio: ${conv.last_service || "—"}`,
    `Vehículo: ${conv.vehicle_type || "—"}`,
    `Estado lead: ${conv.remarketing_status || "—"}`,
    `Tipo: ${conv.lead_type || "—"}`,
    "─".repeat(50),
    "",
  ];
  (conv.history || []).forEach(m => {
    if (m.role === "remarketing") {
      lines.push(`[REMARKETING · ${m.timestamp ? new Date(m.timestamp).toLocaleString("es-CO") : ""}]`);
      lines.push(m.content || "");
    } else {
      const who = m.role === "user" ? name : m.role === "admin" ? "Admin" : "Sara";
      const ts = m.timestamp ? new Date(m.timestamp).toLocaleString("es-CO") : "";
      lines.push(`[${who} · ${ts}]`);
      lines.push(cleanMsg(m.content || ""));
    }
    lines.push("");
  });
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `conv_${(conv.client_name || conv.phone || "cliente").replace(/\s+/g, "_")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadAll(convs, label) {
  const all = convs.map(conv => {
    const name = conv.client_name || conv.phone || "cliente";
    const lines = [
      `══ ${name} · ${conv.phone || "—"} ══`,
      `Estado: ${conv.remarketing_status || "—"} · Tipo: ${conv.lead_type || "—"} · Servicio: ${conv.last_service || "—"}`,
      "",
    ];
    (conv.history || []).forEach(m => {
      if (m.role === "remarketing") {
        lines.push(`[REMARKETING] ${cleanMsg(m.content || "")}`);
      } else {
        const who = m.role === "user" ? name : m.role === "admin" ? "Admin" : "Sara";
        lines.push(`[${who}] ${cleanMsg(m.content || "")}`);
      }
    });
    lines.push("");
    return lines.join("\n");
  }).join("\n" + "═".repeat(60) + "\n\n");

  const blob = new Blob([all], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads_${label}_${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Stat card ────────────────────────────────────────────────────

function StatCard({ label, count, sub, color, icon }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-white border border-black/[0.06] rounded-2xl p-6 flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <span className="font-ui text-[9px] tracking-[0.2em] uppercase" style={{ color }}>{label}</span>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-base" style={{ background: `${color}15` }}>
          {icon}
        </div>
      </div>
      <p className="font-heading text-4xl" style={{ color }}>{count}</p>
      {sub && <p className="font-body text-xs text-ec-text-muted">{sub}</p>}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-2xl" style={{ background: `${color}40` }} />
    </motion.div>
  );
}

// ─── Lead card ────────────────────────────────────────────────────

const REMARK_CFG = {
  efectivo:      { label: "Efectivo",      color: "#16A34A", bg: "#F0FDF4", border: "#86EFAC" },
  converted:     { label: "Efectivo",      color: "#16A34A", bg: "#F0FDF4", border: "#86EFAC" },
  potencial:     { label: "Potencial",     color: "#C2410C", bg: "#FFF7ED", border: "#FED7AA" },
  desinteresado: { label: "Desinteresado", color: "#64748B", bg: "#F8FAFC", border: "#CBD5E1" },
};

const LEAD_CFG = {
  regateador: { emoji: "🫰", label: "Regateador" },
  analista:   { emoji: "📚", label: "Analista"   },
  embalado:   { emoji: "⚡", label: "Embalado"   },
  billetudo:  { emoji: "💸", label: "Billetudo"  },
};

function LeadCard({ conv, slot }) {
  const [expanded, setExpanded] = useState(false);
  const rm = REMARK_CFG[conv.remarketing_status] || REMARK_CFG.potencial;
  const lt = conv.lead_type ? LEAD_CFG[conv.lead_type] : null;
  const preview = getPreview(conv.history);
  const lastRemarkEntry = lastRemarketingEntry(conv.history);
  const isPotencial = conv.remarketing_status === "potencial";
  const history = Array.isArray(conv.history) ? conv.history : [];

  const visibleMessages = history.filter(m => ["user", "assistant", "admin", "remarketing"].includes(m.role));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-black/[0.06] rounded-2xl overflow-hidden hover:border-black/[0.12] transition-all duration-200"
    >
      {/* Main row */}
      <div className="p-4 flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-heading text-lg"
          style={{ background: `${rm.color}18`, color: rm.color }}>
          {(conv.client_name || conv.phone || "?").charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-ui text-[13px] font-semibold text-ec-dark truncate">
              {conv.client_name || conv.phone || "Sin nombre"}
            </span>
            {conv.client_name && conv.phone && (
              <span className="font-ui text-[10px] text-ec-text-muted">{conv.phone}</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className="font-ui text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 rounded-full border"
              style={{ background: rm.bg, color: rm.color, borderColor: rm.border }}>
              {rm.label}
            </span>
            {lt && (
              <span className="font-ui text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600">
                {lt.emoji} {lt.label}
              </span>
            )}
            {conv.last_service && (
              <span className="font-ui text-[9px] text-ec-text-muted">{conv.last_service}</span>
            )}
          </div>

          <p className="font-body text-xs text-ec-text-muted mt-1.5 truncate">{preview}</p>

          {/* Remarketing timing — solo potenciales */}
          {isPotencial && (
            <div className="mt-2 flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                <span className="font-ui text-[9px] text-orange-600 tracking-[0.08em] uppercase">
                  Próximo contacto: {slot.text}
                </span>
              </div>
              {lastRemarkEntry && (
                <span className="font-ui text-[9px] text-ec-text-muted">
                  Último remarketing: {timeAgo(lastRemarkEntry.timestamp)}
                </span>
              )}
              {!lastRemarkEntry && (
                <span className="font-ui text-[9px] text-ec-text-muted">Sin remarketing enviado aún</span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-ui text-[9px] text-ec-text-muted hidden sm:block">
            {timeAgo(conv.updated_at)}
          </span>
          <button
            onClick={() => downloadConversation(conv)}
            title="Descargar conversación"
            className="w-8 h-8 rounded-full border border-black/[0.08] flex items-center justify-center text-ec-text-muted hover:border-ec-gold/50 hover:text-ec-gold transition-all"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-8 h-8 rounded-full border border-black/[0.08] flex items-center justify-center text-ec-text-muted hover:border-ec-gold/50 hover:text-ec-gold transition-all"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded conversation */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-black/[0.05] bg-[#F0EDE8] px-4 py-3 max-h-80 overflow-y-auto space-y-1.5">
              {visibleMessages.length === 0 ? (
                <p className="font-body text-xs text-ec-text-muted text-center py-4">Sin mensajes</p>
              ) : visibleMessages.map((m, i) => {
                const isUser = m.role === "user";
                const isRemark = m.role === "remarketing";
                const text = cleanMsg(m.content || "");
                if (!text) return null;

                if (isRemark) {
                  return (
                    <div key={i} className="flex justify-center">
                      <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5 max-w-[85%]">
                        <div className="font-ui text-[8px] text-orange-500 uppercase tracking-wider mb-0.5">Remarketing automático</div>
                        <p className="font-body text-[11px] text-orange-800">{text}</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] px-3 py-1.5 rounded-xl text-[12px] leading-relaxed ${
                      isUser ? "bg-[#D9FDD3] text-[#111B21] rounded-br-sm" : "bg-white text-[#111B21] shadow-sm rounded-bl-sm"
                    }`}>
                      {!isUser && m.role === "admin" && (
                        <div className="font-ui text-[8px] text-indigo-500 uppercase mb-0.5">Admin</div>
                      )}
                      {text}
                      {m.timestamp && (
                        <div className="text-[9px] mt-0.5 text-[#8696A0] text-right">
                          {new Date(m.timestamp).toLocaleString("es-CO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main component ────────────────────────────────────────────────

const FILTERS = [
  { id: "all",           label: "Todos"          },
  { id: "potencial",     label: "Potenciales"    },
  { id: "efectivo",      label: "Efectivos"      },
  { id: "desinteresado", label: "Desinteresados" },
];

export default function AdminLeads() {
  const [convs, setConvs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");
  const [search, setSearch]   = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [slot, setSlot]       = useState(nextRemarketingSlot());

  const load = useCallback(async () => {
    setLoading(true);
    const data = await db.conversations.list();
    // Solo leads reales — excluir sin estado y "otro"
    const leads = data.filter(c =>
      c.remarketing_status &&
      c.remarketing_status !== null &&
      c.remarketing_status !== 'otro'
    );
    setConvs(leads);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, []);

  // Refresh slot every minute
  useEffect(() => {
    const t = setInterval(() => setSlot(nextRemarketingSlot()), 60000);
    return () => clearInterval(t);
  }, []);

  const efectivos      = convs.filter(c => c.remarketing_status === "efectivo" || c.remarketing_status === "converted");
  const potenciales    = convs.filter(c => c.remarketing_status === "potencial");
  const desinteresados = convs.filter(c => c.remarketing_status === "desinteresado");

  const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
  const toTs   = dateTo   ? new Date(dateTo + "T23:59:59").getTime() : null;

  const filtered = convs.filter(c => {
    const matchFilter = filter === "all" ? true
      : filter === "efectivo" ? (c.remarketing_status === "efectivo" || c.remarketing_status === "converted")
      : c.remarketing_status === filter;
    if (!matchFilter) return false;

    if (fromTs || toTs) {
      const ts = new Date(c.updated_at || 0).getTime();
      if (fromTs && ts < fromTs) return false;
      if (toTs   && ts > toTs)   return false;
    }

    if (!search) return true;
    const q = search.toLowerCase();
    return (c.client_name || "").toLowerCase().includes(q) ||
           (c.phone || "").includes(q) ||
           (c.last_service || "").toLowerCase().includes(q);
  });

  const activeFilter = FILTERS.find(f => f.id === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-2xl text-ec-dark">Pipeline de Leads</h2>
            <p className="font-body text-sm text-ec-text-muted mt-0.5">
              {filtered.length} de {convs.length} leads · próximo remarketing: <span className="text-orange-600 font-medium">{slot.label}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={load}
              className="w-9 h-9 border border-black/[0.08] rounded-lg flex items-center justify-center text-ec-text-muted hover:border-ec-gold/40 hover:text-ec-gold transition-all flex-shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.08-5.96"/>
              </svg>
            </button>
            {filtered.length > 0 && (
              <button
                onClick={() => downloadAll(filtered, activeFilter?.label || "todos")}
                className="flex items-center gap-1.5 px-3 py-2 border border-black/[0.08] rounded-lg font-ui text-[10px] tracking-[0.12em] uppercase text-ec-text-muted hover:border-ec-gold/40 hover:text-ec-gold transition-all"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Exportar ({filtered.length})
              </button>
            )}
          </div>
        </div>

        {/* Barra de búsqueda + fechas */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar nombre, teléfono, servicio..."
            className="flex-1 min-w-[180px] px-3 py-2 border border-black/[0.1] rounded-lg font-body text-sm bg-white focus:border-ec-gold focus:outline-none"
            style={{ fontSize: '16px' }}
          />
          <div className="flex items-center gap-2 bg-white border border-black/[0.1] rounded-lg px-3 py-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="font-body text-sm text-ec-dark bg-transparent focus:outline-none w-32"
              style={{ fontSize: '16px' }}
              title="Desde"
            />
            <span className="font-ui text-[10px] text-ec-text-muted">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="font-body text-sm text-ec-dark bg-transparent focus:outline-none w-32"
              style={{ fontSize: '16px' }}
              title="Hasta"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(""); setDateTo(""); }}
                className="text-ec-text-muted hover:text-red-400 transition-colors"
                title="Limpiar fechas"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Efectivos"
          count={efectivos.length}
          sub="Convirtieron en cita"
          color="#16A34A"
          icon="✅"
        />
        <StatCard
          label="Potenciales"
          count={potenciales.length}
          sub={`Próximo contacto: ${slot.text}`}
          color="#C2410C"
          icon="🔥"
        />
        <StatCard
          label="Desinteresados"
          count={desinteresados.length}
          sub="Sin respuesta tras remarketing"
          color="#64748B"
          icon="💤"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => {
          const count = f.id === "all" ? convs.length
            : f.id === "efectivo" ? efectivos.length
            : f.id === "potencial" ? potenciales.length
            : desinteresados.length;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 font-ui text-[10px] tracking-[0.15em] uppercase rounded-full border transition-all duration-200 ${
                filter === f.id
                  ? "bg-ec-dark text-white border-ec-dark"
                  : "bg-white text-ec-text-muted border-black/[0.1] hover:border-ec-gold/40"
              }`}
            >
              {f.label}
              <span className="ml-1.5 opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-2 border-ec-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center border border-dashed border-black/[0.1] bg-white rounded-2xl">
          <p className="font-heading text-xl text-ec-dark mb-2">
            {search ? "Sin resultados" : "Sin leads en esta categoría"}
          </p>
          <p className="font-body text-sm text-ec-text-muted">
            {search ? "Intenta con otro término." : "Los leads aparecen automáticamente cuando Sara clasifica una conversación."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map(conv => (
              <LeadCard key={conv.phone} conv={conv} slot={slot} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
