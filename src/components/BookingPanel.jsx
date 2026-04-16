import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PICKUP_OPTIONS } from "../lib/constants";
import { db } from "../lib/storage";

export default function BookingPanel({ isOpen, onClose, services, onRemoveService, vehicleType, onOpenChat }) {
  const [step, setStep] = useState(1);
  const [pickup, setPickup] = useState(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const totalServices = services.reduce((sum, s) => sum + s.price, 0);
  const totalPickup = pickup?.price || 0;
  const total = totalServices + totalPickup;

  const canProceed = () => {
    if (step === 1) return services.length > 0;
    if (step === 2) return pickup !== null;
    if (step === 3) return date && time;
    if (step === 4) return name && phone;
    return true;
  };

  const handleConfirm = async () => {
    setLoading(true);
    await db.appointments.create({
      client_name: name,
      client_email: phone.includes("@") ? phone : `${phone}@cliente.esteticar.co`,
      client_phone: phone, services, date, time, vehicle_type: vehicleType,
      pickup_option: pickup?.label || "Cliente trae su vehículo",
      pickup_price: pickup?.price || 0, total_amount: total, status: "pending",
    });
    setLoading(false);
    setConfirmed(true);
  };

  const reset = () => { setStep(1); setPickup(null); setDate(""); setTime(""); setName(""); setPhone(""); setConfirmed(false); };

  const STEPS = ["Servicios", "Entrega", "Fecha", "Datos"];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm" />

          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-[70] w-full max-w-md overflow-y-auto border-l border-black/[0.06] bg-white shadow-[-20px_0_60px_rgba(0,0,0,0.08)]"
          >
            <div className="sticky top-0 z-10 p-6 border-b border-black/[0.06] bg-white/90 backdrop-blur-md">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="font-ui text-[10px] tracking-[0.4em] text-ec-gold uppercase">
                    {confirmed ? "CONFIRMADO" : `PASO ${step} DE 4`}
                  </span>
                  <h3 className="font-heading text-xl mt-1 text-ec-dark">
                    {confirmed ? "¡Reserva Lista!" : STEPS[step - 1]}
                  </h3>
                </div>
                <button onClick={() => { reset(); onClose(); }} className="text-black/20 hover:text-ec-dark transition-colors text-xl font-light">✕</button>
              </div>
              {!confirmed && (
                <div className="flex gap-2">
                  {STEPS.map((_, i) => (
                    <div key={i} className={`flex-1 h-0.5 transition-all duration-500 rounded-full ${i < step ? "bg-ec-gold" : "bg-black/[0.06]"}`} />
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 space-y-6">
              {confirmed ? (
                <div className="text-center space-y-6 py-8">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
                    className="w-20 h-20 mx-auto flex items-center justify-center border-2 border-ec-gold text-ec-gold rounded-sm">
                    <span className="text-3xl">✓</span>
                  </motion.div>
                  <p className="font-heading text-2xl text-ec-gold">¡Reserva Lista!</p>
                  <p className="font-body text-sm text-ec-text-muted font-light leading-relaxed">
                    Tu cita ha quedado registrada. Una de nuestras asesoras te contactará pronto para confirmar los detalles.
                  </p>
                  <button
                    onClick={() => { reset(); onClose(); if (onOpenChat) onOpenChat(); }}
                    className="w-full py-4 font-ui text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-2 transition-all duration-300 rounded-sm"
                    style={{ background: "#128C7E", color: "white" }}
                  >
                    HABLAR CON UNA ASESORA
                  </button>
                  <button onClick={() => { reset(); onClose(); }}
                    className="w-full py-3 font-ui text-xs tracking-[0.2em] text-ec-text-muted uppercase">
                    CERRAR
                  </button>
                </div>
              ) : (
                <>
                  {step === 1 && (
                    <div className="space-y-3">
                      <p className="font-ui text-[10px] tracking-[0.3em] text-ec-gold uppercase">Servicios seleccionados</p>
                      {services.length === 0 ? (
                        <p className="font-body text-sm py-12 text-center text-ec-text-muted border border-dashed border-black/[0.08] italic font-light rounded-sm">No hay servicios seleccionados.</p>
                      ) : (
                        services.map((s) => (
                          <div key={s.id} className="flex items-center justify-between p-4 border border-black/[0.06] bg-ec-cream rounded-sm">
                            <div>
                              <p className="font-body text-sm text-ec-dark">{s.name}</p>
                              <p className="font-ui text-xs mt-1 text-ec-gold">{s.priceDisplay}</p>
                            </div>
                            <button onClick={() => onRemoveService(s.id)} className="text-black/15 hover:text-red-400 transition-colors text-sm">✕</button>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-3">
                      <p className="font-ui text-[10px] tracking-[0.3em] text-ec-gold uppercase">Entrega del vehículo</p>
                      {PICKUP_OPTIONS.map((opt) => (
                        <button key={opt.id} onClick={() => setPickup(opt)}
                          className={`w-full text-left p-5 border transition-all duration-300 rounded-sm ${
                            pickup?.id === opt.id ? "border-ec-gold bg-ec-gold/[0.06]" : "border-black/[0.06] bg-ec-cream hover:border-black/10"
                          }`}>
                          <div className="flex justify-between">
                            <span className="font-body text-sm text-ec-dark">{opt.label}</span>
                            <span className="font-ui text-xs text-ec-gold font-bold">{opt.priceDisplay}</span>
                          </div>
                          <p className="font-body text-xs mt-2 text-ec-text-muted font-light">{opt.description}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-5">
                      <p className="font-ui text-[10px] tracking-[0.3em] text-ec-gold uppercase">Fecha y hora</p>
                      <div>
                        <label className="font-ui text-[10px] tracking-[0.2em] text-ec-text-muted uppercase block mb-2">Fecha</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                          className="w-full p-4 border border-black/[0.06] bg-ec-cream text-ec-dark outline-none focus:border-ec-gold transition-colors font-body rounded-sm" />
                      </div>
                      <div>
                        <label className="font-ui text-[10px] tracking-[0.2em] text-ec-text-muted uppercase block mb-2">Hora preferida</label>
                        <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                          className="w-full p-4 border border-black/[0.06] bg-ec-cream text-ec-dark outline-none focus:border-ec-gold transition-colors font-body rounded-sm" />
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-5">
                      <p className="font-ui text-[10px] tracking-[0.3em] text-ec-gold uppercase">Datos de contacto</p>
                      <div>
                        <label className="font-ui text-[10px] tracking-[0.2em] text-ec-text-muted uppercase block mb-2">Nombre</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre completo"
                          className="w-full p-4 border border-black/[0.06] bg-ec-cream text-ec-dark outline-none focus:border-ec-gold transition-colors font-body placeholder:text-black/20 rounded-sm" />
                      </div>
                      <div>
                      <label className="font-ui text-[10px] tracking-[0.2em] text-ec-text-muted uppercase block mb-2">Teléfono o Email</label>
                        <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="318 198 3601"
                          className="w-full p-4 border border-black/[0.06] bg-ec-cream text-ec-dark outline-none focus:border-ec-gold transition-colors font-body placeholder:text-black/20 rounded-sm" />
                      </div>
                    </div>
                  )}

                  <div className="pt-6 border-t border-black/[0.06]">
                    <div className="flex justify-between mb-8">
                      <span className="font-ui text-xs tracking-[0.2em] text-ec-text-muted uppercase">Total estimado</span>
                      <span className="font-heading text-3xl text-ec-gold">${total.toLocaleString("es-CO")}</span>
                    </div>
                    <div className="flex gap-3">
                      {step > 1 && (
                        <button onClick={() => setStep(step - 1)}
                          className="flex-1 py-4 font-ui text-xs tracking-[0.2em] text-ec-text-muted border border-black/[0.06] uppercase hover:bg-ec-cream transition-all rounded-sm">← ATRÁS</button>
                      )}
                      {step < 4 ? (
                        <button onClick={() => canProceed() && setStep(step + 1)} disabled={!canProceed()}
                          className="flex-1 py-4 font-ui text-xs tracking-[0.2em] bg-ec-gold text-white uppercase transition-all disabled:opacity-20 font-bold rounded-sm">SIGUIENTE →</button>
                      ) : (
                        <button onClick={handleConfirm} disabled={!canProceed() || loading}
                          className="flex-1 py-4 font-ui text-xs tracking-[0.2em] bg-ec-gold text-white uppercase transition-all disabled:opacity-20 font-bold rounded-sm">
                          {loading ? "PROCESANDO..." : "RESERVAR AHORA"}</button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
