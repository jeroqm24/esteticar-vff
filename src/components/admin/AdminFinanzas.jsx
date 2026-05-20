import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";

// ─── helpers ────────────────────────────────────────────────────────────────

/** "$49.000" or "$350.000" → 49000 */
function parsePrice(str) {
  if (!str) return 0;
  return parseInt(String(str).replace(/\D/g, ""), 10) || 0;
}

function formatCLP(amount) {
  if (amount >= 1_000_000)
    return `$${(amount / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (amount >= 1_000)
    return `$${Math.round(amount / 1_000)}K`;
  return `$${amount}`;
}

function formatCLPFull(amount) {
  return `$${Number(amount).toLocaleString("es-CL")}`;
}

/** Return [startISO, endISO] strings (date only, no time) for a period */
function periodRange(period) {
  const now = new Date();
  if (period === "hoy") {
    const d = now.toISOString().slice(0, 10);
    return [d, d];
  }
  if (period === "semana") {
    const day = now.getDay(); // 0 = Sunday
    const diff = day === 0 ? -6 : 1 - day; // Monday
    const mon = new Date(now);
    mon.setDate(now.getDate() + diff);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return [mon.toISOString().slice(0, 10), sun.toISOString().slice(0, 10)];
  }
  // mes
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return [first.toISOString().slice(0, 10), last.toISOString().slice(0, 10)];
}

/** Filter appointments by period using created_date ISO timestamp */
function appointmentInPeriod(appt, start, end) {
  if (!appt.created_date) return false;
  const d = appt.created_date.slice(0, 10);
  return d >= start && d <= end;
}

// ─── sub-components ─────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, index }) {
  const colorMap = {
    green: { text: "#16a34a", bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.18)" },
    red:   { text: "#dc2626", bg: "rgba(239,68,68,0.06)",  border: "rgba(239,68,68,0.18)" },
    gold:  { text: "#B8860B", bg: "rgba(184,134,11,0.06)", border: "rgba(184,134,11,0.18)" },
    slate: { text: "#475569", bg: "rgba(71,85,105,0.04)",  border: "rgba(71,85,105,0.12)" },
  };
  const c = colorMap[color] || colorMap.gold;

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.55 }}
      className="relative p-7 rounded-sm overflow-hidden group"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      <p className="font-ui text-[10px] tracking-[0.3em] uppercase mb-4" style={{ color: c.text, opacity: 0.75 }}>
        {label}
      </p>
      <p className="font-heading text-4xl font-light" style={{ color: c.text }}>
        {value}
      </p>
      {sub && (
        <p className="font-body text-xs mt-2 font-light text-ec-text-muted">{sub}</p>
      )}
      <div
        className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-700"
        style={{ background: c.text }}
      />
    </motion.div>
  );
}

function SectionTitle({ children, delay = 0 }) {
  return (
    <motion.h3
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="font-heading text-xl text-ec-dark mb-5"
    >
      {children}
    </motion.h3>
  );
}

const CATEGORIES = ["Publicidad", "Operativo", "Otros"];

const CATEGORY_COLOR = {
  Publicidad: "#3b82f6",
  Operativo:  "#f97316",
  Otros:      "#8b5cf6",
};

// ─── main component ──────────────────────────────────────────────────────────

export default function AdminFinanzas() {
  const [period, setPeriod] = useState("mes");
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [costs, setCosts] = useState([]);
  const [costsEnabled, setCostsEnabled] = useState(true);

  // Cost form state
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: "Operativo",
    description: "",
    amount: "",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteId, setDeleteId] = useState(null);

  // ── fetch ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Appointments
      const { data: appts } = await supabase
        .from("appointments")
        .select("price_display, status, created_date, service, client_name");
      setAppointments(appts || []);

      // Costs — graceful if table missing
      if (costsEnabled) {
        const { data: costsData, error: costsErr } = await supabase
          .from("costs")
          .select("*")
          .order("date", { ascending: false });

        if (costsErr) {
          // Table doesn't exist yet → disable quietly
          if (costsErr.code === "42P01" || costsErr.message?.includes("does not exist")) {
            setCostsEnabled(false);
          }
          setCosts([]);
        } else {
          setCosts(costsData || []);
        }
      }
    } catch {
      // network error — keep empty state
    } finally {
      setLoading(false);
    }
  }, [costsEnabled]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── computed values ──
  const [start, end] = periodRange(period);

  const filteredAppts = appointments.filter(
    (a) => a.status !== "cancelada" && a.status !== "cancelled" && appointmentInPeriod(a, start, end)
  );

  const ingresos = filteredAppts.reduce((s, a) => s + parsePrice(a.price_display), 0);

  const filteredCosts = costs.filter((c) => {
    if (!c.date) return false;
    const d = c.date.slice(0, 10);
    return d >= start && d <= end;
  });

  const totalCosts = filteredCosts.reduce((s, c) => s + Number(c.amount || 0), 0);
  const utilidad = ingresos - totalCosts;

  // Service breakdown
  const serviceMap = {};
  filteredAppts.forEach((a) => {
    const key = a.service || "Sin servicio";
    if (!serviceMap[key]) serviceMap[key] = { count: 0, revenue: 0 };
    serviceMap[key].count += 1;
    serviceMap[key].revenue += parsePrice(a.price_display);
  });
  const topServices = Object.entries(serviceMap)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 6);
  const maxRevenue = topServices[0]?.[1].revenue || 1;

  // ── handlers ──
  const handleAddCost = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.description.trim()) { setFormError("Ingresa una descripción."); return; }
    const amount = parseFloat(String(form.amount).replace(/\./g, "").replace(",", "."));
    if (!amount || amount <= 0) { setFormError("Ingresa un monto válido."); return; }

    setFormLoading(true);
    const { error } = await supabase.from("costs").insert([{
      date: form.date,
      category: form.category,
      description: form.description.trim(),
      amount,
    }]);
    setFormLoading(false);

    if (error) {
      if (error.code === "42P01") {
        setFormError("La tabla 'costs' aún no existe en Supabase. Créala primero.");
      } else {
        setFormError(error.message);
      }
      return;
    }

    setForm({ date: new Date().toISOString().slice(0, 10), category: form.category, description: "", amount: "" });
    fetchData();
  };

  const handleDeleteCost = async (id) => {
    setDeleteId(id);
    await supabase.from("costs").delete().eq("id", id);
    setDeleteId(null);
    fetchData();
  };

  // ── period label ──
  const periodLabel = { hoy: "Hoy", semana: "Esta semana", mes: "Este mes" }[period];

  // ── loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-ec-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── render ──
  return (
    <div className="space-y-10">

      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
        <div className="flex-1">
          <h2 className="font-heading text-3xl text-ec-dark">Finanzas</h2>
          <p className="font-body text-sm text-ec-text-muted font-light mt-1">
            Ingresos, costos y rentabilidad del negocio
          </p>
        </div>

        {/* Period selector */}
        <div className="flex gap-1 p-1 bg-ec-cream rounded-sm border border-black/[0.06]">
          {[
            { key: "hoy", label: "Hoy" },
            { key: "semana", label: "Esta semana" },
            { key: "mes", label: "Este mes" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`font-ui text-[11px] tracking-[0.15em] uppercase px-4 py-2 rounded-sm transition-all duration-200 ${
                period === key
                  ? "bg-ec-gold text-white shadow-sm"
                  : "text-ec-text-muted hover:text-ec-dark"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard
          label="Ingresos"
          value={formatCLP(ingresos)}
          sub={`${filteredAppts.length} cita${filteredAppts.length !== 1 ? "s" : ""} · ${periodLabel}`}
          color="green"
          index={0}
        />
        <KpiCard
          label="Costos"
          value={formatCLP(totalCosts)}
          sub={costsEnabled ? `${filteredCosts.length} registro${filteredCosts.length !== 1 ? "s" : ""}` : "Sin tabla 'costs'"}
          color="red"
          index={1}
        />
        <KpiCard
          label="Utilidad"
          value={formatCLP(Math.abs(utilidad))}
          sub={utilidad < 0 ? "Resultado negativo" : "Resultado positivo"}
          color={utilidad >= 0 ? "green" : "red"}
          index={2}
        />
        <KpiCard
          label="Citas"
          value={filteredAppts.length}
          sub={`${period === "hoy" ? "hoy" : period === "semana" ? "esta semana" : "este mes"}`}
          color="gold"
          index={3}
        />
      </div>

      {/* Two-column layout: form + breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Cost entry form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white border border-black/[0.06] rounded-sm shadow-[0_2px_20px_rgba(0,0,0,0.04)] overflow-hidden"
        >
          <div className="px-7 py-5 border-b border-black/[0.05] flex items-center justify-between">
            <h3 className="font-heading text-lg text-ec-dark">Registrar Costo</h3>
            {!costsEnabled && (
              <span className="font-ui text-[9px] tracking-widest uppercase text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-sm">
                Tabla pendiente
              </span>
            )}
          </div>
          <form onSubmit={handleAddCost} className="p-7 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-ec-text-muted block mb-1.5">
                  Fecha
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full border border-black/[0.1] rounded-sm px-3 py-2 font-body text-sm text-ec-dark bg-white focus:outline-none focus:border-ec-gold/50 transition-colors"
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div>
                <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-ec-text-muted block mb-1.5">
                  Categoría
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full border border-black/[0.1] rounded-sm px-3 py-2 font-body text-sm text-ec-dark bg-white focus:outline-none focus:border-ec-gold/50 transition-colors"
                  style={{ fontSize: '16px' }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-ec-text-muted block mb-1.5">
                Descripción
              </label>
              <input
                type="text"
                placeholder={form.category === "Publicidad" ? "Ej: Facebook Ads — Mayo" : "Ej: descripción del gasto"}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-black/[0.1] rounded-sm px-3 py-2 font-body text-sm text-ec-dark placeholder-ec-text-muted/50 bg-white focus:outline-none focus:border-ec-gold/50 transition-colors"
                style={{ fontSize: '16px' }}
              />
            </div>

            <div>
              <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-ec-text-muted block mb-1.5">
                Monto (CLP)
              </label>
              <input
                type="number"
                placeholder="Ej: 25000"
                min="0"
                step="1"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full border border-black/[0.1] rounded-sm px-3 py-2 font-body text-sm text-ec-dark placeholder-ec-text-muted/50 bg-white focus:outline-none focus:border-ec-gold/50 transition-colors"
                style={{ fontSize: '16px' }}
              />
            </div>

            {formError && (
              <p className="font-body text-xs text-red-500">{formError}</p>
            )}

            <button
              type="submit"
              disabled={formLoading}
              className="w-full py-3 bg-ec-gold text-white font-ui text-[11px] tracking-[0.25em] uppercase rounded-sm hover:bg-ec-gold/90 transition-colors disabled:opacity-50"
            >
              {formLoading ? "Guardando…" : "Agregar Costo"}
            </button>
          </form>
        </motion.div>

        {/* Service breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white border border-black/[0.06] rounded-sm shadow-[0_2px_20px_rgba(0,0,0,0.04)] overflow-hidden"
        >
          <div className="px-7 py-5 border-b border-black/[0.05]">
            <h3 className="font-heading text-lg text-ec-dark">Servicios — Top Ingresos</h3>
            <p className="font-body text-xs text-ec-text-muted font-light mt-0.5">{periodLabel}</p>
          </div>
          <div className="p-7 space-y-5">
            {topServices.length === 0 ? (
              <div className="py-12 text-center">
                <p className="font-body text-sm text-ec-text-muted font-light">Sin citas en este período</p>
              </div>
            ) : (
              topServices.map(([name, { count, revenue }], i) => (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-body text-sm text-ec-dark font-light truncate max-w-[60%]">{name}</span>
                    <span className="font-ui text-xs text-ec-gold tracking-wider">{formatCLPFull(revenue)}</span>
                  </div>
                  <div className="h-1.5 bg-ec-cream rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(revenue / maxRevenue) * 100}%` }}
                      transition={{ delay: 0.35 + i * 0.06, duration: 0.6 }}
                      className="h-full rounded-full"
                      style={{ background: "#B8860B" }}
                    />
                  </div>
                  <p className="font-ui text-[10px] text-ec-text-muted mt-1">
                    {count} cita{count !== 1 ? "s" : ""}
                  </p>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Cost list */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-white border border-black/[0.06] rounded-sm shadow-[0_2px_20px_rgba(0,0,0,0.04)] overflow-hidden"
      >
        <div className="px-7 py-5 border-b border-black/[0.05] flex items-center justify-between">
          <div>
            <h3 className="font-heading text-lg text-ec-dark">Costos del Período</h3>
            <p className="font-body text-xs text-ec-text-muted font-light mt-0.5">{periodLabel}</p>
          </div>
          {filteredCosts.length > 0 && (
            <span className="font-ui text-[10px] tracking-[0.2em] text-ec-text-muted uppercase">
              Total: {formatCLPFull(totalCosts)}
            </span>
          )}
        </div>

        {!costsEnabled ? (
          <div className="p-10 text-center">
            <p className="font-body text-sm text-ec-text-muted font-light">
              La tabla <code className="text-xs bg-amber-50 px-1 rounded">costs</code> no existe aún en Supabase.
              Créala con las columnas: <code className="text-xs">id uuid, date date, category text, description text, amount numeric, created_at timestamptz</code>.
            </p>
          </div>
        ) : filteredCosts.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-body text-sm text-ec-text-muted font-light">Sin costos registrados en este período.</p>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.04]">
            <AnimatePresence>
              {filteredCosts.map((cost) => (
                <motion.div
                  key={cost.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="px-7 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 hover:bg-ec-cream/40 transition-colors"
                >
                  {/* Category badge */}
                  <span
                    className="font-ui text-[9px] tracking-[0.2em] uppercase px-3 py-1 rounded-sm self-start shrink-0"
                    style={{
                      color: CATEGORY_COLOR[cost.category] || "#64748b",
                      background: (CATEGORY_COLOR[cost.category] || "#64748b") + "14",
                      border: `1px solid ${(CATEGORY_COLOR[cost.category] || "#64748b")}30`,
                    }}
                  >
                    {cost.category}
                  </span>

                  {/* Description */}
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-ec-dark font-light truncate">{cost.description}</p>
                    <p className="font-ui text-[10px] text-ec-text-muted mt-0.5">{cost.date}</p>
                  </div>

                  {/* Amount */}
                  <p className="font-heading text-lg text-red-600 shrink-0">
                    -{formatCLPFull(cost.amount)}
                  </p>

                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteCost(cost.id)}
                    disabled={deleteId === cost.id}
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-sm text-ec-text-muted hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                    title="Eliminar"
                  >
                    {deleteId === cost.id ? (
                      <div className="w-4 h-4 border border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4h6v2"/>
                      </svg>
                    )}
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}
