import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO, addDays } from "date-fns";
import { es } from "date-fns/locale";

const ADMIN_KEY = 'Esteticar11.';

const PERIOD_CONFIG = {
  morning:   { label: "Mañana",    sub: "8:00 – 12:00", color: "#F59E0B", bg: "#FEF9ED", border: "#F8C840" },
  afternoon: { label: "Tarde",     sub: "12:00 – cierre", color: "#3B82F6", bg: "#EFF6FF", border: "#93C5FD" },
  full:      { label: "Todo el día", sub: "Sin citas",   color: "#EF4444", bg: "#FEF2F2", border: "#FCA5A5" },
};

const formatDateES = (isoDate) => {
  try {
    return format(parseISO(isoDate + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es });
  } catch { return isoDate; }
};

const todayISO = () => format(new Date(), 'yyyy-MM-dd');

export default function AdminBlocks() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState({ date: todayISO(), period: 'full', reason: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/blocks', { headers: { 'x-admin-key': ADMIN_KEY } });
      const data = await res.json();
      setBlocks(Array.isArray(data) ? data : []);
    } catch { setBlocks([]); }
    setLoading(false);
  };

  const handleAdd = async () => {
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
        body: JSON.stringify({ date: form.date, period: form.period, reason: form.reason.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Error al guardar'); }
      else {
        setBlocks(prev => [...prev, json].sort((a, b) => a.date.localeCompare(b.date)));
        setForm(f => ({ ...f, reason: '' }));
        setSuccess('Bloqueo guardado');
        setTimeout(() => setSuccess(''), 2500);
      }
    } catch { setError('Error de conexión'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await fetch('/api/blocks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
        body: JSON.stringify({ id }),
      });
      setBlocks(prev => prev.filter(b => b.id !== id));
    } catch {}
    setDeleting(null);
  };

  const inputCls = "w-full bg-transparent border-0 border-b border-black/[0.1] py-2 font-body text-sm text-ec-dark focus:outline-none focus:border-[#F8C840] transition-colors";

  return (
    <div className="space-y-6 sm:space-y-10 max-w-2xl mx-auto">

      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h2 className="font-heading text-2xl sm:text-3xl text-ec-dark">Bloquear Agenda</h2>
        <p className="font-body text-sm text-ec-text-muted font-light mt-1">
          El bot no ofrecerá citas en las franjas bloqueadas.
        </p>
      </motion.div>

      {/* Formulario nuevo bloqueo */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-black/[0.06] rounded-sm shadow-[0_2px_20px_rgba(0,0,0,0.04)] overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-black/[0.05]">
          <p className="font-ui text-[10px] tracking-[0.25em] text-ec-gold uppercase">Nuevo bloqueo</p>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Fecha */}
          <div>
            <label className="font-ui text-[9px] tracking-[0.2em] text-ec-text-muted uppercase block mb-1">Fecha</label>
            <input
              type="date"
              value={form.date}
              min={todayISO()}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className={inputCls}
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Período */}
          <div>
            <label className="font-ui text-[9px] tracking-[0.2em] text-ec-text-muted uppercase block mb-2">Franja</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PERIOD_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setForm(f => ({ ...f, period: key }))}
                  className="flex flex-col items-start px-4 py-2.5 rounded-sm border transition-all duration-200"
                  style={form.period === key
                    ? { background: cfg.bg, borderColor: cfg.border, color: cfg.color }
                    : { background: 'transparent', borderColor: 'rgba(0,0,0,0.08)', color: '#8696A0' }
                  }
                >
                  <span className="font-ui text-[11px] tracking-[0.15em] uppercase font-bold">{cfg.label}</span>
                  <span className="font-body text-[10px] mt-0.5 opacity-70">{cfg.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Razón (opcional) */}
          <div>
            <label className="font-ui text-[9px] tracking-[0.2em] text-ec-text-muted uppercase block mb-1">Razón (opcional)</label>
            <input
              type="text"
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="ej: diligencia personal, mantenimiento del local..."
              className={inputCls}
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Error / éxito */}
          {error && <p className="font-body text-xs text-red-500">{error}</p>}
          {success && <p className="font-body text-xs text-green-600">{success}</p>}

          <button
            onClick={handleAdd}
            disabled={saving || !form.date}
            className="w-full py-3 bg-[#F8C840] text-white font-ui text-[10px] tracking-[0.25em] uppercase rounded-sm hover:bg-[#e6b800] disabled:opacity-40 transition-all shadow-sm"
          >
            {saving ? 'Guardando...' : 'Bloquear franja'}
          </button>
        </div>
      </motion.div>

      {/* Lista de bloqueos activos */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-black/[0.06] rounded-sm shadow-[0_2px_20px_rgba(0,0,0,0.04)] overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-black/[0.05] flex items-center justify-between">
          <p className="font-ui text-[10px] tracking-[0.25em] text-ec-gold uppercase">Bloqueos activos</p>
          {loading && <div className="w-4 h-4 border-2 border-ec-gold border-t-transparent rounded-full animate-spin" />}
        </div>

        <div className="divide-y divide-black/[0.04]">
          {!loading && blocks.length === 0 && (
            <div className="px-5 py-10 text-center">
              <p className="font-body text-sm text-ec-text-muted font-light">No hay bloqueos activos.</p>
              <p className="font-body text-xs text-ec-text-muted/60 mt-1">El bot puede agendar en cualquier franja disponible.</p>
            </div>
          )}

          <AnimatePresence>
            {blocks.map(b => {
              const cfg = PERIOD_CONFIG[b.period] || PERIOD_CONFIG.full;
              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className="px-5 py-4 flex items-center gap-4"
                >
                  {/* Color dot */}
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />

                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-base text-ec-dark capitalize">{formatDateES(b.date)}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span
                        className="font-ui text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-sm"
                        style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                      >
                        {cfg.label} · {cfg.sub}
                      </span>
                      {b.reason && (
                        <span className="font-body text-[10px] text-ec-text-muted italic truncate">{b.reason}</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(b.id)}
                    disabled={deleting === b.id}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-ec-text-muted hover:bg-red-50 hover:text-red-500 transition-all"
                    title="Eliminar bloqueo"
                  >
                    {deleting === b.id
                      ? <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    }
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="p-4 bg-ec-gold/[0.05] border border-ec-gold/20 rounded-sm"
      >
        <p className="font-ui text-[9px] tracking-[0.2em] text-ec-gold uppercase mb-1">Cómo funciona</p>
        <p className="font-body text-xs text-ec-text-muted font-light leading-relaxed">
          Cuando un cliente le pida cita al bot en una franja bloqueada, el bot automáticamente le dirá que no hay disponibilidad en ese horario y le ofrecerá otro momento libre.
        </p>
      </motion.div>
    </div>
  );
}
