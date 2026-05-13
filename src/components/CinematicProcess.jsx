import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const STEPS = [
  { n: "01", title: "Diagnóstico perimetral", desc: "Escaneo fotográfico 360° bajo luz forense." },
  { n: "02", title: "Descontaminación", desc: "Espuma activa y arcilla descontaminante." },
  { n: "03", title: "Corrección de pintura", desc: "Pulidora orbital DA — cero swirl marks." },
  { n: "04", title: "Sellado cerámico", desc: "Garantía de custodia $5.000.000 COP activa." },
];

// Componente individual por step para que useTransform esté en nivel top
function StepCard({ step, scrollYProgress, inStart, inEnd, isLast }) {
  const opacity = useTransform(
    scrollYProgress,
    isLast
      ? [inStart, inStart + 0.08, 0.95, 1]
      : [inStart, inStart + 0.08, inEnd - 0.05, inEnd],
    isLast ? [0, 1, 1, 1] : [0, 1, 1, 0.25]
  );
  const y = useTransform(scrollYProgress, [inStart, inStart + 0.1], [18, 0]);

  return (
    <motion.div style={{ opacity, y }}>
      <div className="p-[4px] rounded-[1rem]"
        style={{ background: "rgba(184,134,11,0.09)", border: "1px solid rgba(184,134,11,0.22)" }}>
        <div className="rounded-[calc(1rem-4px)] px-4 py-3"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(14px)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" }}>
          <span className="font-ui text-[9px] font-bold block mb-1" style={{ color: "rgba(184,134,11,0.65)", letterSpacing: "0.1em" }}>
            {step.n}
          </span>
          <p className="font-heading text-sm sm:text-base font-light leading-snug mb-1" style={{ color: "#F0EBE0" }}>
            {step.title}
          </p>
          <p className="font-body text-[11px] leading-relaxed hidden sm:block" style={{ color: "rgba(255,255,255,0.38)" }}>
            {step.desc}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

const STEP_RANGES = [
  [0.05, 0.28],
  [0.28, 0.48],
  [0.48, 0.68],
  [0.68, 0.88],
];

export default function CinematicProcess() {
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Slider before→after
  const sliderWidth = useTransform(scrollYProgress, [0.05, 0.85], ["100%", "0%"]);
  const sliderLeft  = useTransform(scrollYProgress, [0.05, 0.85], ["100%", "0%"]);

  // Overlays
  const beforeOpacity     = useTransform(scrollYProgress, [0, 0.1, 0.78, 0.9], [1, 1, 0.5, 0]);
  const afterLabelOpacity = useTransform(scrollYProgress, [0.75, 0.92], [0, 1]);
  const glowOpacity       = useTransform(scrollYProgress, [0.65, 1], [0, 0.9]);
  const hintOpacity       = useTransform(scrollYProgress, [0, 0.07], [1, 0]);

  return (
    <div ref={containerRef} style={{ height: "420vh", position: "relative" }}>

      {/* Panel sticky */}
      <div style={{ position: "sticky", top: 0, height: "100dvh", overflow: "hidden", background: "#080808" }}>

        {/* Grain */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
        />

        {/* ── Imágenes full-bleed ── */}
        <div className="absolute inset-0 z-0">
          {/* AFTER */}
          <img src="/despues-1.jpg" alt="Después" className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: "saturate(1.25) brightness(1.04) contrast(1.05)" }} />

          {/* Gold glow sobre after */}
          <motion.div className="absolute inset-0 pointer-events-none"
            style={{
              opacity: glowOpacity,
              background: "radial-gradient(ellipse 65% 65% at 58% 50%, rgba(212,160,23,0.14) 0%, transparent 65%)",
            }}
          />

          {/* BEFORE encima — se retira con el slider */}
          <motion.div className="absolute top-0 left-0 h-full overflow-hidden" style={{ width: sliderWidth }}>
            <img src="/antes-1.jpg" alt="Antes"
              className="absolute top-0 left-0 h-full object-cover"
              style={{ width: "100vw", filter: "saturate(0.25) brightness(0.58) contrast(1.12)" }}
            />
          </motion.div>

          {/* Línea divisoria */}
          <motion.div
            className="absolute top-0 h-full pointer-events-none z-10"
            style={{
              left: sliderLeft,
              width: 1,
              background: "linear-gradient(to bottom, transparent 8%, #D4A017 30%, #D4A017 70%, transparent 92%)",
            }}
          />
        </div>

        {/* Vignette + fades */}
        <div className="absolute inset-0 z-[1] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,0.52) 100%)" }} />
        <div className="absolute top-0 inset-x-0 h-1/4 z-[1] pointer-events-none"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)" }} />
        <div className="absolute bottom-0 inset-x-0 h-2/5 z-[1] pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)" }} />

        {/* ── Top pill ── */}
        <div className="absolute top-8 inset-x-0 z-20 flex justify-center">
          <div className="px-5 py-2 rounded-full"
            style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(184,134,11,0.22)", backdropFilter: "blur(12px)" }}>
            <span className="font-ui text-[9px] tracking-[0.6em] uppercase" style={{ color: "rgba(184,134,11,0.85)" }}>
              — El Proceso —
            </span>
          </div>
        </div>

        {/* ── Label ANTES ── */}
        <motion.div style={{ opacity: beforeOpacity }}
          className="absolute top-1/2 left-5 sm:left-10 -translate-y-1/2 z-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,90,90,0.85)", flexShrink: 0 }} />
            <span className="font-ui text-[9px] tracking-[0.4em] uppercase" style={{ color: "rgba(255,255,255,0.5)" }}>Sin tratar</span>
          </div>
        </motion.div>

        {/* ── Label DESPUÉS ── */}
        <motion.div style={{ opacity: afterLabelOpacity }}
          className="absolute top-1/2 right-5 sm:right-10 -translate-y-1/2 z-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
            style={{
              background: "linear-gradient(135deg, rgba(184,134,11,0.92), rgba(212,160,23,0.92))",
              boxShadow: "0 4px 28px rgba(184,134,11,0.45)",
              backdropFilter: "blur(8px)",
            }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.9)", flexShrink: 0 }} />
            <span className="font-ui text-[9px] tracking-[0.4em] uppercase text-white font-bold">Showroom</span>
          </div>
        </motion.div>

        {/* ── Pasos — aparecen uno a uno ── */}
        <div className="absolute bottom-10 sm:bottom-14 inset-x-0 z-20 px-5 sm:px-10">
          <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STEPS.map((step, i) => (
              <StepCard
                key={step.n}
                step={step}
                scrollYProgress={scrollYProgress}
                inStart={STEP_RANGES[i][0]}
                inEnd={STEP_RANGES[i][1]}
                isLast={i === STEPS.length - 1}
              />
            ))}
          </div>
        </div>

        {/* ── Scroll hint ── */}
        <motion.div style={{ opacity: hintOpacity }}
          className="absolute bottom-7 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
          <span className="font-ui text-[8px] tracking-[0.5em] uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
            Desliza
          </span>
          <motion.div
            animate={{ y: [0, 7, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: 1, height: 26, background: "linear-gradient(to bottom, rgba(184,134,11,0.7), transparent)" }}
          />
        </motion.div>

      </div>
    </div>
  );
}
