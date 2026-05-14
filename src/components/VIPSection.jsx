import React, { useState } from "react";
import { motion } from "framer-motion";

const VIPIcons = {
  coffee: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 8h1a4 4 0 1 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" /><line x1="6" y1="2" x2="6" y2="4" /><line x1="10" y1="2" x2="10" y2="4" /><line x1="14" y1="2" x2="14" y2="4" />
    </svg>
  ),
  tv: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="15" rx="2" ry="2" /><polyline points="17 2 12 7 7 2" />
    </svg>
  ),
  wifi: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  ),
  lounge: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3" /><path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-4 0z" /><path d="M4 18v2" /><path d="M20 18v2" />
    </svg>
  ),
  book: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /><line x1="8" y1="7" x2="16" y2="7" /><line x1="8" y1="11" x2="13" y2="11" />
    </svg>
  ),
  water: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  ),
};

const AMENITIES = [
  { icon: "coffee", title: "Café de Especialidad", description: "Barismo artesanal con granos premium de origen colombiano. Cappuccino, latte o espresso, cortesía de la casa.", detail: "Preparado al momento" },
  { icon: "tv", title: "Entretenimiento 4K", description: "Pantalla de alta definición con streaming completo. Netflix, YouTube y más mientras tu vehículo recibe el tratamiento.", detail: "Smart TV 65\"" },
  { icon: "wifi", title: "WiFi Premium", description: "Conexión de alta velocidad de fibra óptica. Trabaja, navega o transmite sin interrupciones.", detail: "300 Mbps dedicados" },
  { icon: "lounge", title: "Lounge Exclusivo", description: "Mobiliario de diseño con iluminación ambiental. Un espacio diseñado para que disfrutes tu espera como mereces.", detail: "Ambiente climatizado" },
  { icon: "book", title: "Zona de Lectura", description: "Publicaciones de automoción, lifestyle y negocios. Revistas internacionales actualizadas mensualmente.", detail: "Selección curada" },
  { icon: "water", title: "Hidratación Premium", description: "Agua mineral importada y bebidas energéticas disponibles durante tu visita.", detail: "Servicio ilimitado" },
];

function AmenityCard({ amenity, index }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-5%" }}
      transition={{ duration: 0.8, delay: index * 0.09, ease: [0.32, 0.72, 0, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative"
    >
      {/* Outer shell */}
      <div
        className={`p-[6px] rounded-[1.75rem] transition-all duration-700 ${
          hovered
            ? "bg-ec-gold/[0.12] border border-ec-gold/30"
            : "bg-white/[0.04] border border-white/[0.08]"
        }`}
      >
        {/* Inner core */}
        <div
          className={`relative p-8 sm:p-10 rounded-[calc(1.75rem-6px)] h-full overflow-hidden transition-all duration-700 ${
            hovered
              ? "bg-[#1F1A0E] border border-ec-gold/[0.15]"
              : "bg-[#111111] border border-white/[0.05]"
          }`}
          style={{
            boxShadow: hovered
              ? "inset 0 1px 1px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.5)"
              : "inset 0 1px 1px rgba(255,255,255,0.04)",
          }}
        >
          {/* Gold sweep line on hover */}
          <div className={`absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-ec-gold/60 to-transparent transition-all duration-1000 ${hovered ? "w-full" : "w-0"}`} />
          {/* Corner accent */}
          <div className="absolute top-0 right-0 w-16 h-16 border-r border-t border-ec-gold/[0.08] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

          {/* Icon */}
          <div
            className={`mb-7 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-700 ${
              hovered
                ? "bg-ec-gold text-white shadow-[0_0_30px_rgba(184,134,11,0.4)] scale-110"
                : "bg-white/[0.06] text-ec-gold/70"
            }`}
          >
            {VIPIcons[amenity.icon]}
          </div>

          <span className="font-ui text-[9px] tracking-[0.5em] text-ec-gold/50 uppercase block mb-3">{amenity.detail}</span>
          <h3 className={`font-heading text-2xl sm:text-3xl transition-all duration-500 mb-4 leading-tight ${hovered ? "text-ec-gold-light" : "text-white/90"}`}>
            {amenity.title}
          </h3>
          <p className="font-body text-sm text-white/40 leading-relaxed font-light">{amenity.description}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function VIPSection() {
  return (
    <section id="vip" className="relative py-40 px-6 overflow-hidden bg-ec-dark">
      {/* Atmospheric gold radial */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(184,134,11,0.07)_0%,transparent_60%)] pointer-events-none" />

      {/* Oversized decorative number */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-0 font-heading text-[38vw] leading-none text-white/[0.02] select-none pointer-events-none whitespace-nowrap"
        aria-hidden
      >
        VIP
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-24 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.32, 0.72, 0, 1] }}
            className="max-w-2xl"
          >
            <span className="section-label mb-6 block" style={{ color: "#D4A017" }}>EXPERIENCIA VIP</span>
            <h2 className="font-heading text-4xl sm:text-5xl md:text-6xl text-white font-light mt-6 leading-tight">
              Tu Espera es{" "}
              <span
                className="italic"
                style={{
                  background: "linear-gradient(135deg, #D4A017 0%, #F8C840 50%, #D4A017 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                una Experiencia
              </span>
            </h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-sm"
          >
            <p className="font-body text-sm text-white/40 leading-relaxed border-l-2 border-ec-gold/30 pl-6 font-light">
              No solo cuidamos tu vehículo. Cuidamos cada minuto de tu tiempo. Nuestro Salón VIP está diseñado para que tu espera sea tan premium como nuestro servicio.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {AMENITIES.map((a, i) => <AmenityCard key={a.title} amenity={a} index={i} />)}
        </div>

        {/* Acceso VIP banner */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.32, 0.72, 0, 1] }}
          className="mt-16"
        >
          <div className="p-[6px] rounded-[1.75rem] bg-ec-gold/[0.08] border border-ec-gold/20">
            <div
              className="rounded-[calc(1.75rem-6px)] p-12 sm:p-16 flex flex-col md:flex-row items-center justify-between gap-12 bg-[#111111]"
              style={{ boxShadow: "inset 0 1px 1px rgba(255,255,255,0.04)" }}
            >
              <div className="max-w-xl">
                <span className="font-ui text-[10px] tracking-[0.5em] text-ec-gold/70 uppercase block mb-4">INCLUIDO EN TODOS LOS SERVICIOS</span>
                <h3 className="font-heading text-3xl sm:text-4xl text-white">
                  Acceso completo al{" "}
                  <span
                    style={{
                      background: "linear-gradient(135deg, #D4A017 0%, #F8C840 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    Salón VIP
                  </span>
                </h3>
                <p className="font-body text-sm text-white/35 mt-4 leading-relaxed font-light">
                  Cada tratamiento incluye acceso ilimitado a nuestro salón VIP. Café, entretenimiento y comodidad mientras tu vehículo recibe el mejor cuidado posible.
                </p>
              </div>
              <div className="text-center shrink-0">
                <span
                  className="font-heading text-5xl block"
                  style={{
                    background: "linear-gradient(135deg, #D4A017 0%, #F8C840 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  100%
                </span>
                <p className="font-ui text-[10px] tracking-[0.4em] text-white/30 uppercase mt-2">Cortesía</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
