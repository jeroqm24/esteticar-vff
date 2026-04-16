import React, { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { FINAL_CTA, BRAND } from "../lib/constants";

export default function FinalCTA({ onOpenChat }) {
  const containerRef = useRef(null);
  const inView = useInView(containerRef, { once: true, margin: "-10%" });
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [-80, 80]);

  return (
    <section ref={containerRef} className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden bg-ec-dark">
      {/* Subtle gradient background */}
      <motion.div style={{ y }} className="absolute inset-0 z-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(184,134,11,0.12)_0%,transparent_50%)]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-px h-[400px] bg-gradient-to-b from-transparent via-ec-gold-light/20 to-transparent" />
      </motion.div>

      <div className="relative z-10 text-center max-w-5xl mx-auto py-32">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={inView ? { opacity: 1, scale: 1 } : {}} transition={{ duration: 1.5 }} className="mb-16">
          <img src={BRAND.logo} alt="Logo" className="h-16 md:h-24 mx-auto object-contain" style={{ filter: "brightness(1.3) drop-shadow(0 0 40px rgba(248,200,64,0.3))" }} />
        </motion.div>

        <div className="overflow-hidden">
          <motion.h2 initial={{ y: "100%" }} animate={inView ? { y: 0 } : {}} transition={{ duration: 1.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="font-heading text-4xl sm:text-6xl md:text-8xl text-white font-light leading-[0.95] tracking-tighter"
          >{FINAL_CTA.line1}</motion.h2>
        </div>
        <div className="overflow-hidden mt-2">
          <motion.h2 initial={{ y: "100%" }} animate={inView ? { y: 0 } : {}} transition={{ duration: 1.4, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="font-heading text-4xl sm:text-6xl md:text-8xl italic leading-[0.95] tracking-tighter"
            style={{ background: "linear-gradient(135deg, #F8C840 0%, #FCE48C 50%, #F8C840 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >{FINAL_CTA.line2}</motion.h2>
        </div>

        <motion.div initial={{ width: 0 }} animate={inView ? { width: 120 } : {}} transition={{ duration: 1.5, delay: 1 }}
          className="h-px mx-auto mt-20 mb-16 bg-gradient-to-r from-transparent via-ec-gold-light/40 to-transparent" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, delay: 1.2 }}
          className="flex flex-col md:flex-row items-center justify-center gap-4 sm:gap-6 mt-8"
        >
          <a
            href={BRAND.facebookUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-10 py-4 sm:py-5 font-ui text-[10px] sm:text-[12px] font-bold tracking-[0.2em] sm:tracking-[0.4em] uppercase transition-all hover:scale-105 hover:shadow-[0_8px_30px_rgba(24,119,242,0.3)] w-full md:w-auto group overflow-hidden"
            style={{ background: "#1877F2", color: "#fff" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="opacity-80 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span className="truncate">{BRAND.facebook}</span>
          </a>
          <a href={BRAND.instagramUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-10 py-4 sm:py-5 border border-white/15 text-white/60 font-ui text-[10px] sm:text-[12px] tracking-[0.2em] sm:tracking-[0.4em] uppercase hover:border-ec-gold-light hover:text-ec-gold-light transition-all w-full md:w-auto group overflow-hidden"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
            <span className="truncate">{BRAND.instagram}</span>
          </a>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 1.8, duration: 1 }}
          className="mt-40 grid grid-cols-1 md:grid-cols-3 gap-12 text-left border-t border-white/[0.06] pt-16"
        >
          <div className="space-y-3">
            <p className="font-ui text-[10px] tracking-[0.4em] text-ec-gold-light uppercase">Ubicación</p>
            <p className="font-body text-sm text-white/40 leading-relaxed font-light">{BRAND.location}</p>
          </div>
          <div className="space-y-3">
            <p className="font-ui text-[10px] tracking-[0.4em] text-ec-gold-light uppercase">Contacto</p>
            <a href={BRAND.whatsappUrl} target="_blank" rel="noopener noreferrer" className="font-body text-sm text-white/40 leading-relaxed font-light hover:text-ec-gold-light transition-colors block">{BRAND.whatsapp}</a>
          </div>
          <div className="space-y-3">
            <p className="font-ui text-[10px] tracking-[0.4em] text-ec-gold-light uppercase">Horario</p>
            <p className="font-body text-sm text-white/40 leading-relaxed font-light">{BRAND.hours}</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 2.2 }}
          className="mt-20 pt-8 border-t border-white/[0.06] flex items-center justify-center"
        >
          <p className="font-ui text-[9px] tracking-[0.3em] text-white/20 uppercase w-full text-center">© 2026 {BRAND.name.toUpperCase()} · CUSTODIA VEHICULAR PREMIUM</p>
        </motion.div>
      </div>
    </section>
  );
}
