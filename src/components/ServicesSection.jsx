import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SERVICES } from "../lib/constants";

// ═══════════════════════════════════════
// SERVICE POD — 3D PERSPECTIVE CARD (Light)
// ═══════════════════════════════════════
function ServicePod({ service, index }) {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!cardRef.current || window.innerWidth < 768) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -8, y: x * 8 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-5%" }}
      transition={{ duration: 0.8, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className="service-pod"
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        className="service-pod-inner"
        style={{
          transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        }}
      >
        <div
          className="relative p-8 sm:p-10 transition-all duration-700 overflow-hidden group rounded-sm bg-white border border-black/[0.06] hover:border-ec-gold/25 shadow-[0_2px_20px_rgba(0,0,0,0.04)]"
        >
          {/* Glow on hover */}
          <div
            className={`absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-48 h-48 rounded-full transition-all duration-1000 pointer-events-none ${
              isHovered ? "bg-ec-gold/[0.06] blur-[50px]" : "bg-transparent blur-[40px]"
            }`}
          />

          {/* Scan line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ec-gold/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

          <div className="relative z-10">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <span className="font-ui text-[10px] tracking-[0.3em] text-ec-gold uppercase block mb-2">
                  {service.time}
                </span>
                <h3 className="font-body font-semibold text-lg sm:text-xl text-ec-dark group-hover:text-ec-gold transition-colors duration-500">
                  {service.name}
                </h3>
              </div>
              <div className="text-right">
                <span className="font-body font-bold text-xl sm:text-2xl text-ec-gold">
                  {service.priceDisplay}
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="font-body text-sm text-ec-text-secondary/70 leading-relaxed mb-6 font-light">
              {service.description}
            </p>

            {/* Why it matters */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: "circOut" }}
                  className="overflow-hidden"
                >
                  <div className="pt-6 mb-6 border-t border-black/[0.06]">
                    <span className="font-ui text-[9px] tracking-[0.4em] text-ec-gold/60 uppercase block mb-2">
                      POR QUÉ IMPORTA
                    </span>
                    <p className="font-body text-xs text-ec-text-secondary leading-relaxed italic">
                      {service.why}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action button */}
            <button
              type="button"
              onClick={(e) => { 
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('prefill-bot', { 
                  detail: `Hola, quiero reservar:\n*${service.name}* (${service.priceDisplay})\n\n¿Tienen disponibilidad esta semana?` 
                }));
              }}
              className="w-full py-4 font-ui text-[11px] tracking-[0.2em] uppercase transition-all duration-500 border rounded-sm flex items-center justify-center gap-2.5 font-semibold hover:brightness-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #1FAD5A 0%, #128C7E 100%)",
                color: "white",
                border: "1px solid rgba(37,211,102,0.3)",
                boxShadow: "0 4px 20px rgba(18,140,126,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.116.553 4.103 1.523 5.828L.057 23.857a.5.5 0 0 0 .636.607l6.218-1.63A11.953 11.953 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.953 9.953 0 0 1-5.077-1.384l-.364-.216-3.767.988 1.006-3.665-.236-.377A9.952 9.952 0 0 1 2 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10z"/>
              </svg>
              RESERVAR
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════
// MAIN SERVICES SECTION
// ═══════════════════════════════════════
export default function ServicesSection({ onAddService, onRemoveService, selectedServices, vehicleType, onVehicleTypeChange }) {
  const filteredServices = SERVICES.filter(s => s.category === vehicleType);

  return (
    <section id="servicios" className="relative py-32 px-6 overflow-hidden bg-ec-white">
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-20 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex-1"
          >
            <span className="section-label mb-6 block">NUESTROS TRATAMIENTOS</span>
            <h2 className="font-heading text-5xl md:text-7xl text-ec-dark font-light mt-6 leading-tight">
              Excelencia en <br />
              <span className="italic gold-gradient-text">cada Detalle</span>
            </h2>
          </motion.div>

          {/* Vehicle type selector */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex justify-center p-1 bg-ec-cream border border-black/[0.06] h-fit rounded-sm w-fit mx-auto lg:mx-0"
          >
            {[
              { id: "car", label: "CARROS" },
              { id: "moto", label: "MOTOS" },
            ].map((type) => {
              const isActive = vehicleType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => onVehicleTypeChange(type.id)}
                  className={`w-28 py-3.5 transition-all duration-500 font-ui text-[12px] tracking-[0.3em] uppercase rounded-sm ${
                    isActive
                      ? "bg-ec-gold text-white font-bold shadow-[0_4px_20px_rgba(184,134,11,0.2)]"
                      : "text-ec-text-muted hover:text-ec-dark bg-transparent"
                  }`}
                >
                  {type.label}
                </button>
              );
            })}
          </motion.div>
        </div>

        {/* Service count */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12 flex items-center gap-4"
        >
          <div className="w-2 h-2 bg-ec-gold rounded-full" />
          <span className="font-ui text-[10px] tracking-[0.3em] text-ec-text-muted uppercase">
            {filteredServices.length} tratamientos disponibles
          </span>
        </motion.div>

        {/* Service Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredServices.map((service, i) => (
                <ServicePod
                  key={service.id}
                  service={service}
                  index={i}
                />
            ))}
          </AnimatePresence>
        </div>

        {/* Bottom note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-20 text-center"
        >
          <p className="font-body text-sm text-ec-text-muted italic">
            ¿Necesitas un plan personalizado? Habla con nuestras asesoras por WhatsApp.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
