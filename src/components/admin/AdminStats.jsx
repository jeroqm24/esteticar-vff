import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { db } from "../../lib/storage";
import { format, startOfMonth, endOfMonth, subMonths, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";
import { BRAND } from "../../lib/constants";

// Mini Sparkline chart drawn on canvas
function Sparkline({ data, color = "#B8860B", width = 120, height = 40 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const max = Math.max(...data, 1);
    const step = width / (data.length - 1 || 1);

    // Fill gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, color + "20");
    gradient.addColorStop(1, color + "00");
    ctx.beginPath();
    ctx.moveTo(0, height);
    data.forEach((v, i) => {
      const x = i * step;
      const y = height - (v / max) * (height - 4);
      if (i === 0) ctx.lineTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = i * step;
      const y = height - (v / max) * (height - 4);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // End dot
    const lastX = (data.length - 1) * step;
    const lastY = height - (data[data.length - 1] / max) * (height - 4);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }, [data, color, width, height]);

  return <canvas ref={canvasRef} style={{ width, height }} className="opacity-80" />;
}

function StatCard({ label, value, sub, index, sparkData, trend }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.6 }}
      className="p-8 border border-black/[0.06] bg-white rounded-sm shadow-[0_2px_20px_rgba(0,0,0,0.04)] relative overflow-hidden group hover:border-ec-gold/20 transition-all duration-500"
    >
      <div className="flex items-start justify-between mb-4">
        <p className="font-ui text-[10px] tracking-[0.3em] text-ec-text-muted uppercase">{label}</p>
        {trend !== undefined && (
          <span className={`font-ui text-[10px] tracking-wider ${trend >= 0 ? "text-green-500" : "text-red-400"}`}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="flex items-end justify-between">
        <p className="font-heading text-5xl font-light text-ec-gold">{value}</p>
        {sparkData && sparkData.length > 1 && (
          <Sparkline data={sparkData} />
        )}
      </div>
      {sub && <p className="font-body text-xs mt-3 text-ec-text-muted font-light">{sub}</p>}
      <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-ec-gold group-hover:w-full transition-all duration-700" />
    </motion.div>
  );
}

function QuickAction({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 p-5 border border-black/[0.06] bg-white hover:bg-ec-gold/[0.04] hover:border-ec-gold/20 transition-all duration-300 rounded-sm group"
    >
      <div className="w-10 h-10 bg-ec-gold/10 text-ec-gold flex items-center justify-center rounded-sm group-hover:bg-ec-gold group-hover:text-white transition-all duration-300">
        {icon}
      </div>
      <span className="font-ui text-[11px] tracking-[0.2em] text-ec-text-secondary uppercase group-hover:text-ec-dark transition-colors">{label}</span>
    </button>
  );
}

export default function AdminStats() {
  const [stats, setStats] = useState({ total: 0, thisMonth: 0, pending: 0, revenue: 0, recent: [], dailyData: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    const all = await db.appointments.list();
    const now = new Date();
    const start = format(startOfMonth(now), "yyyy-MM-dd");
    const end = format(endOfMonth(now), "yyyy-MM-dd");
    const thisMonth = all.filter((a) => a.date >= start && a.date <= end);
    const pending = all.filter((a) => a.status === "pending" || a.status === "confirmed");
    const revenue = all.filter((a) => a.status === "completed").reduce((sum, a) => sum + (a.total_amount || 0), 0);

    // Generate sparkline data for the last 14 days
    const days = eachDayOfInterval({
      start: subMonths(now, 1),
      end: now,
    });
    const dailyData = days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      return all.filter((a) => a.date === dayStr).length;
    });

    // Compute revenue sparkline (last 7 days)
    const last7 = days.slice(-7);
    const revenueData = last7.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      return all.filter((a) => a.date === dayStr && a.status === "completed").reduce((s, a) => s + (a.total_amount || 0), 0);
    });

    setStats({
      total: all.length,
      thisMonth: thisMonth.length,
      pending: pending.length,
      revenue,
      recent: all.slice(0, 5),
      dailyData,
      revenueData,
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-ec-text-muted">
        <div className="w-8 h-8 border-2 border-ec-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-6">
        <img src={BRAND.logo} alt="" className="h-14 object-contain" />
        <div>
          <h2 className="font-heading text-3xl text-ec-dark">Centro de Control</h2>
          <p className="font-body text-sm text-ec-text-muted capitalize font-light">
            {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
          </p>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Citas Totales" value={stats.total} index={0} sparkData={stats.dailyData} />
        <StatCard label="Este Mes" value={stats.thisMonth} index={1} trend={stats.thisMonth > 0 ? 12 : 0} />
        <StatCard label="Por Atender" value={stats.pending} index={2} sub="Pendientes + Confirmadas" />
        <StatCard label="Ingresos" value={`$${(stats.revenue / 1000).toFixed(0)}K`} sub="Servicios completados" index={3} sparkData={stats.revenueData} />
      </div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <h3 className="font-heading text-xl text-ec-dark mb-6">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction
            label="Nueva Cita"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
          />
          <QuickAction
            label="Exportar Datos"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
          />
          <QuickAction
            label="Configurar Bot"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/></svg>}
          />
          <QuickAction
            label="Ver Calendario"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
          />
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="border border-black/[0.06] bg-white overflow-hidden rounded-sm shadow-[0_4px_30px_rgba(0,0,0,0.06)]"
      >
        <div className="px-8 py-6 border-b border-black/[0.06] flex items-center justify-between">
          <h3 className="font-heading text-xl text-ec-dark">Actividad Reciente</h3>
          <span className="font-ui text-[10px] tracking-[0.2em] text-ec-text-muted uppercase">Últimos movimientos</span>
        </div>
        <div className="divide-y divide-black/[0.04]">
          {stats.recent.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-ec-gold/10 border border-ec-gold/15 flex items-center justify-center rounded-sm">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-ec-gold/50">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                  <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
                </svg>
              </div>
              <p className="font-heading text-lg text-ec-dark mb-2">Sin actividad aún</p>
              <p className="font-body text-sm text-ec-text-muted font-light max-w-xs mx-auto">
                Las citas reservadas desde el sitio web aparecerán aquí automáticamente.
              </p>
            </div>
          ) : (
            stats.recent.map((a) => (
              <div key={a.id} className="px-8 py-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 hover:bg-ec-cream/50 transition-colors">
                <div className="flex-1">
                  <p className="font-heading text-lg text-ec-dark">{a.client_name}</p>
                  <p className="font-body text-xs mt-1 text-ec-text-muted font-light">{a.client_email}</p>
                </div>
                <div className="text-right">
                  <p className="font-ui text-xs tracking-wider text-ec-gold">{a.date} · {a.time || "—"}</p>
                </div>
                <span
                  className="font-ui text-[9px] tracking-[0.2em] uppercase px-4 py-1.5 self-start sm:self-auto rounded-sm"
                  style={{
                    background: a.status === "completed" ? "rgba(34,197,94,0.08)" : a.status === "cancelled" ? "rgba(239,68,68,0.08)" : "rgba(184,134,11,0.06)",
                    color: a.status === "completed" ? "#16a34a" : a.status === "cancelled" ? "#dc2626" : "var(--color-ec-gold)",
                    border: `1px solid ${a.status === "completed" ? "rgba(34,197,94,0.2)" : a.status === "cancelled" ? "rgba(239,68,68,0.2)" : "rgba(184,134,11,0.2)"}`,
                  }}
                >
                  {a.status}
                </span>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
