import React, { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const REALTIME_WINDOW_MIN = 5; // visitantes activos en los últimos 5 minutos

function fmt(n) { return (n || 0).toLocaleString("es-CO"); }

function Badge({ children, color = "gold" }) {
  const colors = {
    gold: "bg-ec-gold/10 text-ec-gold border-ec-gold/20",
    green: "bg-green-50 text-green-700 border-green-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    gray: "bg-black/[0.04] text-ec-text-muted border-black/[0.06]",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-ui tracking-wider uppercase border ${colors[color]}`}>
      {children}
    </span>
  );
}

export default function AdminAnalytics() {
  const [liveCount, setLiveCount] = useState(0);
  const [liveVisitors, setLiveVisitors] = useState([]);
  const [filter, setFilter] = useState("day"); // "day" | "month"
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);

  // ── Carga histórica según filtro ──────────────────────────────────
  const loadStats = async () => {
    setLoading(true);
    try {
      let from, to;
      if (filter === "day") {
        from = `${selectedDate}T00:00:00`;
        to   = `${selectedDate}T23:59:59`;
      } else {
        from = `${selectedMonth}-01T00:00:00`;
        const end = new Date(selectedMonth + "-01");
        end.setMonth(end.getMonth() + 1);
        to = end.toISOString().slice(0, 10) + "T00:00:00";
      }

      const { data, error } = await supabase
        .from("page_views")
        .select("created_at, session_id, referrer")
        .gte("created_at", from)
        .lte("created_at", to)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const views = data || [];
      setTotal(views.length);

      if (filter === "day") {
        // Agrupar por hora
        const byHour = {};
        views.forEach(v => {
          const h = new Date(v.created_at).getHours();
          const label = h < 12 ? `${h === 0 ? 12 : h}:00 a.m.` : `${h === 12 ? 12 : h - 12}:00 p.m.`;
          byHour[h] = { label, count: (byHour[h]?.count || 0) + 1 };
        });
        setRows(Object.values(byHour).sort((a, b) => {
          const ha = parseInt(a.label); const hb = parseInt(b.label);
          return hb - ha;
        }));
      } else {
        // Agrupar por día
        const byDay = {};
        views.forEach(v => {
          const d = v.created_at.slice(0, 10);
          byDay[d] = (byDay[d] || 0) + 1;
        });
        setRows(Object.entries(byDay)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([date, count]) => ({
            label: new Date(date + "T12:00:00").toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" }),
            count,
          }))
        );
      }
    } catch (e) {
      console.error("[Analytics]", e);
    }
    setLoading(false);
  };

  // ── Visitantes en tiempo real (últimos 5 min) ─────────────────────
  const loadLive = async () => {
    const since = new Date(Date.now() - REALTIME_WINDOW_MIN * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("page_views")
      .select("session_id, created_at, referrer")
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    const seen = new Set();
    const unique = (data || []).filter(v => {
      if (seen.has(v.session_id)) return false;
      seen.add(v.session_id);
      return true;
    });
    setLiveCount(unique.length);
    setLiveVisitors(unique.slice(0, 8));
  };

  useEffect(() => {
    loadLive();
    const interval = setInterval(loadLive, 30_000);

    // Suscripción Realtime para nuevas visitas
    channelRef.current = supabase
      .channel("page_views_live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "page_views" }, () => {
        loadLive();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  useEffect(() => { loadStats(); }, [filter, selectedDate, selectedMonth]);

  const maxCount = rows.length > 0 ? Math.max(...rows.map(r => r.count), 1) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-heading text-2xl text-ec-dark">Analítica Web</h2>
        <p className="font-body text-sm text-ec-text-muted mt-0.5">Visitas en tiempo real y por período</p>
      </div>

      {/* Visitantes en tiempo real */}
      <div className="bg-white border border-black/[0.06] rounded-sm p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <h3 className="font-ui text-[11px] tracking-[0.2em] uppercase text-ec-text-muted">Ahora en el sitio</h3>
          </div>
          <Badge color="green">{liveCount} {liveCount === 1 ? "visitante" : "visitantes"}</Badge>
        </div>

        {liveCount === 0 ? (
          <p className="font-body text-sm text-ec-text-muted text-center py-4">Sin visitantes activos ahora mismo</p>
        ) : (
          <div className="space-y-2">
            {liveVisitors.map((v, i) => {
              const mins = Math.floor((Date.now() - new Date(v.created_at).getTime()) / 60000);
              return (
                <div key={v.session_id + i} className="flex items-center justify-between py-2 border-b border-black/[0.04] last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-ec-gold/10 flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                    <span className="font-body text-sm text-ec-dark">
                      {v.referrer && v.referrer !== "direct" ? (
                        <span className="text-ec-text-muted text-xs">vía {v.referrer.replace(/https?:\/\/(www\.)?/, "").split("/")[0]}</span>
                      ) : (
                        <span className="text-ec-text-muted text-xs">acceso directo</span>
                      )}
                    </span>
                  </div>
                  <span className="font-ui text-[10px] text-ec-text-muted tracking-wider">
                    {mins === 0 ? "justo ahora" : `hace ${mins} min`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <p className="font-ui text-[9px] text-ec-text-muted/60 tracking-wider mt-3">Activos en los últimos {REALTIME_WINDOW_MIN} minutos · actualiza cada 30s</p>
      </div>

      {/* Filtro histórico */}
      <div className="bg-white border border-black/[0.06] rounded-sm p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-ui text-[11px] tracking-[0.2em] uppercase text-ec-text-muted">Visitas por período</h3>
            {!loading && <p className="font-heading text-3xl text-ec-dark mt-1">{fmt(total)} <span className="text-base font-body text-ec-text-muted">visitas</span></p>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Día / Mes toggle */}
            <div className="flex bg-ec-cream rounded-sm overflow-hidden border border-black/[0.06]">
              {["day", "month"].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 font-ui text-[10px] tracking-[0.15em] uppercase transition-all ${filter === f ? "bg-ec-gold text-white" : "text-ec-text-muted hover:text-ec-dark"}`}
                >
                  {f === "day" ? "Día" : "Mes"}
                </button>
              ))}
            </div>
            {/* Selector de fecha */}
            {filter === "day" ? (
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-black/[0.08] rounded-sm font-body text-sm bg-ec-cream focus:border-ec-gold focus:outline-none"
              />
            ) : (
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-black/[0.08] rounded-sm font-body text-sm bg-ec-cream focus:border-ec-gold focus:outline-none"
              />
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-ec-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-body text-sm text-ec-text-muted">Sin visitas en este período</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="font-ui text-[10px] tracking-wider text-ec-text-muted w-28 flex-shrink-0 text-right">{row.label}</span>
                <div className="flex-1 bg-ec-cream rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-ec-gold rounded-full transition-all duration-500"
                    style={{ width: `${(row.count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="font-ui text-[11px] text-ec-dark w-8 text-right">{row.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
