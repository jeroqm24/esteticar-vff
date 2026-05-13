import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

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
      className="relative min-h-[75vh] flex items-center justify-center px-6 py-32 overflow-hidden bg-ec-cream"
    >
      {/* Subtle gold radial */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(184,134,11,0.05)_0%,transparent_70%)] pointer-events-none" />

      {/* Animated horizontal accent lines */}
      <motion.div
        style={{ width: lineWidth }}
        className="absolute top-[28%] left-0 h-px bg-gradient-to-r from-transparent via-ec-gold/20 to-transparent"
      />
      <motion.div
        style={{ width: lineWidth }}
        className="absolute bottom-[28%] right-0 h-px bg-gradient-to-l from-transparent via-ec-gold/15 to-transparent"
      />

      <motion.div
        style={{ y }}
        className="relative z-10 max-w-6xl mx-auto text-center"
      >
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
          className="font-ui text-[10px] tracking-[0.8em] uppercase mb-14"
          style={{ color: "#B8860B" }}
        >
          — POR QUÉ ELEGIRNOS —
        </motion.p>

        {/* Line 1 — bold, dark */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.32, 0.72, 0, 1] }}
          className="trust-text text-6xl sm:text-8xl md:text-9xl lg:text-[10rem] leading-[0.9] tracking-tighter mb-2"
          style={{ fontWeight: 700, color: "#1A1A1A" }}
        >
          ¿Nosotros? Sí.
        </motion.h2>

        {/* Line 2 — light, gold */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.12, ease: [0.32, 0.72, 0, 1] }}
          className="trust-text text-5xl sm:text-7xl md:text-8xl lg:text-9xl leading-[0.95] tracking-tighter"
          style={{
            fontWeight: 300,
            fontStyle: "italic",
            background: "linear-gradient(135deg, #B8860B 0%, #D4A017 50%, #B8860B 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Sólo nosotros lo hacemos único.
        </motion.h2>

        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.7, duration: 1.4, ease: [0.32, 0.72, 0, 1] }}
          className="mx-auto mt-14 mb-10 h-px w-28 origin-center"
          style={{ background: "rgba(184,134,11,0.3)" }}
        />

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.9, duration: 0.7 }}
          className="font-body text-sm sm:text-base font-light tracking-wide"
          style={{ color: "#999999" }}
        >
          Esto dicen nuestros clientes
        </motion.p>
      </motion.div>
    </section>
  );
}
