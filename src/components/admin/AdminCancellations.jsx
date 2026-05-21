import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ADMIN_KEY = "Esteticar11.";

const fmt = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

export default function AdminCancellations({ onCountChange }) {
  const [cancellations, setCancellations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/appointments?status=cancelada&limit=50", {
        headers: { "x-admin-key": ADMIN_KEY },
      });
      const data = await r.json();
      const list = Array.isArray(data) ? data : [];
      setCancellations(list);
      onCountChange?.(list.length);
    } catch {
      setCancellations([]);
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  const release = async (code) => {
    setReleasing(code);
    try {
      await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
        body: JSON.stringify({ confirmation_code: code, updates: { status: "cancelada_ok" } }),
      });
      setCancellations(prev => {
        const updated = prev.filter(c => c.confirmation_code !== code);
        onCountChange?.(updated.length);
        return updated;
      });
    } catch {
      alert("Error al liberar el turno.");
    } finally {
      setReleasing(null);
    }
  };

  const releaseAll = async () => {
    const pending = cancellations.filter(c => c.status === "cancelada");
    for (const c of pending) {
      await release(c.confirmation_code);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-ec-gold/40 border-t-ec-gold rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <span className="font-ui text-[10px] tracking-[0.35em] text-ec-gold uppercase block mb-2">
            Gestión de Agenda
          </span>
          <h2 className="font-heading text-2xl text-ec-dark font-light tracking-wide">
            Cancelaciones
          </h2>
          <p className="font-body text-sm text-ec-text-muted mt-1">
            Citas canceladas por clientes desde el chat. Libera el turno para que quede disponible en el dashboard.
          </p>
        </div>

        {cancellations.length > 1 && (
          <button
            onClick={releaseAll}
            className="px-4 py-2 bg-ec-gold text-white font-ui text-[10px] tracking-[0.2em] uppercase rounded-sm hover:bg-amber-600 transition-colors"
          >
            Liberar todas ({cancellations.length})
          </button>
        )}
      </div>

      {/* Empty state */}
      {cancellations.length === 0 && (
        <div className="bg-white border border-black/[0.06] rounded-sm p-16 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-50 rounded-full flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <p className="font-body text-sm text-ec-text-muted">Sin cancelaciones pendientes</p>
          <p className="font-ui text-[10px] text-ec-text-muted/60 tracking-widest uppercase mt-1">
            Todos los turnos están confirmados
          </p>
        </div>
      )}

      {/* Cards */}
      <div className="space-y-3">
        <AnimatePresence>
          {cancellations.map((c) => (
            <motion.div
              key={c.confirmation_code}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-white border border-red-100 rounded-sm overflow-hidden"
            >
              {/* Red accent top bar */}
              <div className="h-0.5 bg-red-400 w-full" />

              <div className="p-5 flex items-start gap-4">
                {/* Icon */}
                <div className="w-10 h-10 rounded-full bg-red-50 flex-shrink-0 flex items-center justify-center mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>

                {/* Data */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-heading text-base text-ec-dark font-medium">
                      {c.client_name || "Cliente sin nombre"}
                    </span>
                    <span className="font-ui text-[9px] tracking-widest uppercase text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                      Cancelada
                    </span>
                    <span className="font-mono text-[10px] text-ec-text-muted">
                      {c.confirmation_code}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1">
                    <div>
                      <span className="font-ui text-[9px] tracking-widest uppercase text-ec-text-muted/60 block">Servicio</span>
                      <span className="font-body text-xs text-ec-dark">{c.service || "—"}</span>
                    </div>
                    <div>
                      <span className="font-ui text-[9px] tracking-widest uppercase text-ec-text-muted/60 block">Fecha agendada</span>
                      <span className="font-body text-xs text-ec-dark">{c.date || "—"}</span>
                    </div>
                    <div>
                      <span className="font-ui text-[9px] tracking-widest uppercase text-ec-text-muted/60 block">Vehículo</span>
                      <span className="font-body text-xs text-ec-dark">{c.vehicle_type || "—"}</span>
                    </div>
                    <div>
                      <span className="font-ui text-[9px] tracking-widest uppercase text-ec-text-muted/60 block">Precio</span>
                      <span className="font-body text-xs font-medium text-amber-700">{c.price_display || "—"}</span>
                    </div>
                    <div>
                      <span className="font-ui text-[9px] tracking-widest uppercase text-ec-text-muted/60 block">Teléfono</span>
                      <span className="font-body text-xs text-ec-dark">
                        {c.client_phone && !c.client_phone.startsWith("web_") ? c.client_phone : "Chat web"}
                      </span>
                    </div>
                    <div>
                      <span className="font-ui text-[9px] tracking-widest uppercase text-ec-text-muted/60 block">Registrada</span>
                      <span className="font-body text-xs text-ec-text-muted">{fmt(c.created_date)}</span>
                    </div>
                  </div>
                </div>

                {/* Action */}
                <button
                  onClick={() => release(c.confirmation_code)}
                  disabled={releasing === c.confirmation_code}
                  className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-ui text-[10px] tracking-[0.15em] uppercase rounded-sm transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                  {releasing === c.confirmation_code ? (
                    <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                  Liberar turno
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {cancellations.length > 0 && (
        <p className="text-center font-ui text-[9px] tracking-widest uppercase text-ec-text-muted/50 mt-8">
          Al liberar un turno, el horario vuelve a estar disponible para nuevas citas
        </p>
      )}
    </div>
  );
}
