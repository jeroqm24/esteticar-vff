import React, { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import { BRAND } from "../lib/constants";

const STEPS = [
  { n: "01", label: "INSPECCIÓN FORENSE",  title: "Diagnóstico perimetral",  desc: "Escaneo fotográfico 360° bajo luz forense." },
  { n: "02", label: "ESPUMA ACTIVA",       title: "Descontaminación",         desc: "Espuma activa y arcilla descontaminante." },
  { n: "03", label: "PULIDO ORBITAL DA",   title: "Corrección de pintura",    desc: "Pulidora orbital DA — cero swirl marks." },
  { n: "04", label: "SELLO CERÁMICO",      title: "Sellado cerámico",         desc: "Garantía custodia $5.000.000 COP activa." },
];

const RANGES = [
  [0.08, 0.14, 0.24, 0.30],
  [0.34, 0.40, 0.50, 0.56],
  [0.58, 0.63, 0.70, 0.75],
  [0.76, 0.81, 0.94, 0.94],
];

function ProcessStep({ step, index, scrollYProgress }) {
  const [fi, hs, he, fo] = RANGES[index];
  const isLast = index === STEPS.length - 1;
  const opacity = useTransform(
    scrollYProgress,
    isLast ? [fi, hs, 1] : [fi, hs, he, fo],
    isLast ? [0, 1, 1]   : [0, 1, 1,  0]
  );
  const y = useTransform(scrollYProgress, [fi, fi + 0.07], [20, 0]);

  return (
    <motion.div style={{ opacity, y }}
      className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center">

      {/* Pill — posición absoluta desde arriba */}
      <div className="absolute top-[20vh] inset-x-0 flex justify-center">
        <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full"
          style={{
            background: "rgba(0,0,0,0.70)",
            border: "2.5px solid rgba(184,134,11,0.85)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 2px 20px rgba(184,134,11,0.25)",
          }}>
          <span className="font-ui text-[13px] font-bold tracking-[0.35em] uppercase" style={{ color: "rgba(184,134,11,1)" }}>
            {step.n}
          </span>
          <span className="w-[2px] h-4" style={{ background: "rgba(184,134,11,0.7)" }} />
          <span className="font-ui text-[13px] font-bold tracking-[0.3em] uppercase" style={{ color: "rgba(255,255,255,0.95)" }}>
            {step.label}
          </span>
        </div>
      </div>

      {/* Título + desc — posición absoluta desde abajo, igual que el hero */}
      <div className="absolute top-[66vh] inset-x-0 flex flex-col items-center text-center px-6 gap-3">
        <h2 className="font-heading font-bold text-white"
          style={{ fontSize: "clamp(2.2rem, 7vw, 4.5rem)", lineHeight: 0.95, letterSpacing: "-0.02em", textShadow: "0 2px 60px rgba(0,0,0,0.9)" }}>
          {step.title}
        </h2>
        <div className="w-20 h-[3px] rounded-full" style={{ background: "rgba(184,134,11,0.85)" }} />
        <p className="font-body text-sm sm:text-base max-w-[280px] sm:max-w-sm leading-relaxed"
          style={{ color: "rgba(255,255,255,0.55)" }}>{step.desc}</p>
      </div>
    </motion.div>
  );
}

export default function CinematicProcess() {
  const containerRef      = useRef(null);
  const videoDesktopRef   = useRef(null);
  const rafRef            = useRef(null);
  const targetTime        = useRef(0);
  const unlockedRef       = useRef(false);
  const [videoReady, setVideoReady] = useState(false);

  const { scrollY } = useScroll();
  const scrollYProgress = useTransform(scrollY, (v) => {
    const el = containerRef.current;
    if (!el) return 0;
    const max = el.offsetHeight - window.innerHeight;
    return max > 0 ? Math.max(0, Math.min(1, (v - el.offsetTop) / max)) : 0;
  });

  const allVideos = () =>
    [videoDesktopRef.current].filter(Boolean);

  useEffect(() => {
    const unlock = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      allVideos().forEach(v => {
        v.play().then(() => { v.pause(); v.currentTime = 0; }).catch(() => {});
      });
    };
    window.addEventListener("touchstart",  unlock, { once: true, passive: true });
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    return () => {
      window.removeEventListener("touchstart",  unlock);
      window.removeEventListener("pointerdown", unlock);
    };
  }, []);

  useEffect(() => {
    const tick = () => {
      allVideos().forEach(v => {
        if (v.readyState >= 2) {
          const diff = targetTime.current - v.currentTime;
          if (Math.abs(diff) > 0.001) v.currentTime += diff * 0.8;
        }
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const v = videoDesktopRef.current || videoMobileRef.current;
    if (!v || !v.duration) return;
    targetTime.current = p * v.duration;
  });

  const heroOpacity    = useTransform(scrollYProgress, [0, 0.04, 0.07], [1, 1, 0]);
  const glowOpacity    = useTransform(scrollYProgress, [0.70, 0.94], [0, 0.7]);
  const badgeOpacity   = useTransform(scrollYProgress, [0.85, 0.94], [0, 1]);
  const hintOpacity    = useTransform(scrollYProgress, [0, 0.06], [1, 0]);

  const [activeStep, setActiveStep] = useState(-1);
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if      (p < RANGES[0][0]) setActiveStep(-1);
    else if (p < RANGES[1][0]) setActiveStep(0);
    else if (p < RANGES[2][0]) setActiveStep(1);
    else if (p < RANGES[3][0]) setActiveStep(2);
    else                        setActiveStep(3);
  });

  return (
    <div ref={containerRef} style={{ height: "520vh", position: "relative" }}>
      <div style={{ position: "sticky", top: 0, height: "100dvh", overflow: "hidden", background: "#040404" }}>

        {/* Grain */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
        />

        {/* ── VIDEO ── */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-full h-full">
            <video ref={videoDesktopRef}
              className="absolute inset-0 w-full h-full object-contain"
              style={{ objectPosition: "center center", filter: "brightness(1.25) contrast(1.05)" }}
              src="/process-hero.mp4" muted playsInline preload="auto"
              onLoadedData={() => setVideoReady(true)}
            />
            <img src="/process-dirty.webp" alt="" fetchPriority="high"
              className="absolute inset-0 w-full h-full object-contain transition-opacity duration-700"
              style={{ objectPosition: "center center", opacity: videoReady ? 0 : 1 }}
            />
          </div>
        </div>

        {/* Dark base suave — no tapa el carro */}
        <div className="absolute inset-0 z-[1] pointer-events-none" style={{ background: "rgba(0,0,0,0.08)" }} />

        {/* Gold glow */}
        <motion.div className="absolute inset-0 pointer-events-none z-[2]"
          style={{ opacity: glowOpacity, background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(212,160,23,0.14) 0%, transparent 65%)" }}
        />

        {/* Vignette lateral suave */}
        <div className="absolute inset-0 z-[2] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.28) 100%)" }} />
        {/* Gradiente superior para texto */}
        <div className="absolute top-0 inset-x-0 h-[20%] z-[2] pointer-events-none"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)" }} />
        {/* Gradiente inferior — solo el 15% más bajo donde va el texto */}
        <div className="absolute bottom-0 inset-x-0 h-[20%] z-[2] pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }} />

        {/* ── HERO ── */}
        <motion.div style={{ opacity: heroOpacity }}
          className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center">

          {/* Logo — arriba */}
          <div className="flex flex-col items-center mt-[15vh] sm:mt-[18vh] gap-4">
            <img src={BRAND.logo} alt="Esteticar"
              className="h-12 sm:h-16 md:h-20 object-contain"
            />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.4, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-2"
            >
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full"
                style={{
                  background: "rgba(0,0,0,0.55)",
                  border: "1px solid rgba(184,134,11,0.4)",
                  backdropFilter: "blur(10px)",
                }}>
                <motion.span
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4A017", flexShrink: 0, display: "block" }}
                />
                <span className="font-ui text-[10px] sm:text-[11px] tracking-[0.25em] uppercase font-semibold"
                  style={{ color: "rgba(255,255,255,0.85)" }}>
                  Desliza y descubre el protocolo
                </span>
              </div>
            </motion.div>
          </div>

          {/* Headline + CTA — misma posición que los pasos */}
          <div className="absolute top-[66vh] inset-x-0 flex flex-col items-center text-center px-6 gap-3 sm:gap-4">
            <h1 className="font-heading font-light leading-[0.92] tracking-[-0.03em] text-white"
              style={{ fontSize: "clamp(2rem, 7vw, 4.5rem)", textShadow: "0 2px 60px rgba(0,0,0,0.9)" }}>
              {BRAND.heroLines[0]}<br />{BRAND.heroLines[1]}
            </h1>
            <p className="font-ui text-[10px] sm:text-xs tracking-[0.5em] uppercase"
              style={{ color: "rgba(212,160,23,0.9)" }}>
              {BRAND.heroSub}
            </p>
            <div className="h-2" />
            <a href="#servicios"
              className="pointer-events-auto inline-flex items-center gap-3 px-7 sm:px-8 py-3.5 sm:py-4 rounded-full font-ui text-[10px] sm:text-[11px] tracking-[0.3em] uppercase font-bold text-white"
              style={{ background: "linear-gradient(135deg, #B8860B 0%, #D4A017 100%)", boxShadow: "0 4px 28px rgba(184,134,11,0.45), inset 0 1px 0 rgba(255,255,255,0.15)" }}>
              RESERVAR TRATAMIENTO
              <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/20 flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </a>
          </div>
        </motion.div>

        {/* ── Pasos del proceso ── */}
        {STEPS.map((step, i) => (
          <ProcessStep key={step.n} step={step} index={i} scrollYProgress={scrollYProgress} />
        ))}

        {/* ── Showroom badge ── */}
        <motion.div style={{ opacity: badgeOpacity }}
          className="absolute bottom-14 sm:bottom-16 inset-x-0 z-20 flex justify-center pointer-events-none">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full"
            style={{ background: "linear-gradient(135deg, rgba(184,134,11,0.95), rgba(212,160,23,0.95))", boxShadow: "0 4px 28px rgba(184,134,11,0.5)" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.9)", flexShrink: 0 }} />
            <span className="font-ui text-[10px] tracking-[0.4em] uppercase text-white font-bold">Acabado Showroom</span>
          </div>
        </motion.div>

        {/* ── Progress dots ── */}
        <div className="absolute bottom-8 inset-x-0 z-20 flex justify-center gap-2 pointer-events-none">
          {STEPS.map((_, i) => (
            <div key={i} className="rounded-full transition-all duration-500"
              style={{ width: activeStep === i ? 20 : 6, height: 6, background: activeStep === i ? "rgba(212,160,23,0.9)" : "rgba(255,255,255,0.2)" }} />
          ))}
        </div>

        {/* ── Scroll hint: flechas derecha ── */}
        <motion.div style={{ opacity: hintOpacity }}
          className="absolute right-4 bottom-1/2 translate-y-1/2 z-20 flex flex-col items-center gap-0">
          {[0, 1, 2].map((i) => (
            <motion.svg key={i} width="20" height="12" viewBox="0 0 20 12" fill="none"
              animate={{ opacity: [0.15, 0.9, 0.15] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}>
              <path d="M1 1L10 10L19 1" stroke="rgba(184,134,11,0.85)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </motion.svg>
          ))}
        </motion.div>

      </div>
    </div>
  );
}
