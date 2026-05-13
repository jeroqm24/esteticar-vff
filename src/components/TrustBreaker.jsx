import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function TrustBreaker() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const lineWidth = useTransform(scrollYProgress, [0.15, 0.5], ["0%", "100%"]);

  return (
    <section
      ref={ref}
      className="relative min-h-[85vh] flex items-center justify-center px-6 py-40 overflow-hidden bg-ec-dark"
    >
      {/* Radial gold glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,rgba(184,134,11,0.09)_0%,transparent_65%)] pointer-events-none" />

      {/* Animated horizontal lines */}
      <motion.div
        style={{ width: lineWidth }}
        className="absolute top-[28%] left-0 h-px bg-gradient-to-r from-transparent via-ec-gold/30 to-transparent"
      />
      <motion.div
        style={{ width: lineWidth }}
        className="absolute bottom-[28%] right-0 h-px bg-gradient-to-l from-transparent via-ec-gold/20 to-transparent ml-auto"
      />

      {/* Oversized decorative number */}
      <div
        className="absolute right-[-2rem] top-1/2 -translate-y-1/2 font-heading text-[20rem] leading-none text-white/[0.025] select-none pointer-events-none"
        aria-hidden
      >
        01
      </div>

      <motion.div
        style={{ y }}
        className="relative z-10 max-w-6xl mx-auto text-center"
      >
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
          className="font-ui text-[10px] tracking-[0.9em] text-ec-gold uppercase mb-14"
        >
          — POR QUÉ ELEGIRNOS —
        </motion.p>

        {/* Line 1 — heavy weight, white */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.32, 0.72, 0, 1] }}
          className="trust-text text-6xl sm:text-8xl md:text-9xl lg:text-[10rem] text-white leading-[0.9] tracking-tighter mb-2"
          style={{ fontWeight: 700 }}
        >
          ¿Nosotros? Sí.
        </motion.h2>

        {/* Line 2 — light weight, white italic */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.12, ease: [0.32, 0.72, 0, 1] }}
          className="trust-text text-5xl sm:text-7xl md:text-8xl lg:text-9xl leading-[0.95] tracking-tighter"
          style={{ fontWeight: 300, fontStyle: "italic", color: "#ffffff" }}
        >
          Sólo nosotros lo hacemos único.
        </motion.h2>

        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8, duration: 1.6, ease: [0.32, 0.72, 0, 1] }}
          className="mx-auto mt-16 mb-10 h-px w-32 bg-gradient-to-r from-transparent via-ec-gold/60 to-transparent origin-center"
        />

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 1.0, duration: 0.7 }}
          className="font-body text-sm sm:text-base text-white/30 font-light tracking-widest"
        >
          Esto dicen nuestros clientes
        </motion.p>
      </motion.div>
    </section>
  );
}
