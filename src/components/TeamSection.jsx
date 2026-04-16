import React, { useState } from "react";
import { motion } from "framer-motion";
import { TEAM } from "../lib/constants";

function TeamMember({ member, index }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: index * 0.12 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative group cursor-default"
    >
      <div className="relative aspect-[3/4] overflow-hidden mb-6 bg-ec-cream rounded-sm shadow-[0_4px_30px_rgba(0,0,0,0.08)]">
        <img
          src={member.image}
          alt={member.name}
          className="absolute inset-0 w-full h-full object-cover transition-all duration-1000 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        <motion.div
          initial={false}
          animate={{ y: hovered ? 0 : 10, opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          className="absolute bottom-4 left-4 right-4"
        >
          <div className="bg-white/90 backdrop-blur-md border border-ec-gold/15 p-4 rounded-sm">
            <p className="font-body text-xs text-ec-text-secondary leading-relaxed font-light">
              {member.authority}
            </p>
          </div>
        </motion.div>

        <div className="absolute top-4 right-4">
          <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${
            hovered ? "bg-ec-gold shadow-[0_0_8px_rgba(184,134,11,0.6)]" : "bg-white/60"
          }`} />
        </div>
      </div>

      <div>
        <h3 className="font-heading text-xl text-ec-dark group-hover:text-ec-gold transition-colors duration-500">
          {member.name}
        </h3>
        <p className="font-ui text-[10px] tracking-[0.4em] text-ec-gold uppercase mt-1">
          {member.role}
        </p>
      </div>
    </motion.div>
  );
}

export default function TeamSection() {
  return (
    <section id="equipo" className="relative py-32 px-6 bg-ec-white overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-24 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="section-label mb-6 block">NUESTRO EQUIPO</span>
            <h2 className="font-heading text-5xl md:text-7xl text-ec-dark font-light mt-6 leading-tight">
              El Equipo detrás <br />
              <span className="italic gold-gradient-text">del Estándar</span>
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
