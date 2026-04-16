import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

// ═══════════════════════════════════════
// TRUST BREAKER — Light premium version
// ═══════════════════════════════════════
export default function TrustBreaker() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const lineWidth = useTransform(scrollYProgress, [0.2, 0.5], ["0%", "100%"]);

  return (
    <section
      ref={ref}
      className="relative min-h-[65vh] flex items-center justify-center px-6 py-28 overflow-hidden bg-ec-cream"
    >
      {/* Background texture */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(184,134,11,0.04)_0%,transparent_70%)]" />

      {/* Horizontal accent lines */}
      <motion.div
        style={{ width: lineWidth }}
        className="absolute top-1/4 left-0 h-px bg-gradient-to-r from-transparent via-ec-gold/15 to-transparent"
      />
      <motion.div
        style={{ width: lineWidth }}
        className="absolute bottom-1/4 right-0 h-px bg-gradient-to-r from-transparent via-ec-gold/15 to-transparent ml-auto"
      />

      {/* Content — NO opacity transform, always visible */}
      <motion.div
        style={{ y }}
        className="relative z-10 max-w-5xl mx-auto text-center"
      >
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="font-ui text-[10px] tracking-[0.8em] text-ec-gold uppercase mb-10"
        >
          — POR QUÉ ELEGIRNOS —
        </motion.p>

        {/* Line 1: ¿Nosotros? Sí. — bold */}
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ fontWeight: 700 }}
          className="trust-text text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-ec-dark mb-2"
        >
          ¿Nosotros? Sí.
        </motion.h2>

        {/* Line 2: Solo nosotros lo hacemos único. — normal weight */}
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
          style={{ fontWeight: 300 }}
          className="trust-text text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-ec-dark font-light"
        >
          Sólo nosotros lo hacemos único.
        </motion.h2>

        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.7, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-12 mb-8 h-px w-28 bg-ec-gold/30 origin-center"
        />

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.9, duration: 0.7 }}
          className="font-body text-sm sm:text-base text-ec-text-muted font-light tracking-wide"
        >
          Esto dicen nuestros clientes
        </motion.p>
      </motion.div>
    </section>
  );
}
