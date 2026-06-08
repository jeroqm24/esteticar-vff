import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabase";

const MONTHS_ES = [
  "enero","febrero","marzo","abril","mayo","junio",
  "julio","agosto","septiembre","octubre","noviembre","diciembre"
];

// Intenta parsear la fecha de cumpleaños y devuelve { day, month } o null
const parseBirthday = (raw) => {
  if (!raw || raw === "no_proporcionado") return null;
  const cleaned = raw.toLowerCase().trim();

  // "15 de marzo", "15 marzo"
  const m1 = cleaned.match(/(\d{1,2})\s+(?:de\s+)?([a-záéíóúñ]+)/);
  if (m1) {
    const day = parseInt(m1[1]);
    const monthIdx = MONTHS_ES.findIndex(mo => mo.startsWith(m1[2].slice(0, 3)));
    if (monthIdx !== -1 && day >= 1 && day <= 31)
      return { day, month: monthIdx + 1, label: raw };
  }

  // "03/15", "15/03", "15-03"
  const m2 = cleaned.match(/(\d{1,2})[\/\-](\d{1,2})/);
  if (m2) {
    const a = parseInt(m2[1]), b = parseInt(m2[2]);
    if (a <= 12 && b <= 31) return { day: b, month: a, label: raw };
    if (b <= 12 && a <= 31) return { day: a, month: b, label: raw };
  }

  return { day: null, month: null, label: raw };
};

// Días hasta el próximo cumpleaños
const daysUntil = (day, month) => {
  if (!day || !month) return null;
  const now = new Date();
  const thisYear = new Date(now.getFullYear(), month - 1, day);
  if (thisYear >= now) return Math.ceil((thisYear - now) / 86400000);
  const nextYear = new Date(now.getFullYear() + 1, month - 1, day);
  return Math.ceil((nextYear - now) / 86400000);
};

const urgencyColor = (days) => {
  if (days === null) return { bg: "rgba(107,114,128,0.08)", color: "#6b7280", border: "rgba(107,114,128,0.2)" };
  if (days <= 7)  return { bg: "rgba(239,68,68,0.08)",    color: "#dc2626", border: "rgba(239,68,68,0.25)" };
  if (days <= 30) return { bg: "rgba(234,179,8,0.08)",    color: "#b45309", border: "rgba(234,179,8,0.3)" };
  return           { bg: "rgba(34,197,94,0.08)",  color: "#16a34a", border: "rgba(34,197,94,0.25)" };
};

export default function AdminBirthdays() {
  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | soon | month

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("appointments")
        .select("client_name, client_phone, client_email, client_birthday, vehicle_type, service, date, channel, lead_type")
        .not("client_birthday", "is", null)
        .neq("client_birthday", "no_proporcionado")
        .order("created_date", { ascending: false });

      // Deduplicar por teléfono — conservar el registro más reciente
      const seen = new Map();
      for (const r of data || []) {
        if (!r.client_birthday || r.client_birthday === "no_proporcionado") continue;
        const key = r.client_phone || r.client_name || Math.random();
        if (!seen.has(key)) seen.set(key, r);
      }

      const enriched = [...seen.values()].map(r => {
        const parsed = parseBirthday(r.client_birthday);
        const days   = parsed ? daysUntil(parsed.day, parsed.month) : null;
        return { ...r, parsed, days };
      }).sort((a, b) => {
        if (a.days === null && b.days === null) return 0;
        if (a.days === null) return 1;
        if (b.days === null) return -1;
        return a.days - b.days;
      });

      setRows(enriched);
    } catch { setRows([]); }
    setLoading(false);
  };

  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  const filtered = rows.filter(r => {
    if (search) {
      const q = search.toLowerCase();
      if (!(r.client_name || "").toLowerCase().includes(q) &&
          !(r.client_phone || "").includes(q) &&
          !(r.client_birthday || "").toLowerCase().includes(q)) return false;
    }
    if (filter === "soon")  return r.days !== null && r.days <= 30;
    if (filter === "month") return r.parsed?.month === currentMonth;
    return true;
  });

  const soonCount  = rows.filter(r => r.days !== null && r.days <= 30).length;
  const monthCount = rows.filter(r => r.parsed?.month === currentMonth).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="font-ui text-[10px] tracking-[0.3em] text-ec-gold uppercase mb-1">Base de datos</p>
          <h2 className="font-heading text-3xl text-ec-dark">Cumpleaños</h2>
          <p className="font-body text-sm text-ec-text-muted mt-1">{rows.length} cliente{rows.length !== 1 ? "s" : ""} con fecha registrada</p>
        </div>

        {/* Chips de filtro */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: "all",   label: "Todos",             count: rows.length },
            { id: "soon",  label: "Próximos 30 días",  count: soonCount },
            { id: "month", label: "Este mes",           count: monthCount },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-ui text-[10px] tracking-[0.15em] uppercase transition-all ${
                filter === f.id
                  ? "bg-ec-gold text-white shadow-sm"
                  : "bg-white text-ec-text-muted border border-black/[0.08] hover:border-ec-gold/40"
              }`}
            >
              {f.label}
              <span className={`text-[9px] font-bold ${filter === f.id ? "opacity-80" : "opacity-60"}`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Buscador */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-ec-text-muted" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, teléfono o fecha..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-black/[0.08] rounded-xl font-body text-sm text-ec-dark focus:outline-none focus:border-ec-gold/50 transition-colors"
        />
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-ec-gold/30 border-t-ec-gold rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-ec-text-muted opacity-40">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <p className="font-body text-sm text-ec-text-muted">
            {search ? "Sin resultados para esa búsqueda" : "Aún no hay cumpleaños registrados"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
          {/* Header tabla */}
          <div className="hidden md:grid grid-cols-[2fr_1.2fr_1.4fr_1.2fr_1.2fr_1fr] gap-4 px-6 py-3 border-b border-black/[0.05] bg-ec-cream/40">
            {["Cliente", "Cumpleaños", "Faltan", "Teléfono", "Correo", "Último servicio"].map(h => (
              <span key={h} className="font-ui text-[9px] tracking-[0.2em] text-ec-text-muted uppercase">{h}</span>
            ))}
          </div>

          {filtered.map((r, i) => {
            const urg  = urgencyColor(r.days);
            const name = r.client_name || "Sin nombre";
            const initials = name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

            return (
              <motion.div
                key={`${r.client_phone}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`grid md:grid-cols-[2fr_1.2fr_1.4fr_1.2fr_1.2fr_1fr] gap-4 px-6 py-4 items-center transition-colors hover:bg-ec-cream/30 ${i < filtered.length - 1 ? "border-b border-black/[0.04]" : ""}`}
              >
                {/* Nombre */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-ec-gold/10 flex items-center justify-center flex-shrink-0">
                    <span className="font-heading text-sm text-ec-gold">{initials || "?"}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-heading text-sm text-ec-dark truncate">{name}</p>
                    {r.lead_type && (
                      <span className="font-ui text-[9px] tracking-[0.1em] text-ec-text-muted uppercase">{r.lead_type}</span>
                    )}
                  </div>
                </div>

                {/* Cumpleaños */}
                <div>
                  <p className="font-body text-sm text-ec-dark">{r.client_birthday}</p>
                  {r.parsed?.month && (
                    <p className="font-ui text-[9px] text-ec-text-muted mt-0.5">
                      {r.parsed.day && `${r.parsed.day} de `}{MONTHS_ES[(r.parsed.month || 1) - 1]}
                    </p>
                  )}
                </div>

                {/* Días que faltan */}
                <div>
                  {r.days !== null ? (
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-ui text-[10px] tracking-[0.1em] font-semibold"
                      style={{ background: urg.bg, color: urg.color, border: `1px solid ${urg.border}` }}
                    >
                      {r.days === 0 ? "HOY 🎂" : r.days === 1 ? "Mañana" : `${r.days} días`}
                    </span>
                  ) : (
                    <span className="font-body text-xs text-ec-text-muted opacity-50">Sin fecha exacta</span>
                  )}
                </div>

                {/* Teléfono */}
                <div>
                  {r.client_phone ? (
                    <a
                      href={`https://wa.me/57${r.client_phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-body text-sm text-ec-dark hover:text-ec-gold transition-colors"
                    >
                      {r.client_phone}
                    </a>
                  ) : (
                    <span className="font-body text-xs text-ec-text-muted opacity-40">N/A</span>
                  )}
                </div>

                {/* Correo */}
                <div className="min-w-0">
                  {r.client_email ? (
                    <p className="font-body text-xs text-ec-text-muted truncate">{r.client_email}</p>
                  ) : (
                    <span className="font-body text-xs text-ec-text-muted opacity-40">N/A</span>
                  )}
                </div>

                {/* Último servicio */}
                <div>
                  {r.service ? (
                    <p className="font-body text-xs text-ec-text-muted leading-tight line-clamp-2">{r.service}</p>
                  ) : (
                    <span className="font-body text-xs text-ec-text-muted opacity-40">N/A</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
