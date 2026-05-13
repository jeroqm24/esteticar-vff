import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SERVICES } from "../lib/constants";

function ServicePod({ service, index }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-5%" }}
      transition={{ duration: 0.85, delay: index * 0.045, ease: [0.32, 0.72, 0, 1] }}
      className="service-pod group"
    >
      {/* Outer shell */}
      <div
        className={`p-[6px] rounded-[1.75rem] transition-all duration-700 service-pod-inner ${
          isHovered
            ? "bg-ec-dark/[0.08] border border-ec-dark/20"
            : "bg-black/[0.025] border border-black/[0.05]"
        }`}
      >
        {/* Inner core — dark hover inversion */}
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`relative rounded-[calc(1.75rem-6px)] overflow-hidden transition-all duration-700 ${
            isHovered
              ? "bg-ec-dark border border-white/[0.06]"
              : "bg-white border border-black/[0.04]"
          }`}
          style={{
            boxShadow: isHovered
              ? "inset 0 1px 1px rgba(255,255,255,0.06), 0 24px 60px rgba(0,0,0,0.25)"
              : "inset 0 1px 1px rgba(255,255,255,0.9), 0 2px 20px rgba(0,0,0,0.04)",
          }}
        >
          {/* Gold scan line on hover */}
          <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-ec-gold/40 to-transparent transition-opacity duration-700 ${isHovered ? "opacity-100" : "opacity-0"}`} />

          {/* Content */}
          <div className="relative z-10 p-8 sm:p-10">
            {/* Top row: tag + time */}
            <div className="flex items-start justify-between mb-8">
              <span className={`font-ui text-[9px] tracking-[0.5em] uppercase transition-colors duration-700 ${isHovered ? "text-ec-gold/70" : "text-ec-gold"}`}>
                {service.time}
              </span>
              {service.cotizacion && (
                <span className={`font-ui text-[9px] tracking-[0.3em] uppercase px-3 py-1.5 rounded-full border transition-all duration-700 ${
                  isHovered ? "border-ec-gold/30 text-ec-gold/70 bg-ec-gold/[0.08]" : "border-ec-gold/20 text-ec-gold/60 bg-ec-gold/[0.04]"
                }`}>
                  A medida
                </span>
              )}
            </div>

            {/* Service name — heading font, large */}
            <h3 className={`font-heading text-2xl sm:text-3xl leading-tight mb-3 transition-colors duration-700 ${isHovered ? "text-white" : "text-ec-dark"}`}>
              {service.name}
            </h3>

            {/* Price — massive display text */}
            <div className="mb-6">
              <span
                className={`font-heading text-5xl sm:text-6xl font-light leading-none transition-all duration-700 ${
                  isHovered
                    ? "text-ec-gold"
                    : "text-ec-dark/[0.12]"
                }`}
                style={
                  !isHovered
                    ? {
                        background: "linear-gradient(135deg, #B8860B 0%, #D4A017 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        opacity: 0.7,
                      }
                    : {}
                }
              >
                {service.priceDisplay}
              </span>
            </div>

            {/* Description */}
            <p className={`font-body text-sm leading-relaxed mb-8 font-light transition-colors duration-700 ${isHovered ? "text-white/50" : "text-ec-text-secondary/70"}`}>
              {service.description}
            </p>

            {/* Why it matters — revealed on hover */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pt-5 mb-7 border-t border-white/[0.08]">
                    <span className="font-ui text-[9px] tracking-[0.4em] text-ec-gold/50 uppercase block mb-2">
                      POR QUÉ IMPORTA
                    </span>
                    <p className="font-body text-xs text-white/40 leading-relaxed italic">
                      {service.why}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA — pill with button-in-button trailing icon */}
            <a
              href={`https://wa.me/573181983601?text=${encodeURIComponent(service.cotizacion
                ? `Hola, me interesa el servicio de *${service.name}*. ¿Me pueden dar una cotización personalizada?`
                : `Hola, quiero reservar:\n*${service.name}* (${service.priceDisplay})\n\n¿Tienen disponibilidad esta semana?`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group/btn w-full py-4 px-5 font-ui text-[11px] tracking-[0.25em] uppercase font-semibold rounded-full flex items-center justify-between transition-all duration-[650ms] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
              style={{
                background: service.cotizacion
                  ? isHovered ? "linear-gradient(135deg, #B4821E 0%, #8B6014 100%)" : "linear-gradient(135deg, #B4821E 0%, #8B6014 100%)"
                  : isHovered ? "linear-gradient(135deg, #1FAD5A 0%, #128C7E 100%)" : "linear-gradient(135deg, #1FAD5A 0%, #128C7E 100%)",
                color: "white",
                boxShadow: service.cotizacion
                  ? "0 6px 24px rgba(180,130,30,0.35), inset 0 1px 0 rgba(255,255,255,0.12)"
                  : "0 6px 24px rgba(18,140,126,0.35), inset 0 1px 0 rgba(255,255,255,0.12)",
                textDecoration: "none",
              }}
            >
              <span className="flex items-center gap-2.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.116.553 4.103 1.523 5.828L.057 23.857a.5.5 0 0 0 .636.607l6.218-1.63A11.953 11.953 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.953 9.953 0 0 1-5.077-1.384l-.364-.216-3.767.988 1.006-3.665-.236-.377A9.952 9.952 0 0 1 2 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10z"/>
                </svg>
                {service.cotizacion ? "COTIZAR" : "RESERVAR"}
              </span>
              <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 transition-transform duration-500 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-px group-hover/btn:scale-110">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </span>
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function ServicesSection({ onAddService, onRemoveService, selectedServices, vehicleType, onVehicleTypeChange }) {
  const filteredServices = SERVICES.filter(s => s.category === vehicleType);

  return (
    <section id="servicios" className="relative py-40 px-6 overflow-hidden bg-ec-white">
      {/* Subtle gold radial at top */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(184,134,11,0.04)_0%,transparent_55%)] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-20 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.32, 0.72, 0, 1] }}
            className="flex-1"
          >
            <span className="section-label mb-6 block">NUESTROS TRATAMIENTOS</span>
            <h2 className="font-heading text-5xl md:text-7xl lg:text-8xl text-ec-dark font-light mt-6 leading-tight tracking-tighter">
              Excelencia en <br />
              <span className="italic" style={{
                background: "linear-gradient(135deg, #B8860B 0%, #D4A017 50%, #B8860B 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>cada Detalle</span>
            </h2>
          </motion.div>

          {/* Vehicle type selector — floating pill */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-center lg:justify-start"
          >
            <div className="p-1.5 bg-black/[0.04] border border-black/[0.07] rounded-full w-fit shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
              {[
                { id: "car", label: "CARROS" },
                { id: "moto", label: "MOTOS" },
              ].map((type) => {
                const isActive = vehicleType === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => onVehicleTypeChange(type.id)}
                    className={`w-32 py-3.5 transition-all duration-[650ms] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] font-ui text-[12px] tracking-[0.3em] uppercase rounded-full ${
                      isActive
                        ? "bg-ec-dark text-white font-bold shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
                        : "text-ec-text-muted hover:text-ec-dark bg-transparent"
                    }`}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Service count */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-14 flex items-center gap-4"
        >
          <div className="w-8 h-px bg-ec-gold/50" />
          <span className="font-ui text-[10px] tracking-[0.4em] text-ec-text-muted uppercase">
            {filteredServices.length} tratamientos disponibles
          </span>
        </motion.div>

        {/* Service Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
