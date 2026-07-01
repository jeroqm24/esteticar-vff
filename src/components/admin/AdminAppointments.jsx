import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db, email } from "../../lib/storage";

const fmtTime = (t) => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h)) return t;
  const suffix = h < 12 ? "a.m." : "p.m.";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m || 0).padStart(2, "0")} ${suffix}`;
};

const SERVICE_DURATIONS = {
  "Descontaminación de Vidrios (parabrisas)": 1,
  "Descontaminación de Vidrios": 2,
  "Tratamiento 3 en 1 a Máquina": 5,
  "Tratamiento 3 en 1 Manual": 4,
  "Mantenimiento Interior Sólo Cojinería": 16,
  "Mantenimiento Interior Levantamiento del Alfombrado": 16,
  "Mantenimiento Interior": 16,
  "Lavado de Cojinería": 4,
  "Restauración de Farolas": 2,
  "Brillado a Máquina": 3,
  "Recubrimiento Cerámico": 6,
  "Porcelanizado": 5,
  "Limpieza Técnica de Motor": 1,
  "Lavado de Techo": 1,
  "Lavado de Chasis": 1,
  "Lavada Esencial": 2,
  "Brillado de Farolas": 1,
  "Brillado de Tanque": 1,
  "Descontaminación de Tubería": 1,
  default: 2,
};

const calcEntrega = (appt) => {
  if (!appt?.time) return null;
  const [h] = appt.time.split(":").map(Number);
  if (isNaN(h)) return null;
  const svcs = (appt.service || "").split(",").map(s => s.trim()).filter(Boolean);
  let dur = svcs.reduce((sum, svc) => {
    const key = Object.keys(SERVICE_DURATIONS).find(k => svc.includes(k) || k.includes(svc));
    return sum + (SERVICE_DURATIONS[key] || 0);
  }, 0);
  if (!dur) dur = SERVICE_DURATIONS.default;
  const exitH = Math.min(h + dur, 23);
  const suffix = exitH < 12 ? "a.m." : "p.m.";
  const h12 = exitH % 12 || 12;
  return `~${h12}:00 ${suffix}`;
};

const STATUS_OPTIONS = ["confirmada", "cancelada"];
const ORIGIN_OPTIONS = ["Bot", "Instagram", "Facebook", "Referido", "Calle", "Otro"];
const STATUS_LABELS = {
  confirmada: "Confirmada", cancelada: "Cancelada",
  // legacy — solo para mostrar registros viejos
  pending: "Pendiente", confirmed: "Confirmada", in_progress: "En proceso",
  completed: "Completada", cancelled: "Cancelada",
};
const STATUS_COLORS = {
  confirmada:  { bg: "#F0FDF4", text: "#16A34A", border: "#86EFAC", bar: "#22C55E" },
  cancelada:   { bg: "#FEF2F2", text: "#DC2626", border: "#FCA5A5", bar: "#EF4444" },
  // legacy
  pending:     { bg: "#FEF9ED", text: "#B8860B", border: "#F8C840", bar: "#F8C840" },
  confirmed:   { bg: "#F0FDF4", text: "#16A34A", border: "#86EFAC", bar: "#22C55E" },
  in_progress: { bg: "#EFF6FF", text: "#2563EB", border: "#93C5FD", bar: "#3B82F6" },
  completed:   { bg: "#F0FDF4", text: "#16A34A", border: "#86EFAC", bar: "#22C55E" },
  cancelled:   { bg: "#FEF2F2", text: "#DC2626", border: "#FCA5A5", bar: "#EF4444" },
};

const REMARKETING_CONFIG = {
  efectivo:     { label: "Efectivo",      bg: "#F0FDF4", text: "#16A34A", border: "#86EFAC" },
  converted:    { label: "Efectivo",      bg: "#F0FDF4", text: "#16A34A", border: "#86EFAC" },
  potencial:    { label: "Potencial",     bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA" },
  desinteresado:{ label: "Desinteresado", bg: "#F8FAFC", text: "#64748B", border: "#CBD5E1" },
};

function RemarkBadge({ status }) {
  if (!status || !REMARKETING_CONFIG[status]) return null;
  const c = REMARKETING_CONFIG[status];
  return (
    <span className="font-ui text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 rounded-full border"
      style={{ background: c.bg, color: c.text, borderColor: c.border }}>
      {c.label}
    </span>
  );
}

const CHANNEL_CFG = {
  whatsapp:  { label: "WhatsApp",  bg: "#25D366" },
  instagram: { label: "Instagram", bg: "#C13584" },
  messenger: { label: "Messenger", bg: "#006AFF" },
  manual:    { label: "Manual",    bg: "#94A3B8" },
};

const LEAD_TYPE_CFG = {
  regateador: { emoji: "🫰", label: "Regateador", bg: "#FEF3C7", color: "#92400E", border: "#FCD34D" },
  analista:   { emoji: "📚", label: "Analista",   bg: "#EFF6FF", color: "#1D4ED8", border: "#93C5FD" },
  embalado:   { emoji: "⚡", label: "Embalado",   bg: "#FFF7ED", color: "#C2410C", border: "#FED7AA" },
  billetudo:  { emoji: "💸", label: "Billetudo",  bg: "#FDF4E7", color: "#92400E", border: "#F8C840" },
};

function ChannelIcon({ channel, size = 14 }) {
  const s = size;
  if (channel === "whatsapp") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="white">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
  if (channel === "instagram") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="white">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  );
  if (channel === "messenger") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="white">
      <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/>
    </svg>
  );
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function ChannelBadge({ channel, size = "sm" }) {
  const cfg = CHANNEL_CFG[channel];
  if (!cfg) return null;
  const iconSize = size === "sm" ? 11 : 15;
  const cls = size === "sm" ? "w-[18px] h-[18px]" : "w-7 h-7";
  return (
    <div className={`${cls} rounded-full flex items-center justify-center flex-shrink-0`} style={{ background: cfg.bg }} title={cfg.label}>
      <ChannelIcon channel={channel} size={iconSize} />
    </div>
  );
}

function LeadTypeBadge({ leadType }) {
  if (!leadType) return null;
  const cfg = LEAD_TYPE_CFG[leadType.toLowerCase()];
  if (!cfg) return null;
  return (
    <span className="font-ui text-[9px] tracking-[0.1em] uppercase px-2.5 py-1 rounded-full border"
      style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

const normalizeStatus = (s) => {
  if (!s) return "confirmada";
  if (s === "cancelada" || s === "cancelled") return "cancelada";
  return "confirmada";
};

function StatusBadge({ status }) {
  const ns = normalizeStatus(status);
  const c = STATUS_COLORS[ns];
  return (
    <span
      className="font-ui text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 rounded-full"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {STATUS_LABELS[ns]}
    </span>
  );
}

function ConfirmDeleteModal({ name, onConfirm, onCancel, loading }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[600] bg-black/40 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </div>
        <h3 className="font-heading text-xl text-ec-dark text-center mb-2">Eliminar cita</h3>
        <p className="font-body text-sm text-ec-text-muted text-center mb-6">
          ¿Seguro que deseas eliminar la cita de <strong className="text-ec-dark">{name}</strong>? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 border border-black/[0.1] text-ec-text-muted font-ui text-[10px] tracking-[0.2em] uppercase rounded-lg hover:bg-ec-cream transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 bg-red-500 text-white font-ui text-[10px] tracking-[0.2em] uppercase rounded-lg hover:bg-red-600 disabled:opacity-40 transition-all"
          >
            {loading ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

const VEHICLE_OPTIONS = ["Carro", "Camioneta", "Moto"];
const TRASLADO_OPTIONS = [
  { value: "", label: "Sin traslado" },
  { value: "Solo recogida", label: "Solo recogida · $7.000" },
  { value: "Solo entrega", label: "Solo entrega · $7.000" },
  { value: "Recogida y entrega", label: "Recogida y entrega · $9.000" },
];
const HOUR_START = 8;
const HOUR_END = 18;

function EditAppointmentModal({ appt, onClose, onSave }) {
  const [form, setForm] = useState({
    clientName: appt.clientName || "",
    clientPhone: appt.clientPhone || "",
    clientEmail: appt.clientEmail || "",
    service: appt.service || "",
    vehicleType: appt.vehicleType || "Carro",
    date: appt.date || "",
    time: appt.time || "09:00",
    traslado: appt.traslado || "",
    notes: appt.notes || "",
    priceDisplay: appt.priceDisplay || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.clientName.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const inputCls = "w-full bg-transparent border-0 border-b border-black/[0.1] py-2 font-body text-sm text-ec-dark focus:outline-none focus:border-[#F8C840] transition-colors placeholder-black/25";
  const selectCls = "w-full bg-transparent border-0 border-b border-black/[0.1] py-2 font-body text-sm text-ec-dark focus:outline-none focus:border-[#F8C840] transition-colors";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[700] bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 16 }}
        transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-2 bg-[#F8C840]" />
        <div className="px-6 pt-5 pb-4 flex items-center justify-between gap-4">
          <h3 className="font-heading text-xl text-ec-dark">Editar cita</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-ec-text-muted hover:bg-ec-cream hover:text-ec-dark transition-all text-lg">✕</button>
        </div>

        <div className="px-6 pb-6 space-y-0 max-h-[70dvh] overflow-y-auto">
          {/* Nombre */}
          <div className="flex items-center gap-3 py-3 border-b border-black/[0.05]">
            <svg className="text-ec-text-muted flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            </svg>
            <input
              value={form.clientName}
              onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
              placeholder="Nombre del cliente"
              className={inputCls}
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Teléfono */}
          <div className="flex items-center gap-3 py-3 border-b border-black/[0.05]">
            <svg className="text-ec-text-muted flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 2.91 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/>
            </svg>
            <input
              value={form.clientPhone}
              onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))}
              placeholder="Teléfono"
              className={inputCls}
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Email */}
          <div className="flex items-center gap-3 py-3 border-b border-black/[0.05]">
            <svg className="text-ec-text-muted flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
            </svg>
            <input
              value={form.clientEmail}
              onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))}
              placeholder="Correo electrónico"
              type="email"
              className={inputCls}
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Fecha */}
          <div className="flex items-center gap-3 py-3 border-b border-black/[0.05]">
            <svg className="text-ec-text-muted flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <input
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              placeholder="Fecha (ej: lunes, 7 de julio a las 09:00)"
              className={inputCls}
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Hora */}
          <div className="flex items-center gap-3 py-3 border-b border-black/[0.05]">
            <svg className="text-ec-text-muted flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <div className="flex items-center gap-1">
              <select
                value={form.time.split(':')[0]}
                onChange={e => setForm(f => ({ ...f, time: `${e.target.value}:${f.time.split(':')[1] || '00'}` }))}
                className="font-body text-sm text-ec-dark bg-transparent border-0 focus:outline-none cursor-pointer"
                style={{ fontSize: '16px' }}
              >
                {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i).map(h => (
                  <option key={h} value={String(h).padStart(2, '0')}>{String(h).padStart(2, '0')}</option>
                ))}
              </select>
              <span className="text-ec-text-muted">:</span>
              <select
                value={form.time.split(':')[1] || '00'}
                onChange={e => setForm(f => ({ ...f, time: `${f.time.split(':')[0]}:${e.target.value}` }))}
                className="font-body text-sm text-ec-dark bg-transparent border-0 focus:outline-none cursor-pointer"
                style={{ fontSize: '16px' }}
              >
                {['00', '15', '30', '45'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Vehículo */}
          <div className="flex items-center gap-3 py-3 border-b border-black/[0.05]">
            <svg className="text-ec-text-muted flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="1" y="9" width="22" height="10" rx="2"/><path d="M5 9V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><circle cx="7" cy="19" r="1"/><circle cx="17" cy="19" r="1"/>
            </svg>
            <select
              value={form.vehicleType}
              onChange={e => setForm(f => ({ ...f, vehicleType: e.target.value }))}
              className={selectCls}
              style={{ fontSize: '16px' }}
            >
              {VEHICLE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {/* Servicio */}
          <div className="flex items-center gap-3 py-3 border-b border-black/[0.05]">
            <svg className="text-ec-text-muted flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            <input
              value={form.service}
              onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
              placeholder="Servicio"
              className={inputCls}
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Traslado */}
          <div className="flex items-center gap-3 py-3 border-b border-black/[0.05]">
            <svg className="text-ec-text-muted flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/><rect x="9" y="11" width="14" height="10" rx="1"/><circle cx="12" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            </svg>
            <select
              value={form.traslado}
              onChange={e => setForm(f => ({ ...f, traslado: e.target.value }))}
              className={selectCls}
              style={{ fontSize: '16px' }}
            >
              {TRASLADO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Precio */}
          <div className="flex items-center gap-3 py-3 border-b border-black/[0.05]">
            <svg className="text-ec-text-muted flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            <input
              value={form.priceDisplay}
              onChange={e => setForm(f => ({ ...f, priceDisplay: e.target.value }))}
              placeholder="Precio (ej: $49.000)"
              className={inputCls}
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Notas */}
          <div className="flex items-start gap-3 py-3">
            <svg className="text-ec-text-muted flex-shrink-0 mt-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Notas internas"
              rows={3}
              className="w-full bg-transparent border-0 border-b border-black/[0.1] py-2 font-body text-sm text-ec-dark focus:outline-none focus:border-[#F8C840] transition-colors placeholder-black/25 resize-none"
              style={{ fontSize: '16px' }}
            />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-black/[0.1] text-ec-text-muted font-ui text-[10px] tracking-[0.2em] uppercase rounded-lg hover:bg-ec-cream transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.clientName.trim()}
            className="flex-1 py-3 bg-[#F8C840] text-white font-ui text-[10px] tracking-[0.2em] uppercase rounded-lg hover:bg-[#B8860B] disabled:opacity-40 transition-all"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [registeringCAPI, setRegisteringCAPI] = useState(false);
  const [capiDone, setCapiDone] = useState({});
  const [editTarget, setEditTarget] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const data = await db.appointments.list();
    setAppointments(data);
    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    await db.appointments.update(id, { status });
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    if (selected?.id === id) setSelected(prev => ({ ...prev, status }));
    if (status === 'confirmada') {
      const appt = appointments.find(a => a.id === id);
      if (appt) registerConversion(appt);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const targetId = deleteTarget.id;
    setDeleteTarget(null);
    await db.appointments.delete(targetId);
    if (selected?.id === targetId) { setSelected(null); setShowDetail(false); }
    await load();
    setDeleting(false);
  };

  const sendReminderEmail = async (appt) => {
    setSending(true);
    const services = (appt.services || []).map(s => s.name).join(", ") || appt.service || "Servicio Esteticar";
    const html = `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tu cita en Esteticar</title></head>
<body style="margin:0;padding:0;background:#F4F1EC;font-family:Georgia,serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1EC;padding:40px 16px">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#ffffff;border-radius:2px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.10)">

  <!-- HEADER -->
  <tr><td style="background:#0A0A0A;padding:36px 40px;text-align:center;border-bottom:3px solid #C9A84C">
    <img src="https://esteticar-vff.vercel.app/logo.png" alt="Esteticar" width="120" style="display:block;margin:0 auto 12px;height:auto" />
    <div style="color:#C9A84C;font-size:9px;letter-spacing:4px;font-family:Arial,sans-serif;font-weight:600;text-transform:uppercase">Custodia Vehicular Premium · Manizales</div>
  </td></tr>

  <!-- BADGE -->
  <tr><td style="background:#0A0A0A;padding:0 40px 28px;text-align:center">
    <div style="display:inline-block;background:#C9A84C;color:#0A0A0A;font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;padding:7px 20px;border-radius:2px">Recordatorio de cita</div>
  </td></tr>

  <!-- SALUDO -->
  <tr><td style="padding:36px 40px 0">
    <p style="margin:0;font-size:22px;color:#0A0A0A;font-weight:400;line-height:1.3">Hola, ${appt.clientName}.</p>
    <p style="margin:10px 0 0;font-size:14px;color:#888;font-family:Arial,sans-serif;line-height:1.6">Te recordamos que tienes una cita próxima con nosotros. Aquí están los detalles de tu servicio.</p>
    <div style="margin:24px 0 0;height:1px;background:linear-gradient(90deg,#C9A84C 0%,#f4f1ec 100%)"></div>
  </td></tr>

  <!-- DATA GRID -->
  <tr><td style="padding:28px 40px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="44%" style="padding:14px 16px;background:#FAF8F4;border-radius:2px 0 0 2px;font-family:Arial,sans-serif;font-size:10px;color:#A0916E;letter-spacing:2px;text-transform:uppercase;font-weight:600;vertical-align:middle">Servicio</td>
        <td style="padding:14px 16px;background:#FAF8F4;border-radius:0 2px 2px 0;font-size:15px;color:#0A0A0A;font-weight:600;vertical-align:middle">${services}</td>
      </tr>
      <tr><td colspan="2" style="height:4px"></td></tr>
      <tr>
        <td style="padding:14px 16px;background:#FAF8F4;font-family:Arial,sans-serif;font-size:10px;color:#A0916E;letter-spacing:2px;text-transform:uppercase;font-weight:600;vertical-align:middle">Fecha</td>
        <td style="padding:14px 16px;background:#FAF8F4;font-size:15px;color:#0A0A0A;font-weight:600;vertical-align:middle">${appt.date}</td>
      </tr>
      <tr><td colspan="2" style="height:4px"></td></tr>
      <tr>
        <td style="padding:14px 16px;background:#FAF8F4;font-family:Arial,sans-serif;font-size:10px;color:#A0916E;letter-spacing:2px;text-transform:uppercase;font-weight:600;vertical-align:middle">Hora</td>
        <td style="padding:14px 16px;background:#FAF8F4;font-size:15px;color:#0A0A0A;font-weight:600;vertical-align:middle">${appt.time || "Por confirmar"}</td>
      </tr>
      ${appt.confirmationCode ? `
      <tr><td colspan="2" style="height:4px"></td></tr>
      <tr>
        <td style="padding:14px 16px;background:#FAF8F4;font-family:Arial,sans-serif;font-size:10px;color:#A0916E;letter-spacing:2px;text-transform:uppercase;font-weight:600;vertical-align:middle">Código</td>
        <td style="padding:14px 16px;background:#FAF8F4;font-size:16px;color:#0A0A0A;font-weight:700;font-family:'Courier New',monospace;letter-spacing:2px;vertical-align:middle">${appt.confirmationCode}</td>
      </tr>` : ''}
    </table>
  </td></tr>

  <!-- MENSAJE PREMIUM -->
  <tr><td style="padding:0 40px 36px">
    <div style="padding:20px 24px;background:#0A0A0A;border-radius:2px;text-align:center">
      <p style="margin:0;font-size:14px;color:#C9A84C;font-style:italic;line-height:1.7">"Cuidamos tu vehículo como si fuera nuestro."</p>
      <p style="margin:10px 0 0;font-family:Arial,sans-serif;font-size:11px;color:#555;letter-spacing:1px">Si necesitas cambiar tu cita, escríbenos por WhatsApp.</p>
    </div>
  </td></tr>

  <!-- CTAs -->
  <tr><td style="padding:0 40px 20px;text-align:center">
    <a href="https://maps.google.com/?q=Cra+27+48-26+Manizales" style="display:inline-block;background:#0A0A0A;color:#C9A84C;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:15px 26px;border-radius:50px;border:1.5px solid #C9A84C;margin-right:10px">Google Maps →</a>
    <a href="https://waze.com/ul?q=Cra+27+48-26+Manizales&navigate=yes" style="display:inline-block;background:#0A0A0A;color:#C9A84C;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:15px 26px;border-radius:50px;border:1.5px solid #C9A84C">Waze →</a>
  </td></tr>
  <tr><td style="height:16px"></td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#0A0A0A;padding:24px 40px;text-align:center">
    <div style="font-family:Arial,sans-serif;font-size:11px;color:#C9A84C;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px">Esteticar</div>
    <div style="font-family:Arial,sans-serif;font-size:11px;color:#555;margin-bottom:4px">Cra 27 #48-26 · Manizales, Colombia</div>
    <div style="font-family:Arial,sans-serif;font-size:11px;color:#444">www.esteticarmanizales.com</div>
  </td></tr>

</table>
</td></tr></table>
</body></html>
    `;
    await email.send({
      to: appt.clientEmail,
      subject: `Tu cita en Esteticar — ${appt.date}`,
      html,
    });
    await db.appointments.update(appt.id, { reminderSent: true });
    setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, reminderSent: true } : a));
    if (selected?.id === appt.id) setSelected(prev => ({ ...prev, reminderSent: true }));
    setSending(false);
  };

  const updateOrigin = async (id, origin) => {
    const appt = appointments.find(a => a.id === id);
    if (!appt) return;
    await db.appointments.update(id, { ...appt, origin });
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, origin } : a));
    if (selected?.id === id) setSelected(prev => ({ ...prev, origin }));
  };

  const handleEditSave = async (updates) => {
    const id = editTarget.id;
    try {
      await db.appointments.update(id, {
        clientName: updates.clientName,
        clientPhone: updates.clientPhone,
        clientEmail: updates.clientEmail,
        service: updates.service,
        vehicleType: updates.vehicleType,
        date: updates.date,
        time: updates.time,
        traslado: updates.traslado || null,
        notes: updates.notes || null,
        price_display: updates.priceDisplay || null,
      });
      const merged = { ...editTarget, ...updates, priceDisplay: updates.priceDisplay };
      setAppointments(prev => prev.map(a => a.id === id ? merged : a));
      if (selected?.id === id) setSelected(merged);
      setEditTarget(null);
    } catch (e) {
      alert('Error al guardar: ' + (e.message || 'desconocido'));
    }
  };

  const registerConversion = async (appt) => {
    setRegisteringCAPI(true);
    try {
      const res = await fetch('/api/capi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': 'Esteticar11.' },
        body: JSON.stringify({ appointment: appt }),
      });
      const json = await res.json();
      if (json.ok) setCapiDone(prev => ({ ...prev, [appt.id]: true }));
    } catch { }
    setRegisteringCAPI(false);
  };

  const openDetail = (appt) => { setSelected(appt); setShowDetail(true); };
  const closeDetail = () => { setShowDetail(false); };

  const filtered = filter === "all" ? appointments : appointments.filter(a => normalizeStatus(a.status) === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl text-ec-dark">Citas</h2>
          <p className="font-body text-sm text-ec-text-muted mt-0.5">{appointments.length} citas en total</p>
        </div>
        <button
          onClick={load}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 border border-black/[0.08] rounded-lg font-ui text-[10px] tracking-[0.2em] uppercase text-ec-text-muted hover:border-ec-gold/40 hover:text-ec-gold transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.08-5.96"/>
          </svg>
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 font-ui text-[10px] tracking-[0.15em] uppercase rounded-full border transition-all ${
            filter === "all" ? "bg-ec-dark text-white border-ec-dark" : "bg-white text-ec-text-muted border-black/[0.1] hover:border-ec-gold/40"
          }`}
        >
          Todas <span className="ml-1 opacity-60">({appointments.length})</span>
        </button>
        {STATUS_OPTIONS.map(f => {
          const c = STATUS_COLORS[f];
          const isActive = filter === f;
          const count = appointments.filter(a => normalizeStatus(a.status) === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-2 font-ui text-[10px] tracking-[0.15em] uppercase rounded-full border transition-all"
              style={isActive
                ? { background: c.bar, color: "#fff", borderColor: c.bar }
                : { background: "#fff", color: c.text, borderColor: c.border }
              }
            >
              {STATUS_LABELS[f]} <span className="ml-1 opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* List */}
        <div className={`${showDetail ? "xl:col-span-3" : "xl:col-span-5"} space-y-3`}>
          {loading ? (
            <div className="flex items-center justify-center py-40">
              <div className="w-10 h-10 border-2 border-ec-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 text-center border border-dashed border-black/[0.1] bg-white rounded-2xl">
              <p className="font-heading text-xl text-ec-dark mb-2">Sin citas</p>
              <p className="font-body text-sm text-ec-text-muted">No hay citas en esta categoría.</p>
            </div>
          ) : (
            <AnimatePresence>
              {filtered.map(a => {
                const c = STATUS_COLORS[normalizeStatus(a.status)];
                const isSelected = selected?.id === a.id && showDetail;
                return (
                  <motion.div
                    key={a.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`group bg-white rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer ${
                      isSelected
                        ? "border-ec-gold shadow-[0_4px_24px_rgba(184,134,11,0.12)]"
                        : "border-black/[0.07] hover:border-ec-gold/30 hover:shadow-md"
                    }`}
                    onClick={() => isSelected ? closeDetail() : openDetail(a)}
                  >
                    {/* Color bar */}
                    <div className="h-1 w-full" style={{ background: c.bar }} />

                    <div className="p-5 sm:p-6">
                      <div className="flex items-start gap-4">
                        {/* Avatar with channel badge */}
                        <div className="relative w-12 h-12 flex-shrink-0">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-heading text-lg"
                            style={{ background: c.bar }}
                          >
                            {(a.clientName || "?")[0].toUpperCase()}
                          </div>
                          {a.channel && (
                            <div className="absolute -bottom-1 -right-1 ring-2 ring-white rounded-full">
                              <ChannelBadge channel={a.channel} size="sm" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <p className="font-heading text-xl text-ec-dark leading-tight">{a.clientName}</p>
                              <p className="font-body text-sm text-ec-text-muted mt-0.5">
                                {a.clientPhone || a.client_email || "—"}
                              </p>
                            </div>
                            <StatusBadge status={a.status} />
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                            <span className="flex items-center gap-1.5 font-ui text-[11px] tracking-wider text-ec-gold">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                              </svg>
                              {a.date}
                            </span>
                            <span className="flex items-center gap-1.5 font-ui text-[11px] tracking-wider text-ec-text-muted">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                              </svg>
                              {fmtTime(a.time) || "Hora por confirmar"}
                            </span>
                            {a.vehicleType && (
                              <span className="flex items-center gap-1 font-ui text-[11px] tracking-wider text-ec-text-muted">
                                {a.vehicleType === "Moto" || a.vehicleType === "moto" ? "🏍️" : "🚗"}
                                {a.vehicleType === "car" ? "Carro" : a.vehicleType === "moto" ? "Moto" : a.vehicleType}
                              </span>
                            )}
                            {a.leadType && <LeadTypeBadge leadType={a.leadType} />}
                            {a.remarketing_status && <RemarkBadge status={a.remarketing_status} />}
                          </div>

                          {a.services && a.services.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {a.services.map(s => (
                                <span key={s.id} className="font-ui text-[9px] tracking-[0.1em] uppercase bg-ec-cream text-ec-text-muted px-2.5 py-1 rounded-md">
                                  {s.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Total + actions */}
                        <div className="flex-shrink-0 flex flex-col items-end gap-2">
                          {a.totalAmount > 0 && (
                            <span className="font-heading text-lg text-ec-gold font-bold">
                              ${(a.totalAmount).toLocaleString("es-CO")}
                            </span>
                          )}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={e => { e.stopPropagation(); setEditTarget(a); }}
                              className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity w-8 h-8 flex items-center justify-center rounded-lg text-[#B8860B] hover:bg-[#FFFBF0]"
                              title="Editar cita"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setDeleteTarget(a); }}
                              className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600"
                              title="Eliminar cita"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {showDetail && selected && (
            <>
              {/* Backdrop móvil */}
              <motion.div
                key="appt-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="xl:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                onClick={closeDetail}
              />
              <motion.div
                key="appt-panel"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                className="xl:col-span-2 fixed xl:relative inset-x-0 bottom-0 xl:inset-auto z-50 xl:z-auto max-h-[90dvh] xl:max-h-none overflow-y-auto xl:overflow-visible"
              >
              <div className="bg-white rounded-t-2xl xl:rounded-2xl border border-black/[0.07] shadow-[0_-4px_40px_rgba(0,0,0,0.12)] xl:shadow-[0_8px_40px_rgba(0,0,0,0.08)] xl:sticky xl:top-6 overflow-hidden">
                {/* Drag handle — móvil only */}
                <div className="xl:hidden flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 bg-black/[0.12] rounded-full" />
                </div>
                {/* Top color bar */}
                <div className="h-2 w-full" style={{ background: STATUS_COLORS[normalizeStatus(selected.status)].bar }} />

                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-heading text-2xl"
                        style={{ background: STATUS_COLORS[normalizeStatus(selected.status)].bar }}
                      >
                        {(selected.clientName || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-heading text-xl text-ec-dark">{selected.clientName}</h3>
                        <StatusBadge status={selected.status} />
                      </div>
                    </div>
                    <button
                      onClick={closeDetail}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-ec-text-muted hover:bg-ec-cream hover:text-ec-dark transition-all text-lg"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Canal + perfil de lead */}
                  {(selected.channel || selected.leadType) && (
                    <div className="flex flex-wrap gap-2 mb-5">
                      {selected.channel && CHANNEL_CFG[selected.channel] && (
                        <div className="flex items-center gap-2 bg-ec-cream rounded-xl px-3 py-2">
                          <ChannelBadge channel={selected.channel} size="md" />
                          <span className="font-ui text-[9px] tracking-[0.15em] uppercase text-ec-dark">
                            {CHANNEL_CFG[selected.channel].label}
                          </span>
                        </div>
                      )}
                      {selected.leadType && (
                        <div className="flex items-center px-3 py-2 rounded-xl border"
                          style={{
                            background: LEAD_TYPE_CFG[selected.leadType?.toLowerCase()]?.bg || "#f5f5f5",
                            borderColor: LEAD_TYPE_CFG[selected.leadType?.toLowerCase()]?.border || "#e5e5e5",
                          }}
                        >
                          <span className="font-ui text-[9px] tracking-[0.15em] uppercase"
                            style={{ color: LEAD_TYPE_CFG[selected.leadType?.toLowerCase()]?.color || "#555" }}>
                            {LEAD_TYPE_CFG[selected.leadType?.toLowerCase()]?.emoji} {LEAD_TYPE_CFG[selected.leadType?.toLowerCase()]?.label || selected.leadType}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {[
                      { label: "Email", value: selected.clientEmail, icon: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6" },
                      { label: "Teléfono", value: selected.clientPhone || "—", icon: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 2.91 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z" },
                      { label: "Fecha", value: selected.date, icon: "M3 4h18v18H3zM16 2v4M8 2v4M3 10h18" },
                      { label: "Hora", value: fmtTime(selected.time) || "Por confirmar", icon: "M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20M12 6v6l4 2" },
                      { label: "Vehículo", value: selected.vehicleType === "car" ? "Carro" : selected.vehicleType === "moto" ? "Moto" : selected.vehicleType || "—", icon: "M1 9h22M5 9V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3M1 9h22v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" },
                      { label: "Entrega", value: calcEntrega(selected) || selected.pickupOption || "—", icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
                    ].map((item, i) => (
                      <div key={i} className="bg-ec-cream rounded-xl p-3">
                        <p className="font-ui text-[8px] tracking-[0.2em] text-ec-text-muted uppercase mb-1">{item.label}</p>
                        <p className="font-body text-sm text-ec-dark break-all leading-snug">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Services */}
                  {selected.services && selected.services.length > 0 && (
                    <div className="mb-6">
                      <p className="font-ui text-[9px] tracking-[0.2em] text-ec-text-muted uppercase mb-3">Servicios</p>
                      <div className="bg-ec-cream rounded-xl p-4 space-y-2">
                        {selected.services.map(s => (
                          <div key={s.id} className="flex justify-between items-center">
                            <span className="font-body text-sm text-ec-dark">{s.name}</span>
                            <span className="font-ui text-xs text-ec-gold font-bold">{s.priceDisplay}</span>
                          </div>
                        ))}
                        <div className="pt-3 border-t border-black/[0.08] flex justify-between items-center">
                          <span className="font-heading text-base text-ec-dark">Total</span>
                          <span className="font-heading text-xl text-ec-gold font-bold">${(selected.totalAmount || 0).toLocaleString("es-CO")}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Origen del lead */}
                  <div className="mb-6">
                    <p className="font-ui text-[9px] tracking-[0.2em] text-ec-text-muted uppercase mb-3">Origen del lead</p>
                    <div className="flex flex-wrap gap-2">
                      {ORIGIN_OPTIONS.map(o => (
                        <button
                          key={o}
                          onClick={() => updateOrigin(selected.id, o)}
                          className="px-3 py-1.5 font-ui text-[9px] tracking-[0.1em] uppercase rounded-full border transition-all"
                          style={selected.origin === o
                            ? { background: "#B8860B", color: "#fff", borderColor: "#B8860B" }
                            : { background: "#FAFAF8", color: "#888", borderColor: "rgba(0,0,0,0.1)" }
                          }
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Estado de la cita */}
                  <div className="mb-5">
                    <p className="font-ui text-[9px] tracking-[0.2em] text-ec-text-muted uppercase mb-2">Estado de la cita</p>
                    <div className="flex gap-2">
                      {STATUS_OPTIONS.map(s => {
                        const c = STATUS_COLORS[s];
                        const isActive = normalizeStatus(selected.status) === s;
                        return (
                          <button
                            key={s}
                            onClick={() => updateStatus(selected.id, s)}
                            className="flex-1 py-2 font-ui text-[9px] tracking-[0.15em] border uppercase rounded-sm transition-all"
                            style={isActive
                              ? { background: c.bar, color: "#fff", borderColor: c.bar }
                              : { background: "transparent", color: c.text, borderColor: c.border }
                            }
                          >
                            {STATUS_LABELS[s]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="border-t border-black/[0.06] pt-4 flex flex-col gap-2">
                    <button
                      onClick={() => setEditTarget(selected)}
                      className="w-full py-2.5 font-ui text-[9px] tracking-[0.15em] border border-[#F8C840] text-[#B8860B] uppercase flex items-center justify-center gap-2 rounded-sm hover:bg-[#FFFBF0] transition-all"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Editar cita
                    </button>
                    <button
                      onClick={() => sendReminderEmail(selected)}
                      disabled={sending || selected.reminderSent}
                      className="w-full py-2.5 font-ui text-[9px] tracking-[0.15em] border uppercase flex items-center justify-center gap-2 rounded-sm transition-all disabled:opacity-40"
                      style={selected.reminderSent
                        ? { background: "#FFFBF0", color: "#B8860B", borderColor: "#F8C840", cursor: "default" }
                        : { background: "transparent", color: "#B8860B", borderColor: "#F8C840" }
                      }
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                      </svg>
                      {selected.reminderSent ? "Recordatorio enviado ✓" : "Enviar recordatorio"}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(selected)}
                      className="w-full py-2 font-ui text-[9px] tracking-[0.15em] text-red-400 uppercase flex items-center justify-center gap-1.5 hover:text-red-600 transition-colors mt-1"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                      Eliminar cita
                    </button>
                  </div>
                </div>
              </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Delete confirm modal */}
      <AnimatePresence>
        {deleteTarget && (
          <ConfirmDeleteModal
            name={deleteTarget.client_name}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
            loading={deleting}
          />
        )}
      </AnimatePresence>

      {/* Edit modal */}
      <AnimatePresence>
        {editTarget && (
          <EditAppointmentModal
            appt={editTarget}
            onClose={() => setEditTarget(null)}
            onSave={handleEditSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
