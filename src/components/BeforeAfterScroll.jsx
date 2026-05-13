import React, { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { TRANSFORMATIONS } from "../lib/constants";

function RevealCard({ item, index }) {
  const [sliderX, setSliderX] = useState(55);
  const [isDragging, setIsDragging] = useState(false);
  const [showProcess, setShowProcess] = useState(false);
  const cardRef = useRef(null);
  const interacted = useRef(false);

  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start 90%", "center center"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [0, 1]);
  const y = useTransform(scrollYProgress, [0, 0.5], [60, 0]);

  useEffect(() => {
    let frame;
    let start = null;
    const animate = (ts) => {
      if (interacted.current) return;
      if (!start) start = ts;
      const time = (ts - start) / 1000;
      setSliderX(50 + Math.sin(time * 2.2) * 12);
      frame = requestAnimationFrame(animate);
    };
    if (!isDragging && !interacted.current) {
      frame = requestAnimationFrame(animate);
    }
    return () => { if (frame) cancelAnimationFrame(frame); };
  }, [isDragging]);

  const handlePointer = (e) => {
    if (!isDragging) return;
    interacted.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const pos = ((x - rect.left) / rect.width) * 100;
    setSliderX(Math.max(2, Math.min(98, pos)));
  };

  const isReversed = index % 2 === 1;

  return (
    <motion.div ref={cardRef} style={{ opacity, y }} className="relative w-full">
      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-0 items-stretch ${isReversed ? "lg:flex-row-reverse" : ""}`}>

        {/* ── Imagen: double-bezel ── */}
        <div className={`lg:col-span-8 ${isReversed ? "lg:order-2" : ""}`}>
          {/* Outer bezel */}
          <div className="p-[6px] rounded-[1.5rem] h-full"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(184,134,11,0.15)" }}
          >
            {/* Inner bezel */}
            <div
              className="relative overflow-hidden aspect-[16/9] rounded-[calc(1.5rem-6px)] touch-none cursor-ew-resize select-none h-full"
              style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 32px 80px rgba(0,0,0,0.5)" }}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              onMouseMove={handlePointer}
              onTouchMove={handlePointer}
              onTouchStart={() => setIsDragging(true)}
              onTouchEnd={() => setIsDragging(false)}
            >
              {/* After image */}
              <img src={item.after} alt="Resultado" className="absolute inset-0 w-full h-full object-cover saturate-[1.2] brightness-[1.05]" />

              {/* Subtle vignette */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.35) 100%)" }}
              />

              {/* Before overlay */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ width: `${sliderX}%` }}>
                <img
                  src={item.before} alt="Antes"
                  className="absolute top-0 left-0 h-full max-w-none object-cover brightness-[0.72] contrast-[0.9] saturate-[0.6]"
                  style={{ width: `${100 / (sliderX / 100)}%` }}
                />
                {/* before overlay tint */}
                <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.12)" }} />
              </div>

              {/* Divider line */}
              <div className="absolute top-0 bottom-0 z-10 w-px" style={{ left: `${sliderX}%`, background: "linear-gradient(to bottom, transparent, #B8860B, transparent)" }}>
                {/* Handle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  {/* outer ring */}
                  <div className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{
                      background: "rgba(0,0,0,0.55)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(184,134,11,0.5)",
                      boxShadow: "0 0 24px rgba(184,134,11,0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
                    }}
                  >
                    <div className="flex gap-[5px] items-center">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M5 2L1 7L5 12" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 2L13 7L9 12" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* ANTES label */}
              <div className="absolute top-5 left-5 z-10">
                <div className="px-3 py-1.5 rounded-full"
                  style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <span className="font-ui text-[9px] tracking-[0.45em] text-white/60 uppercase">Antes</span>
                </div>
              </div>

              {/* DESPUÉS label */}
              <div className="absolute bottom-5 right-5 z-10">
                <div className="px-4 py-2 rounded-full"
                  style={{
                    background: "linear-gradient(135deg, #B8860B, #D4A017)",
                    boxShadow: "0 4px 20px rgba(184,134,11,0.4)",
                  }}
                >
                  <span className="font-ui text-[9px] tracking-[0.45em] text-white font-bold uppercase">Después</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Info panel ── */}
        <div className={`lg:col-span-4 flex flex-col justify-center ${isReversed ? "lg:order-1 lg:pr-14" : "lg:pl-14"} pt-8 lg:pt-0`}>

          {/* Tag */}
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
            className="font-ui text-[9px] tracking-[0.6em] uppercase mb-5 block"
            style={{ color: "#B8860B" }}
          >
            {item.tag}
          </motion.span>

          {/* Title */}
          <motion.h3
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.08, ease: [0.32, 0.72, 0, 1] }}
            className="font-heading text-3xl sm:text-4xl text-white font-light leading-tight mb-5"
          >
            {item.label}
          </motion.h3>

          {/* Divider */}
          <div className="w-10 h-px mb-5" style={{ background: "rgba(184,134,11,0.4)" }} />

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.18, ease: [0.32, 0.72, 0, 1] }}
            className="font-body text-sm leading-relaxed mb-8 font-light"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            {item.desc}
          </motion.p>

          {/* Price + CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.26, ease: [0.32, 0.72, 0, 1] }}
            className="flex items-stretch gap-3"
          >
            {/* Price card */}
            <div className="flex-1 p-[5px] rounded-[1rem]"
              style={{ background: "rgba(184,134,11,0.06)", border: "1px solid rgba(184,134,11,0.18)" }}
            >
              <div className="rounded-[calc(1rem-5px)] px-5 py-4 h-full flex flex-col justify-center"
                style={{ background: "rgba(0,0,0,0.3)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
              >
                <span className="font-ui text-[8px] tracking-[0.5em] uppercase block mb-1.5" style={{ color: "rgba(184,134,11,0.6)" }}>
                  Inversión
                </span>
                <span className="font-heading text-2xl font-light" style={{ color: "#D4A017" }}>
                  {item.price}
                </span>
              </div>
            </div>

            {/* Process button */}
            <button
              onClick={() => setShowProcess(!showProcess)}
              className="flex-1 rounded-[1rem] font-ui text-[9px] tracking-[0.35em] uppercase transition-all duration-[650ms]"
              style={{
                background: showProcess ? "linear-gradient(135deg, #B8860B, #8B6914)" : "transparent",
                border: showProcess ? "1px solid rgba(184,134,11,0.4)" : "1px solid rgba(255,255,255,0.1)",
                color: showProcess ? "#fff" : "rgba(255,255,255,0.4)",
                boxShadow: showProcess ? "0 8px 28px rgba(184,134,11,0.25)" : "none",
              }}
            >
              {showProcess ? "Ocultar" : "Ver Proceso"}
            </button>
          </motion.div>

          {/* Process steps */}
          <AnimatePresence>
            {showProcess && item.process && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-4 p-[5px] rounded-[1.25rem]"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <div className="rounded-[calc(1.25rem-5px)] p-5"
                    style={{ background: "rgba(0,0,0,0.3)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
                  >
                    <span className="font-ui text-[8px] tracking-[0.5em] uppercase block mb-4" style={{ color: "rgba(184,134,11,0.6)" }}>
                      Protocolo de tratamiento
                    </span>
                    <div className="space-y-0">
                      {item.process.map((step, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1, duration: 0.45, ease: "circOut" }}
                          className="flex gap-4 items-start py-3 border-b last:border-b-0"
                          style={{ borderColor: "rgba(255,255,255,0.05)" }}
                        >
                          <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center"
                            style={{ background: "rgba(184,134,11,0.12)", border: "1px solid rgba(184,134,11,0.25)" }}
                          >
                            <span className="font-ui text-[9px] font-bold" style={{ color: "#B8860B" }}>{i + 1}</span>
                          </div>
                          <p className="font-body text-[12px] leading-relaxed pt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                            {step}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default function BeforeAfterScroll() {
  return (
    <section id="transformacion" className="relative py-28 sm:py-36 px-6 overflow-hidden"
      style={{ background: "#111111" }}
    >
      {/* Ambient gold glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 50% at 50% 100%, rgba(184,134,11,0.06) 0%, transparent 70%)" }}
      />
      {/* Top separator line */}
      <div className="absolute top-0 inset-x-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(184,134,11,0.2), transparent)" }}
      />
      {/* Bottom separator line */}
      <div className="absolute bottom-0 inset-x-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(184,134,11,0.2), transparent)" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-24">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}>
            <span className="font-ui text-[9px] tracking-[0.7em] uppercase mb-6 block" style={{ color: "rgba(184,134,11,0.7)" }}>
              — La Transformación —
            </span>
            <h2 className="font-heading text-4xl sm:text-5xl md:text-6xl font-light mt-4 italic"
              style={{
                background: "linear-gradient(135deg, #B8860B 0%, #D4A017 40%, #F8C840 60%, #B8860B 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Ver para Creer
            </h2>
            <p className="font-body text-sm mt-8 max-w-md mx-auto leading-relaxed font-light" style={{ color: "rgba(255,255,255,0.3)" }}>
              Desliza para descubrir la diferencia que el detalle artesanal hace en cada superficie.
            </p>
          </motion.div>
        </div>

        {/* Cards */}
        <div className="space-y-28 sm:space-y-36">
          {TRANSFORMATIONS.map((item, i) => (
            <RevealCard key={i} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
