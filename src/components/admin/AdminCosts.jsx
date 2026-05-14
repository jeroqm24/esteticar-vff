import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const PROVIDERS = {
  anthropic: { label: "Claude (Anthropic)", color: "#D4A017", bg: "rgba(212,160,23,0.1)" },
  openai:    { label: "Whisper (OpenAI)",   color: "#10A37F", bg: "rgba(16,163,127,0.1)" },
};

const fmt = (n) => `$${(n || 0).toFixed(6)}`;
const fmtUSD = (n) => {
  const v = n || 0;
  if (v === 0) return "$0.000000";
  if (v < 0.01) return `$${v.toFixed(6)}`;
  if (v < 1) return `$${v.toFixed(4)}`;
  return `$${v.toFixed(2)}`;
};

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-white border border-black/[0.06] rounded-sm p-5 flex flex-col gap-1">
      <span className="font-ui text-[9px] tracking-[0.35em] uppercase text-ec-text-muted">{label}</span>
      <span className="font-heading text-2xl font-light" style={{ color: color || "#111" }}>{value}</span>
      {sub && <span className="font-body text-xs text-ec-text-muted">{sub}</span>}
    </div>
  );
}

export default function AdminCosts() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(7);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - range);
      const { data } = await supabase
        .from("api_costs")
        .select("*")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false });
      setRows(data || []);
      setLoading(false);
    };
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [range]);

  // Agrupar por día
  const byDay = rows.reduce((acc, r) => {
    const day = r.created_at?.slice(0, 10);
    if (!day) return acc;
    if (!acc[day]) acc[day] = { anthropic: 0, openai: 0 };
    acc[day][r.provider] = (acc[day][r.provider] || 0) + (r.cost_usd || 0);
    return acc;
  }, {});

  const days = Object.entries(byDay).sort(([a], [b]) => b.localeCompare(a));

  const totalAnthropicAll = rows.filter(r => r.provider === "anthropic").reduce((s, r) => s + (r.cost_usd || 0), 0);
  const totalOpenAIAll    = rows.filter(r => r.provider === "openai").reduce((s, r) => s + (r.cost_usd || 0), 0);
  const totalAll = totalAnthropicAll + totalOpenAIAll;

  const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
  const todayCost = (byDay[todayStr]?.anthropic || 0) + (byDay[todayStr]?.openai || 0);

  const avgPerDay = days.length > 0 ? totalAll / days.length : 0;

  const maxDayCost = Math.max(...days.map(([, v]) => (v.anthropic || 0) + (v.openai || 0)), 0.001);

  const totalMessages = rows.filter(r => r.provider === "anthropic").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-heading text-2xl font-light text-ec-dark">Costos de API</h2>
          <p className="font-body text-sm text-ec-text-muted mt-1">Gasto real por llamadas a Claude y Whisper</p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30].map(d => (
            <button key={d} onClick={() => setRange(d)}
              className={`font-ui text-[10px] tracking-[0.2em] uppercase px-4 py-2 rounded-sm transition-all ${range === d ? "bg-ec-gold text-white" : "bg-white border border-black/[0.08] text-ec-text-muted hover:border-ec-gold"}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Hoy" value={fmtUSD(todayCost)} color="#B8860B" />
        <StatCard label={`Total ${range} días`} value={fmtUSD(totalAll)} color="#111" />
        <StatCard label="Promedio / día" value={fmtUSD(avgPerDay)} sub="USD" />
        <StatCard label="Mensajes procesados" value={totalMessages.toLocaleString()} sub={`últimos ${range} días`} />
      </div>

      {/* Breakdown por proveedor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.entries(PROVIDERS).map(([key, { label, color, bg }]) => {
          const total = key === "anthropic" ? totalAnthropicAll : totalOpenAIAll;
          const pct = totalAll > 0 ? (total / totalAll) * 100 : 0;
          return (
            <div key={key} className="bg-white border border-black/[0.06] rounded-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-ui text-[10px] tracking-[0.3em] uppercase font-semibold" style={{ color }}>{label}</span>
                <span className="font-heading text-xl font-light text-ec-dark">{fmtUSD(total)}</span>
              </div>
              <div className="w-full h-1.5 bg-black/[0.04] rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
                  className="h-full rounded-full" style={{ background: color }} />
              </div>
              <span className="font-body text-xs text-ec-text-muted mt-1 block">{pct.toFixed(0)}% del total</span>
            </div>
          );
        })}
      </div>

      {/* Gráfico de barras por día */}
      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-ec-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : days.length === 0 ? (
        <div className="bg-white border border-black/[0.06] rounded-sm p-10 text-center">
          <p className="font-body text-sm text-ec-text-muted">Sin datos aún. Los costos se registrarán automáticamente con cada mensaje.</p>
        </div>
      ) : (
        <div className="bg-white border border-black/[0.06] rounded-sm p-6">
          <h3 className="font-ui text-[10px] tracking-[0.3em] uppercase text-ec-text-muted mb-6">Gasto diario</h3>
          <div className="flex items-end gap-2 h-36 overflow-x-auto pb-2">
            {days.slice(0, 30).reverse().map(([day, costs]) => {
              const total = (costs.anthropic || 0) + (costs.openai || 0);
              const heightPct = (total / maxDayCost) * 100;
              const anthropicPct = total > 0 ? ((costs.anthropic || 0) / total) * 100 : 100;
              const label = new Date(day + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" });
              return (
                <div key={day} className="flex flex-col items-center gap-1 min-w-[36px] flex-1 max-w-[60px]">
                  <span className="font-ui text-[8px] text-ec-text-muted">{fmtUSD(total).replace("$0.", "¢").replace("$", "$")}</span>
                  <div className="w-full flex flex-col-reverse rounded-sm overflow-hidden" style={{ height: `${Math.max(heightPct, 4)}%`, minHeight: 4, maxHeight: "100px" }}>
                    <div style={{ height: `${anthropicPct}%`, background: "#D4A017", minHeight: anthropicPct > 0 ? 2 : 0 }} />
                    <div style={{ height: `${100 - anthropicPct}%`, background: "#10A37F", minHeight: (100 - anthropicPct) > 0 ? 2 : 0 }} />
                  </div>
                  <span className="font-ui text-[8px] text-ec-text-muted">{label}</span>
                </div>
              );
            })}
          </div>
          {/* Leyenda */}
          <div className="flex gap-4 mt-4 pt-4 border-t border-black/[0.04]">
            {Object.entries(PROVIDERS).map(([, { label, color }]) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                <span className="font-ui text-[9px] text-ec-text-muted uppercase tracking-wider">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla últimas llamadas */}
      {rows.length > 0 && (
        <div className="bg-white border border-black/[0.06] rounded-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-black/[0.06]">
            <h3 className="font-ui text-[10px] tracking-[0.3em] uppercase text-ec-text-muted">Últimas llamadas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.04]">
                  {["Hora", "Canal", "Proveedor", "Modelo", "Tokens entrada", "Tokens salida", "Costo"].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-ui text-[9px] tracking-[0.2em] uppercase text-ec-text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r) => (
                  <tr key={r.id} className="border-b border-black/[0.03] hover:bg-ec-cream/50 transition-colors">
                    <td className="px-4 py-3 font-body text-xs text-ec-text-muted whitespace-nowrap">
                      {new Date(r.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-ui text-[9px] tracking-widest uppercase px-2 py-0.5 rounded-full ${r.channel === "whatsapp" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
                        {r.channel || "web"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-body text-xs" style={{ color: PROVIDERS[r.provider]?.color }}>
                      {PROVIDERS[r.provider]?.label || r.provider}
                    </td>
                    <td className="px-4 py-3 font-body text-xs text-ec-text-muted">{r.model || "—"}</td>
                    <td className="px-4 py-3 font-body text-xs text-ec-dark">{r.input_tokens?.toLocaleString() || "—"}</td>
                    <td className="px-4 py-3 font-body text-xs text-ec-dark">{r.output_tokens?.toLocaleString() || "—"}</td>
                    <td className="px-4 py-3 font-body text-xs font-semibold" style={{ color: "#B8860B" }}>{fmt(r.cost_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
