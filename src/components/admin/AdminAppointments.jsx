import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db, email } from "../../lib/storage";

const STATUS_OPTIONS = ["pending", "confirmed", "in_progress", "completed", "cancelled"];
const STATUS_LABELS = {
  pending: "Pendiente", confirmed: "Confirmada", in_progress: "En proceso",
  completed: "Completada", cancelled: "Cancelada",
};
const STATUS_COLORS = {
  pending: { bg: "rgba(184,134,11,0.06)", color: "var(--color-ec-gold)", border: "rgba(184,134,11,0.2)" },
  confirmed: { bg: "rgba(184,134,11,0.1)", color: "var(--color-ec-gold)", border: "rgba(184,134,11,0.3)" },
  in_progress: { bg: "rgba(59,130,246,0.06)", color: "#2563eb", border: "rgba(59,130,246,0.2)" },
  completed: { bg: "rgba(34,197,94,0.06)", color: "#16a34a", border: "rgba(34,197,94,0.2)" },
  cancelled: { bg: "rgba(239,68,68,0.06)", color: "#dc2626", border: "rgba(239,68,68,0.2)" },
};

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const data = await db.appointments.list();
    setAppointments(data);
    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    await db.appointments.update(id, { status });
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
    if (selected?.id === id) setSelected((prev) => ({ ...prev, status }));
  };

  const sendReminderEmail = async (appt) => {
    setSending(true);
    const services = (appt.services || []).map((s) => s.name).join(", ");
    await email.send({
      to: appt.client_email,
      subject: `Recordatorio de tu cita — Esteticar ✨`,
      body: `Hola ${appt.client_name}! Te recordamos tu cita el ${appt.date} a las ${appt.time || "Por confirmar"}. Servicios: ${services}.`,
    });
    await db.appointments.update(appt.id, { reminder_sent: true });
    setAppointments((prev) => prev.map((a) => a.id === appt.id ? { ...a, reminder_sent: true } : a));
    if (selected?.id === appt.id) setSelected((prev) => ({ ...prev, reminder_sent: true }));
    setSending(false);
  };

  const filtered = filter === "all" ? appointments : appointments.filter((a) => a.status === filter);

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["all", ...STATUS_OPTIONS].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2.5 font-ui text-[10px] tracking-[0.2em] uppercase border transition-all duration-300 rounded-sm ${
              filter === f ? "bg-ec-gold text-white border-ec-gold font-bold" : "bg-white text-ec-text-muted border-black/[0.06] hover:border-ec-gold/30"
            }`}
          >
            {f === "all" ? "Todas" : STATUS_LABELS[f]}
            {f !== "all" && <span className="ml-2 opacity-40">({appointments.filter((a) => a.status === f).length})</span>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-32 text-ec-text-muted">
              <div className="w-8 h-8 border-2 border-ec-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center border border-black/[0.06] bg-white rounded-sm">
              <div className="w-16 h-16 mx-auto mb-6 bg-ec-gold/10 border border-ec-gold/15 flex items-center justify-center rounded-sm">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-ec-gold/50">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
              </div>
              <p className="font-heading text-lg text-ec-dark mb-2">Sin citas en esta categoría</p>
              <p className="font-body text-sm text-ec-text-muted font-light max-w-xs mx-auto">
                Las reservas nuevas aparecerán aquí cuando los clientes completen el proceso de booking.
              </p>
            </div>
          ) : (
            filtered.map((a) => {
              const sc = STATUS_COLORS[a.status] || STATUS_COLORS.pending;
              return (
                <motion.button
                  key={a.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => setSelected(a)}
                  className={`w-full text-left p-6 border transition-all duration-300 flex flex-col gap-4 rounded-sm ${
                    selected?.id === a.id ? "bg-ec-gold/[0.04] border-ec-gold shadow-[0_4px_20px_rgba(184,134,11,0.08)]" : "bg-white border-black/[0.06] hover:border-ec-gold/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-heading text-lg text-ec-dark">{a.client_name}</p>
                      <p className="font-ui text-[10px] tracking-wider text-ec-gold mt-1 uppercase">{a.date} · {a.time || "Hora por confirmar"}</p>
                    </div>
                    <span
                      className="font-ui text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 rounded-sm"
                      style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                    >
                      {STATUS_LABELS[a.status] || a.status}
                    </span>
                  </div>
                  {a.services && (
                    <p className="font-body text-xs text-ec-text-muted truncate border-t border-black/[0.04] pt-4 font-light">
                      {a.services.map((s) => s.name).join(" · ")}
                    </p>
                  )}
                </motion.button>
              );
            })
          )}
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="border border-black/[0.06] p-8 h-fit sticky top-28 bg-white rounded-sm shadow-[0_8px_40px_rgba(0,0,0,0.08)]"
            >
              <div className="flex items-start justify-between mb-8 pb-6 border-b border-black/[0.06]">
                <div>
                  <h3 className="font-heading text-2xl text-ec-gold mb-1">{selected.client_name}</h3>
                  <p className="font-ui text-[10px] tracking-[0.3em] text-ec-text-muted uppercase">Detalles de la Reserva</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-black/20 hover:text-ec-dark transition-colors text-lg">✕</button>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-10">
                {[
                  { label: "Email", value: selected.client_email },
                  { label: "Teléfono", value: selected.client_phone || "—" },
                  { label: "Vehículo", value: selected.vehicle_type === "car" ? "Carro" : "Moto" },
                  { label: "Fecha", value: selected.date },
                  { label: "Hora", value: selected.time || "Por confirmar" },
                  { label: "Entrega", value: selected.pickup_option },
                ].map((item, i) => (
                  <div key={i}>
                    <p className="font-ui text-[9px] tracking-[0.2em] text-ec-text-muted uppercase mb-1">{item.label}</p>
                    <p className="font-body text-sm text-ec-dark break-all">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Services */}
              {selected.services && selected.services.length > 0 && (
                <div className="mb-10">
                  <p className="font-ui text-[9px] tracking-[0.2em] text-ec-text-muted uppercase mb-4">Servicios</p>
                  <div className="space-y-3 bg-ec-cream p-4 border border-black/[0.06] rounded-sm">
                    {selected.services.map((s) => (
                      <div key={s.id} className="flex justify-between items-center">
                        <span className="font-body text-sm text-ec-dark">{s.name}</span>
                        <span className="font-ui text-xs text-ec-gold font-bold">{s.priceDisplay}</span>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-black/[0.08] flex justify-between items-center">
                      <span className="font-heading text-lg text-ec-dark">Total</span>
                      <span className="font-heading text-xl text-ec-gold font-bold">${(selected.total_amount || 0).toLocaleString("es-CO")}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Status change */}
              <div className="mb-8">
                <p className="font-ui text-[9px] tracking-[0.2em] text-ec-text-muted uppercase mb-4">Cambiar Estado</p>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(selected.id, s)}
                      className={`py-2.5 font-ui text-[9px] tracking-[0.15em] border transition-all duration-300 uppercase rounded-sm ${
                        selected.status === s ? "bg-ec-gold text-white border-ec-gold font-bold" : "bg-ec-cream text-ec-text-muted border-black/[0.06] hover:border-ec-gold/30"
                      }`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => sendReminderEmail(selected)}
                  disabled={sending || selected.reminder_sent}
                  className="flex-1 py-4 font-ui text-[10px] tracking-[0.2em] border border-ec-gold text-ec-gold uppercase flex items-center justify-center gap-2 hover:bg-ec-gold hover:text-white transition-all disabled:opacity-25 rounded-sm"
                >
                  {selected.reminder_sent ? "Recordatorio Enviado ✓" : "Enviar Recordatorio"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
