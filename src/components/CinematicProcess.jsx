import React, { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import { BRAND } from "../lib/constants";

const STEPS = [
  { n: "01", title: "Diagnóstico perimetral",  desc: "Escaneo fotográfico 360° bajo luz forense." },
  { n: "02", title: "Descontaminación",         desc: "Espuma activa y arcilla descontaminante." },
  { n: "03", title: "Corrección de pintura",    desc: "Pulidora orbital DA — cero swirl marks." },
  { n: "04", title: "Sellado cerámico",         desc: "Garantía custodia $5.000.000 COP activa." },
];

// [fadeIn, holdStart, holdEnd, fadeOut]
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
  const y = useTransform(scrollYProgress, [fi, fi + 0.07], [28, 0]);

  return (
    <motion.div
      style={{ opacity, y }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center px-8 sm:px-16 text-center pointer-events-none"
    >
      {/* Step pill */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
        style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(184,134,11,0.3)", backdropFilter: "blur(10px)" }}>
        <span className="font-ui text-[10px] tracking-[0.4em] uppercase" style={{ color: "rgba(184,134,11,0.9)" }}>
          {step.n}
        </span>
        <span className="w-px h-3" style={{ background: "rgba(184,134,11,0.3)" }} />
        <span className="font-ui text-[10px] tracking-[0.3em] uppercase" style={{ color: "rgba(255,255,255,0.45)" }}>
          El Proceso
        </span>
      </div>

      {/* Big title */}
      <h2
        className="font-heading font-light text-white mb-4"
        style={{
          fontSize: "clamp(2.6rem, 8vw, 5.5rem)",
          lineHeight: 0.95,
          letterSpacing: "-0.03em",
          textShadow: "0 2px 60px rgba(0,0,0,0.9)",
        }}
      >
        {step.title}
      </h2>

      {/* Divider */}
      <div className="w-8 h-px mb-4" style={{ background: "rgba(184,134,11,0.6)" }} />

      {/* Description */}
      <p className="font-body text-sm sm:text-base max-w-[280px] sm:max-w-sm leading-relaxed"
        style={{ color: "rgba(255,255,255,0.5)" }}>
        {step.desc}
      </p>
    </motion.div>
  );
}

export default function CinematicProcess() {
  const containerRef = useRef(null);
  const videoRef     = useRef(null);
  const rafRef       = useRef(null);
  const targetTime   = useRef(0);
  const unlockedRef  = useRef(false);
  const [videoReady, setVideoReady] = useState(false);

  const { scrollY } = useScroll();
  const scrollYProgress = useTransform(scrollY, (v) => {
    const el = containerRef.current;
    if (!el) return 0;
    const max = el.offsetHeight - window.innerHeight;
    return max > 0 ? Math.max(0, Math.min(1, (v - el.offsetTop) / max)) : 0;
  });

  // Unlock video on first gesture — critical for iOS/Android
  useEffect(() => {
    const unlock = () => {
      if (unlockedRef.current) return;
      const video = videoRef.current;
      if (!video) return;
      unlockedRef.current = true;
      video.play().then(() => { video.pause(); video.currentTime = 0; }).catch(() => {});
    };
    unlock();
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    return () => {
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("pointerdown", unlock);
    };
  }, []);

  // rAF lerp scrub
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tick = () => {
      if (video.readyState >= 2) {
        const diff = targetTime.current - video.currentTime;
        if (Math.abs(diff) > 0.001) video.currentTime += diff * 0.3;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    targetTime.current = p * video.duration;
  });

  // Hero fades out as user starts scrolling
  const heroOpacity = useTransform(scrollYProgress, [0, 0.04, 0.07], [1, 1, 0]);

  // Progress dots — which step is active
  const [activeStep, setActiveStep] = useState(-1);
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (p < RANGES[0][0]) setActiveStep(-1);
    else if (p < RANGES[1][0]) setActiveStep(0);
    else if (p < RANGES[2][0]) setActiveStep(1);
    else if (p < RANGES[3][0]) setActiveStep(2);
    else setActiveStep(3);
  });

  const hintOpacity = useTransform(scrollYProgress, [0, 0.06], [1, 0]);
  const glowOpacity = useTransform(scrollYProgress, [0.70, 0.94], [0, 0.75]);
  const badgeOpacity = useTransform(scrollYProgress, [0.85, 0.94], [0, 1]);

  return (
    <div ref={containerRef} style={{ height: "520vh", position: "relative" }}>
      <div style={{ position: "sticky", top: 0, height: "100dvh", overflow: "hidden", background: "#040404" }}>

        {/* Grain */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
        />

        {/* Video */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover object-center"
          src="/process-hero.mp4"
          muted
          playsInline
          preload="auto"
          onLoadedData={() => setVideoReady(true)}
        />

        {/* Fallback */}
        <img
          src="/process-dirty.webp"
          alt="Esteticar"
          fetchpriority="high"
          className="absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700"
          style={{ opacity: videoReady ? 0 : 1, filter: "saturate(0.5) brightness(0.6)" }}
        />

        {/* Dark base */}
        <div className="absolute inset-0 z-[1] pointer-events-none" style={{ background: "rgba(0,0,0,0.4)" }} />

        {/* Gold glow */}
        <motion.div className="absolute inset-0 pointer-events-none z-[2]"
          style={{ opacity: glowOpacity, background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(212,160,23,0.14) 0%, transparent 65%)" }}
        />

        {/* Vignette */}
        <div className="absolute inset-0 z-[2] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, transparent 28%, rgba(0,0,0,0.7) 100%)" }} />
        <div className="absolute top-0 inset-x-0 h-[30%] z-[2] pointer-events-none"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.80), transparent)" }} />
        <div className="absolute bottom-0 inset-x-0 h-[45%] z-[2] pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.90), transparent)" }} />

        {/* ── Hero — distribuido verticalmente ── */}
        <motion.div style={{ opacity: heroOpacity }}
          className="absolute inset-0 z-20 pointer-events-none flex flex-col">

          {/* Logo — arriba centrado */}
          <div className="flex justify-center pt-[18vh] sm:pt-[20vh]">
            <motion.img src={BRAND.logo} alt="Esteticar"
              initial={{ opacity: 0, scale: 0.92, filter: "blur(12px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
              className="h-12 sm:h-16 md:h-20 object-contain"
              style={{ filter: "drop-shadow(0 0 40px rgba(248,200,64,0.35))" }}
            />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Headline + CTA — abajo */}
          <div className="flex flex-col items-center text-center px-6 pb-[14vh] sm:pb-[16vh] gap-4">
            <h1
              className="font-heading font-light leading-[0.92] tracking-[-0.03em] text-white"
              style={{
                fontSize: "clamp(2.4rem, 8vw, 5rem)",
                textShadow: "0 2px 60px rgba(0,0,0,0.9)",
              }}
            >
              {BRAND.heroLines[0]}<br />{BRAND.heroLines[1]}
            </h1>
            <p className="font-ui text-[10px] sm:text-xs tracking-[0.5em] uppercase"
              style={{ color: "rgba(212,160,23,0.9)" }}>
              {BRAND.heroSub}
            </p>
            <div className="h-3" />
            <a href="#servicios"
              className="pointer-events-auto inline-flex items-center gap-3 px-8 py-4 rounded-full font-ui text-[11px] tracking-[0.3em] uppercase font-bold text-white"
              style={{ background: "linear-gradient(135deg, #B8860B 0%, #D4A017 100%)", boxShadow: "0 4px 28px rgba(184,134,11,0.45), inset 0 1px 0 rgba(255,255,255,0.15)" }}>
              RESERVAR TRATAMIENTO
              <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
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
          className="absolute bottom-20 sm:bottom-24 inset-x-0 z-20 flex justify-center pointer-events-none">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full"
            style={{ background: "linear-gradient(135deg, rgba(184,134,11,0.95), rgba(212,160,23,0.95))", boxShadow: "0 4px 28px rgba(184,134,11,0.5)" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.9)", flexShrink: 0 }} />
            <span className="font-ui text-[10px] tracking-[0.4em] uppercase text-white font-bold">Acabado Showroom</span>
          </div>
        </motion.div>

        {/* ── Progress dots ── */}
        <div className="absolute bottom-8 inset-x-0 z-20 flex justify-center gap-2 pointer-events-none">
          {STEPS.map((_, i) => (
            <div key={i}
              className="rounded-full transition-all duration-500"
              style={{
                width: activeStep === i ? 20 : 6,
                height: 6,
                background: activeStep === i ? "rgba(212,160,23,0.9)" : "rgba(255,255,255,0.2)",
              }}
            />
          ))}
        </div>

        {/* ── Scroll hint ── */}
        <motion.div style={{ opacity: hintOpacity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
          <span className="font-ui text-[8px] tracking-[0.5em] uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>
            Desliza
          </span>
          <motion.div animate={{ y: [0, 7, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: 1, height: 24, background: "linear-gradient(to bottom, rgba(184,134,11,0.7), transparent)" }}
          />
        </motion.div>

      </div>
    </div>
  );
}
