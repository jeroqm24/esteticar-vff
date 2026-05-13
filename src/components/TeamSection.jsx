import React, { useState } from "react";
import { motion } from "framer-motion";
import { TEAM } from "../lib/constants";

function TeamMember({ member, index }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.9, delay: index * 0.12, ease: [0.32, 0.72, 0, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative group cursor-default"
    >
      {/* Photo frame — Double-Bezel */}
      <div
        className={`p-[6px] rounded-[2rem] mb-6 transition-all duration-[700ms] ${
          hovered
            ? "bg-ec-gold/[0.12] border border-ec-gold/30 shadow-[0_0_40px_rgba(184,134,11,0.12)]"
            : "bg-black/[0.03] border border-black/[0.06]"
        }`}
      >
        <div
          className="relative aspect-[3/4] overflow-hidden bg-ec-cream rounded-[calc(2rem-6px)]"
          style={{
            boxShadow: hovered
              ? "inset 0 1px 1px rgba(255,255,255,0.4)"
              : "inset 0 1px 1px rgba(255,255,255,0.7)",
          }}
        >
          <img
            src={member.image}
            alt={member.name}
            className="absolute inset-0 w-full h-full object-cover transition-all duration-[1200ms] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.07]"
          />

          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          {/* Hover overlay with authority text */}
          <motion.div
            initial={false}
            animate={{ y: hovered ? 0 : 16, opacity: hovered ? 1 : 0 }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            className="absolute bottom-4 left-4 right-4"
          >
            <div
              className="p-4 rounded-xl border border-white/20"
              style={{
                background: "rgba(10,10,10,0.85)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
            >
              <p className="font-body text-xs text-white/70 leading-relaxed font-light">
                {member.authority}
              </p>
            </div>
          </motion.div>

          {/* Status dot */}
          <div className="absolute top-4 right-4">
            <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
              hovered ? "bg-ec-gold shadow-[0_0_10px_rgba(184,134,11,0.8)]" : "bg-white/50"
            }`} />
          </div>

          {/* Bottom name overlay — always visible */}
          <div className="absolute bottom-0 left-0 right-0 p-5 opacity-0 group-hover:opacity-0">
            {/* hidden — shown below card instead */}
          </div>
        </div>
      </div>

      {/* Name & role below photo */}
      <div className="px-1">
        <h3 className={`font-heading text-2xl transition-colors duration-500 leading-tight ${hovered ? "text-ec-gold" : "text-ec-dark"}`}>
          {member.name}
        </h3>
        <p className="font-ui text-[10px] tracking-[0.45em] text-ec-gold/80 uppercase mt-1.5">
          {member.role}
        </p>
      </div>
    </motion.div>
  );
}

export default function TeamSection() {
  return (
    <section id="equipo" className="relative py-40 px-6 bg-ec-cream overflow-hidden">
      {/* Subtle grain */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_100%_50%,rgba(184,134,11,0.04)_0%,transparent_60%)] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-24 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.32, 0.72, 0, 1] }}
          >
            <span className="section-label mb-6 block">NUESTRO EQUIPO</span>
            <h2 className="font-heading text-5xl md:text-7xl lg:text-8xl text-ec-dark font-light mt-6 leading-tight tracking-tighter">
              El Equipo detrás <br />
              <span className="italic" style={{
                background: "linear-gradient(135deg, #B8860B 0%, #D4A017 50%, #B8860B 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>del Estándar</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-sm"
          >
            <p className="font-body text-sm text-ec-text-secondary leading-relaxed border-l-2 border-ec-gold/30 pl-6 font-light">
              Cada miembro de nuestro equipo ha sido seleccionado por su compromiso con la excelencia y su pasión por el detailing automotriz.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {TEAM.map((member, i) => (
            <TeamMember key={member.name} member={member} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
