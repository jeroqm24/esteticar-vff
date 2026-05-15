import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db, email } from "../../lib/storage";

const STATUS_OPTIONS = ["pending", "confirmed", "in_progress", "completed", "cancelled"];
const ORIGIN_OPTIONS = ["Bot", "Instagram", "Facebook", "Referido", "Calle", "Otro"];
const STATUS_LABELS = {
  pending: "Pendiente", confirmed: "Confirmada", in_progress: "En proceso",
  completed: "Completada", cancelled: "Cancelada",
};
const STATUS_COLORS = {
  pending:    { bg: "#FEF9ED", text: "#B8860B", border: "#F8C840", bar: "#F8C840" },
  confirmed:  { bg: "#FFFBF0", text: "#92700A", border: "#E6B800", bar: "#E6B800" },
  in_progress:{ bg: "#EFF6FF", text: "#2563EB", border: "#93C5FD", bar: "#3B82F6" },
  completed:  { bg: "#F0FDF4", text: "#16A34A", border: "#86EFAC", bar: "#22C55E" },
  cancelled:  { bg: "#FEF2F2", text: "#DC2626", border: "#FCA5A5", bar: "#EF4444" },
};

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span
      className="font-ui text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 rounded-full"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {STATUS_LABELS[status] || status}
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
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await db.appointments.delete(deleteTarget.id);
    setAppointments(prev => prev.filter(a => a.id !== deleteTarget.id));
    if (selected?.id === deleteTarget.id) { setSelected(null); setShowDetail(false); }
    setDeleteTarget(null);
    setDeleting(false);
  };

  const sendReminderEmail = async (appt) => {
    setSending(true);
    const services = (appt.services || []).map(s => s.name).join(", ");
    await email.send({
      to: appt.clientEmail,
      subject: `Recordatorio de tu cita — Esteticar ✨`,
      body: `Hola ${appt.clientName}! Te recordamos tu cita el ${appt.date} a las ${appt.time || "Por confirmar"}. Servicios: ${services}.`,
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

  const registerConversion = async (appt) => {
    setRegisteringCAPI(true);
    try {
      const res = await fetch('/api/capi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': 'esteticar2026' },
        body: JSON.stringify({ appointment: appt }),
      });
      const json = await res.json();
      if (json.ok) setCapiDone(prev => ({ ...prev, [appt.id]: true }));
    } catch { }
    setRegisteringCAPI(false);
  };

  const openDetail = (appt) => { setSelected(appt); setShowDetail(true); };
  const closeDetail = () => { setShowDetail(false); };

  const filtered = filter === "all" ? appointments : appointments.filter(a => a.status === filter);

  const counts = {};
  STATUS_OPTIONS.forEach(s => { counts[s] = appointments.filter(a => a.status === s).length; });

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
              {STATUS_LABELS[f]} <span className="ml-1 opacity-60">({counts[f]})</span>
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
                const c = STATUS_COLORS[a.status] || STATUS_COLORS.pending;
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
                        {/* Avatar */}
                        <div
                          className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-heading text-lg"
                          style={{ background: c.bar }}
                        >
                          {(a.clientName || "?")[0].toUpperCase()}
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
                              {a.time || "Hora por confirmar"}
                            </span>
                            {a.vehicleType && (
                              <span className="flex items-center gap-1.5 font-ui text-[11px] tracking-wider text-ec-text-muted">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                  <rect x="1" y="9" width="22" height="10" rx="2"/><path d="M5 9V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><circle cx="7" cy="19" r="2"/><circle cx="17" cy="19" r="2"/>
                                </svg>
                                {a.vehicleType === "car" ? "Carro" : a.vehicleType === "moto" ? "Moto" : a.vehicleType}
                              </span>
                            )}
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

                        {/* Total + delete */}
                        <div className="flex-shrink-0 flex flex-col items-end gap-2">
                          {a.totalAmount > 0 && (
                            <span className="font-heading text-lg text-ec-gold font-bold">
                              ${(a.totalAmount).toLocaleString("es-CO")}
                            </span>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteTarget(a); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600"
                            title="Eliminar cita"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                            </svg>
                          </button>
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
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.3 }}
              className="xl:col-span-2"
            >
              <div className="bg-white rounded-2xl border border-black/[0.07] shadow-[0_8px_40px_rgba(0,0,0,0.08)] sticky top-6 overflow-hidden">
                {/* Top color bar */}
                <div className="h-2 w-full" style={{ background: (STATUS_COLORS[selected.status] || STATUS_COLORS.pending).bar }} />

                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-heading text-2xl"
                        style={{ background: (STATUS_COLORS[selected.status] || STATUS_COLORS.pending).bar }}
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

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {[
                      { label: "Email", value: selected.clientEmail, icon: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6" },
                      { label: "Teléfono", value: selected.clientPhone || "—", icon: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 2.91 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z" },
                      { label: "Fecha", value: selected.date, icon: "M3 4h18v18H3zM16 2v4M8 2v4M3 10h18" },
                      { label: "Hora", value: selected.time || "Por confirmar", icon: "M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20M12 6v6l4 2" },
                      { label: "Vehículo", value: selected.vehicleType === "car" ? "Carro" : selected.vehicleType === "moto" ? "Moto" : selected.vehicleType || "—", icon: "M1 9h22M5 9V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3M1 9h22v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" },
                      { label: "Entrega", value: selected.pickupOption || "—", icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
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

                  {/* Change status */}
                  <div className="mb-6">
                    <p className="font-ui text-[9px] tracking-[0.2em] text-ec-text-muted uppercase mb-3">Cambiar Estado</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {STATUS_OPTIONS.map(s => {
                        const c = STATUS_COLORS[s];
                        const isActive = selected.status === s;
                        return (
                          <button
                            key={s}
                            onClick={() => updateStatus(selected.id, s)}
                            className="py-2.5 font-ui text-[9px] tracking-[0.1em] border uppercase rounded-xl transition-all"
                            style={isActive
                              ? { background: c.bar, color: "#fff", borderColor: c.bar }
                              : { background: c.bg, color: c.text, borderColor: c.border }
                            }
                          >
                            {STATUS_LABELS[s]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => registerConversion(selected)}
                      disabled={registeringCAPI || capiDone[selected.id]}
                      className="w-full py-3.5 font-ui text-[10px] tracking-[0.2em] border uppercase flex items-center justify-center gap-2 transition-all rounded-xl"
                      style={capiDone[selected.id]
                        ? { background: "#F0FDF4", color: "#16A34A", borderColor: "#86EFAC", cursor: "default" }
                        : { background: "#0F0F0F", color: "#fff", borderColor: "#0F0F0F", opacity: registeringCAPI ? 0.5 : 1 }
                      }
                    >
                      {capiDone[selected.id] ? "Conversión Registrada ✓" : registeringCAPI ? "Registrando..." : "Registrar como Conversión"}
                    </button>
                    <button
                      onClick={() => sendReminderEmail(selected)}
                      disabled={sending || selected.reminderSent}
                      className="w-full py-3.5 font-ui text-[10px] tracking-[0.2em] border border-ec-gold text-ec-gold uppercase flex items-center justify-center gap-2 hover:bg-ec-gold hover:text-white transition-all disabled:opacity-30 rounded-xl"
                    >
                      {selected.reminderSent ? "Recordatorio Enviado ✓" : "Enviar Recordatorio"}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(selected)}
                      className="w-full py-3.5 font-ui text-[10px] tracking-[0.2em] border border-red-200 text-red-500 uppercase flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all rounded-xl"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                      Eliminar Cita
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
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
    </div>
  );
}
