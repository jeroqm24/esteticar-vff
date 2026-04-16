import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PROTOCOLS, BRAND } from "../lib/constants";

// ─── Guarantee Modal ─────────────────────────────────────────────────
function GuaranteeModal({ onClose }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-sm shadow-[0_24px_80px_rgba(0,0,0,0.2)]"
        >
          {/* Header */}
          <div className="p-8 sm:p-10 border-b border-black/[0.06] flex items-start justify-between gap-6">
            <div>
              <span className="font-ui text-[9px] tracking-[0.4em] text-ec-gold uppercase block mb-3">PROTOCOLO 5M</span>
              <h3 className="font-heading text-3xl sm:text-4xl text-ec-dark">Garantía de Custodia</h3>
              <p className="font-ui text-[10px] tracking-[0.2em] text-ec-text-muted uppercase mt-2">$5.000.000 COP · Cobertura Integral</p>
            </div>
            <button onClick={onClose} className="text-black/20 hover:text-ec-dark transition-colors text-2xl font-light shrink-0">✕</button>
          </div>

          {/* Content */}
          <div className="p-8 sm:p-10 space-y-8">
            {/* Coverage summary */}
            <div className="p-6 bg-ec-gold/[0.04] border border-ec-gold/15 rounded-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-ec-gold/10 border border-ec-gold/20 flex items-center justify-center rounded-sm">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B8860B" strokeWidth="1.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-heading text-xl text-ec-dark">Cobertura Total Activa</p>
                  <p className="font-body text-xs text-ec-text-muted font-light">Desde el momento en que ingresa tu vehículo</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: "$5.000.000", label: "Monto máximo" },
                  { value: "100%", label: "Cobertura" },
                  { value: "24/7", label: "Monitoreo" },
                  { value: "Digital", label: "Certificado" },
                ].map((item) => (
                  <div key={item.label} className="text-center p-3 bg-white rounded-sm border border-black/[0.04]">
                    <p className="font-heading text-2xl text-ec-gold">{item.value}</p>
                    <p className="font-ui text-[9px] tracking-[0.2em] text-ec-text-muted uppercase mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Terms */}
            <div>
              <h4 className="font-heading text-xl text-ec-dark mb-5">¿Qué cubre nuestra garantía?</h4>
              <div className="space-y-3">
                {[
                  "Daños físicos ocurridos dentro de nuestras instalaciones durante el proceso de tratamiento.",
                  "Pérdida o extravío de objetos dejados en custodia bajo registro previo.",
                  "Daños por error técnico en los procesos de corrección o aplicación de productos.",
                  "Deterioro de superficies atribuible directamente al proceso aplicado.",
                  "Responsabilidad civil por accidentes dentro del perímetro de custodia.",
                ].map((term, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-5 h-5 bg-green-50 border border-green-200 flex items-center justify-center rounded-full shrink-0 mt-0.5">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3">
                        <polyline points="20,6 9,17 4,12"/>
                      </svg>
                    </div>
                    <p className="font-body text-sm text-ec-text-secondary leading-relaxed">{term}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Exclusions */}
            <div>
              <h4 className="font-heading text-lg text-ec-dark mb-4">Exclusiones</h4>
              <div className="space-y-2">
                {[
                  "Daños preexistentes no declarados al ingreso del vehículo.",
                  "Objetos de valor no registrados en el acta de ingreso.",
                  "Desgaste normal del vehículo por uso.",
                ].map((exc, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-5 h-5 bg-red-50 border border-red-200 flex items-center justify-center rounded-full shrink-0 mt-0.5">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="3">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </div>
                    <p className="font-body text-sm text-ec-text-muted leading-relaxed">{exc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Process */}
            <div className="p-6 bg-ec-cream border border-black/[0.06] rounded-sm">
              <h4 className="font-heading text-lg text-ec-dark mb-4">Proceso de Custodia</h4>
              <div className="space-y-3">
                {[
                  "Al ingresar tu vehículo, generamos un QR único con registro fotográfico 360°.",
                  "Se firma el acta de ingreso y activamos la cobertura de $5.000.000 COP.",
                  "Tu vehículo permanece bajo vigilancia HD 24/7 durante todo el tratamiento.",
                  "Al finalizar, recibes un certificado digital de garantía por el servicio.",
                ].map((step, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <span className="font-ui text-[10px] text-ec-gold/60 font-bold mt-0.5 shrink-0 w-5">{String(i + 1).padStart(2, "0")}</span>
                    <p className="font-body text-sm text-ec-text-secondary leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 sm:p-8 border-t border-black/[0.06] flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                onClose();
                window.dispatchEvent(new CustomEvent('prefill-bot', { 
                  detail: 'Acabo de ver la garantía de custodia y me gustaría agendar, por favor' 
                }));
              }}
              className="flex-1 py-4 font-ui text-[11px] tracking-[0.2em] uppercase font-bold flex items-center justify-center gap-2 rounded-sm transition-colors"
              style={{ background: "#128C7E", color: "#fff" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              HABLAR CON NUESTRA ASESORA
            </button>
            <button
              onClick={onClose}
              className="px-6 py-4 border border-black/[0.06] font-ui text-[11px] tracking-[0.2em] text-ec-text-muted uppercase hover:bg-ec-cream transition-colors rounded-sm"
            >
              CERRAR
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════
// PROTOCOL MODULE — SYSTEM BLOCK (Light)
// ═══════════════════════════════════════
function ProtocolBlock({ protocol, index }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-5%" }}
      transition={{ duration: 0.8, delay: index * 0.1 }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        className={`system-block relative p-8 sm:p-10 transition-all duration-700 cursor-pointer group rounded-sm ${
          expanded
            ? "bg-ec-gold/[0.06] border border-ec-gold/25 shadow-[0_8px_40px_rgba(184,134,11,0.08)]"
            : "bg-white border border-black/[0.06] hover:border-ec-gold/20 shadow-[0_2px_20px_rgba(0,0,0,0.04)]"
        }`}
      >
        {/* System identifier */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full transition-all duration-700 ${
              expanded ? "bg-ec-gold shadow-[0_0_10px_rgba(184,134,11,0.5)]" : "bg-black/10 group-hover:bg-ec-gold/50"
            }`} />
            <span className="font-ui text-[9px] tracking-[0.5em] text-ec-gold uppercase">
              {protocol.subtitle}
            </span>
          </div>
          <motion.span
            animate={{ rotate: expanded ? 45 : 0 }}
            transition={{ duration: 0.5 }}
            className={`font-body text-2xl transition-colors duration-500 ${
              expanded ? "text-ec-gold" : "text-black/15 group-hover:text-black/30"
            }`}
          >
            +
          </motion.span>
        </div>

        {/* Title & description */}
        <h3 className={`font-heading text-3xl sm:text-4xl transition-colors duration-500 mb-4 ${
          expanded ? "text-ec-gold" : "text-ec-dark"
        }`}>
          {protocol.title}
        </h3>
        <p className="font-body text-sm text-ec-text-secondary/70 leading-relaxed max-w-xl font-light">
          {protocol.description}
        </p>

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="pt-8 mt-8 border-t border-ec-gold/10 grid grid-cols-1 sm:grid-cols-2 gap-5">
                {protocol.details.map((detail, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex gap-4 items-start"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-ec-gold mt-2 shrink-0" />
                    <p className="font-body text-[13px] text-ec-text-secondary leading-relaxed">
                      {detail}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════
// PROTOCOLO SECTION
// ═══════════════════════════════════════
export default function ProtocoloSection() {
  const [showGuarantee, setShowGuarantee] = useState(false);

  return (
    <>
      {showGuarantee && <GuaranteeModal onClose={() => setShowGuarantee(false)} />}

      <section id="protocolo" className="relative py-24 sm:py-32 px-4 sm:px-6 bg-ec-cream overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 sm:mb-24 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="max-w-2xl"
            >
              <span className="section-label mb-6 block">PROTOCOLO DE CUSTODIA</span>
              <h2 className="font-heading text-4xl sm:text-5xl md:text-7xl text-ec-dark font-light mt-6 leading-tight">
                Sistema de <br />
                <span className="italic gold-gradient-text">Custodia Absoluta</span>
              </h2>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="max-w-sm"
            >
              <p className="font-body text-sm text-ec-text-secondary leading-relaxed border-l-2 border-ec-gold/30 pl-6 font-light">
                Implementamos un sistema de gestión de calidad único en el país, diseñado para garantizar la integridad absoluta de su patrimonio automotriz.
              </p>
            </motion.div>
          </div>

          {/* Protocol blocks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PROTOCOLS.map((p, i) => (
              <ProtocolBlock key={p.id} protocol={p} index={i} />
            ))}
          </div>

          {/* Guarantee banner */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 sm:mt-20 p-8 sm:p-12 border border-ec-gold/15 bg-ec-gold/[0.04] rounded-sm flex flex-col md:flex-row items-center justify-between gap-8"
          >
            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
              <div className="w-16 h-16 border-2 border-ec-gold flex items-center justify-center p-2.5 rounded-sm shrink-0">
                <img
                  src={BRAND.logo}
                  alt="Garantía Esteticar"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-center sm:text-left">
                <h4 className="font-heading text-xl sm:text-2xl text-ec-dark">Garantía de $5.000.000 COP</h4>
                <p className="font-body text-sm text-ec-text-secondary max-w-md mt-2 font-light">
                  Cada tratamiento incluye una póliza de responsabilidad civil mientras su vehículo esté bajo nuestro cuidado.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowGuarantee(true)}
              className="btn-gold whitespace-nowrap rounded-sm w-full sm:w-auto"
            >
              VER GARANTÍA
            </button>
          </motion.div>
        </div>
      </section>
    </>
  );
}


