import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

// 3-act sticky scroll: dirty → foam → showroom
// Acts: 0–0.33 = Act I (dirty), 0.33–0.66 = Act II (foam), 0.66–1 = Act III (clean)

const STEPS = [
  { n: "01", title: "Diagnóstico perimetral", desc: "Escaneo fotográfico 360° bajo luz forense." },
  { n: "02", title: "Descontaminación", desc: "Espuma activa y arcilla descontaminante." },
  { n: "03", title: "Corrección de pintura", desc: "Pulidora orbital DA — cero swirl marks." },
  { n: "04", title: "Sellado cerámico", desc: "Garantía de custodia $5.000.000 COP activa." },
];

const STEP_RANGES = [
  [0.05, 0.30],
  [0.33, 0.55],
  [0.55, 0.72],
  [0.72, 0.90],
];

function StepCard({ step, scrollYProgress, inStart, inEnd, isLast }) {
  const opacity = useTransform(
    scrollYProgress,
    isLast
      ? [inStart, inStart + 0.07, 0.95, 1]
      : [inStart, inStart + 0.07, inEnd - 0.04, inEnd],
    isLast ? [0, 1, 1, 1] : [0, 1, 1, 0.2]
  );
  const y = useTransform(scrollYProgress, [inStart, inStart + 0.09], [20, 0]);

  return (
    <motion.div style={{ opacity, y }}>
      <div
        className="p-[4px] rounded-[1rem]"
        style={{ background: "rgba(184,134,11,0.09)", border: "1px solid rgba(184,134,11,0.22)" }}
      >
        <div
          className="rounded-[calc(1rem-4px)] px-4 py-3"
          style={{
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(14px)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          <span
            className="font-ui text-[9px] font-bold block mb-1"
            style={{ color: "rgba(184,134,11,0.65)", letterSpacing: "0.1em" }}
          >
            {step.n}
          </span>
          <p
            className="font-heading text-sm sm:text-base font-light leading-snug mb-1"
            style={{ color: "#F0EBE0" }}
          >
            {step.title}
          </p>
          <p
            className="font-body text-[11px] leading-relaxed hidden sm:block"
            style={{ color: "rgba(255,255,255,0.38)" }}
          >
            {step.desc}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function CinematicProcess() {
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // ── Act transitions ──
  // Act I (dirty):    fully visible 0 → 0.28, fades out 0.28 → 0.40
  // Act II (foam):    fades in 0.28 → 0.40, fully visible 0.40 → 0.60, fades out 0.60 → 0.72
  // Act III (clean):  fades in 0.60 → 0.72, fully visible → end
  const act1Opacity = useTransform(scrollYProgress, [0, 0.06, 0.28, 0.40], [0, 1, 1, 0]);
  const act2Opacity = useTransform(scrollYProgress, [0.28, 0.40, 0.60, 0.72], [0, 1, 1, 0]);
  const act3Opacity = useTransform(scrollYProgress, [0.60, 0.72, 1, 1], [0, 1, 1, 1]);

  // Gold glow arrives with Act III
  const glowOpacity = useTransform(scrollYProgress, [0.65, 0.88], [0, 0.85]);

  // "De sucio a Showroom" headline — arrives at Act III
  const headlineOpacity = useTransform(scrollYProgress, [0.72, 0.84], [0, 1]);
  const headlineY       = useTransform(scrollYProgress, [0.72, 0.84], [24, 0]);

  // "Showroom" label badge — Act III
  const afterLabelOpacity = useTransform(scrollYProgress, [0.78, 0.90], [0, 1]);

  // Hint fades out quickly
  const hintOpacity = useTransform(scrollYProgress, [0, 0.07], [1, 0]);

  return (
    <div ref={containerRef} style={{ height: "500vh", position: "relative" }}>

      {/* ── Sticky panel ── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100dvh",
          overflow: "hidden",
          background: "#060606",
        }}
      >
        {/* Grain overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        {/* ── Image layers ── */}
        <div className="absolute inset-0 z-0">

          {/* Act I — Dirty */}
          <motion.img
            src="/process-dirty.jpg.png"
            alt="Antes — sucio"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: act1Opacity,
              filter: "saturate(0.55) brightness(0.72) contrast(1.1)",
            }}
          />

          {/* Act II — Foam process */}
          <motion.img
            src="/process-foam.jpg.png"
            alt="Proceso — espuma activa"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: act2Opacity,
              filter: "saturate(0.85) brightness(0.80) contrast(1.08)",
            }}
          />

          {/* Act III — Showroom clean */}
          <motion.img
            src="/process-clean.jpg.png"
            alt="Después — acabado showroom"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: act3Opacity,
              filter: "saturate(1.18) brightness(1.02) contrast(1.06)",
            }}
          />

          {/* Gold glow on Act III */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              opacity: glowOpacity,
              background:
                "radial-gradient(ellipse 70% 65% at 55% 52%, rgba(212,160,23,0.18) 0%, transparent 62%)",
            }}
          />
        </div>

        {/* Vignette */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 38%, rgba(0,0,0,0.58) 100%)",
          }}
        />
        {/* Top fade */}
        <div
          className="absolute top-0 inset-x-0 h-1/4 z-[1] pointer-events-none"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)" }}
        />
        {/* Bottom fade */}
        <div
          className="absolute bottom-0 inset-x-0 h-2/5 z-[1] pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.82), transparent)" }}
        />

        {/* ── Top pill ── */}
        <div className="absolute top-8 inset-x-0 z-20 flex justify-center">
          <div
            className="px-5 py-2 rounded-full"
            style={{
              background: "rgba(0,0,0,0.55)",
              border: "1px solid rgba(184,134,11,0.22)",
              backdropFilter: "blur(12px)",
            }}
          >
            <span
              className="font-ui text-[9px] tracking-[0.6em] uppercase"
              style={{ color: "rgba(184,134,11,0.85)" }}
            >
              — El Proceso —
            </span>
          </div>
        </div>

        {/* ── Headline Act III ── */}
        <motion.div
          style={{ opacity: headlineOpacity, y: headlineY }}
          className="absolute top-1/2 inset-x-0 -translate-y-[calc(50%+4rem)] z-20 flex flex-col items-center gap-3 px-6 text-center pointer-events-none"
        >
          <p
            className="font-ui text-[9px] tracking-[0.55em] uppercase"
            style={{ color: "rgba(184,134,11,0.75)" }}
          >
            Resultado final
          </p>
          <h2
            className="font-heading text-4xl sm:text-6xl md:text-7xl font-light leading-none"
            style={{
              color: "#F5EDD8",
              textShadow: "0 2px 40px rgba(0,0,0,0.6)",
              letterSpacing: "-0.02em",
            }}
          >
            De sucio<br />a <em style={{ fontStyle: "italic", color: "#D4A017" }}>Showroom</em>
          </h2>
        </motion.div>

        {/* ── Showroom badge ── */}
        <motion.div
          style={{ opacity: afterLabelOpacity }}
          className="absolute top-1/2 right-5 sm:right-10 -translate-y-1/2 z-20"
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
            style={{
              background: "linear-gradient(135deg, rgba(184,134,11,0.92), rgba(212,160,23,0.92))",
              boxShadow: "0 4px 28px rgba(184,134,11,0.45)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.9)",
                flexShrink: 0,
              }}
            />
            <span className="font-ui text-[9px] tracking-[0.4em] uppercase text-white font-bold">
              Showroom
            </span>
          </div>
        </motion.div>

        {/* ── Step cards ── */}
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
        <motion.div
          style={{ opacity: hintOpacity }}
          className="absolute bottom-7 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
        >
          <span
            className="font-ui text-[8px] tracking-[0.5em] uppercase"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            Desliza
          </span>
          <motion.div
            animate={{ y: [0, 7, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            style={{
              width: 1,
              height: 26,
              background: "linear-gradient(to bottom, rgba(184,134,11,0.7), transparent)",
            }}
          />
        </motion.div>

      </div>
    </div>
  );
}
