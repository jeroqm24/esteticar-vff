import React, { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import { BRAND } from "../lib/constants";

const STEPS = [
  { n: "01", title: "Diagnóstico\nperimetral",   desc: "Escaneo fotográfico 360° bajo luz forense." },
  { n: "02", title: "Descontam-\ninación",        desc: "Espuma activa y arcilla descontaminante." },
  { n: "03", title: "Corrección\nde pintura",     desc: "Pulidora orbital DA — cero swirl marks." },
  { n: "04", title: "Sellado\ncerámico",          desc: "Garantía de custodia $5.000.000 COP activa." },
];

// Each step: [fadeIn, hold, fadeOut]
const STEP_RANGES = [
  [0.05, 0.22, 0.30],
  [0.32, 0.48, 0.56],
  [0.56, 0.66, 0.72],
  [0.72, 0.84, 0.92],
];

function StepOverlay({ step, scrollYProgress, fadeIn, hold, fadeOut, isLast }) {
  const opacity = useTransform(
    scrollYProgress,
    isLast ? [fadeIn, hold, 1] : [fadeIn, hold, fadeOut, fadeOut + 0.06],
    isLast ? [0, 1, 1]          : [0, 1, 1, 0]
  );
  const y = useTransform(scrollYProgress, [fadeIn, fadeIn + 0.08], [32, 0]);

  return (
    <motion.div
      style={{ opacity, y }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center pointer-events-none"
    >
      {/* Step number */}
      <span className="font-ui text-[11px] sm:text-xs tracking-[0.5em] uppercase mb-4 block"
        style={{ color: "rgba(184,134,11,0.75)" }}>
        {step.n} — El Proceso
      </span>

      {/* Big title — same scale as hero headline */}
      <h2
        className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-light leading-[0.9] tracking-[-0.03em] text-white mb-6"
        style={{ textShadow: "0 2px 60px rgba(0,0,0,0.8)", whiteSpace: "pre-line" }}
      >
        {step.title}
      </h2>

      {/* Description */}
      <p className="font-body text-sm sm:text-base max-w-xs sm:max-w-sm leading-relaxed"
        style={{ color: "rgba(255,255,255,0.55)" }}>
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

  // Unlock video on first user gesture (required by iOS/Android)
  useEffect(() => {
    const unlock = () => {
      if (unlockedRef.current) return;
      const video = videoRef.current;
      if (!video) return;
      unlockedRef.current = true;
      video.play().then(() => {
        video.pause();
        video.currentTime = 0;
      }).catch(() => {});
    };
    // Try immediately (works on desktop), also on first touch/scroll (mobile)
    unlock();
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
    window.addEventListener("scroll",     unlock, { once: true, passive: true });
    return () => {
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("scroll",     unlock);
    };
  }, []);

  // rAF lerp scrub
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tick = () => {
      if (video.readyState >= 2 && unlockedRef.current) {
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

  // Hero content fades out early
  const heroOpacity       = useTransform(scrollYProgress, [0, 0.03, 0.06], [0, 1, 1]);
  const heroFadeOut       = useTransform(scrollYProgress, [0, 0.03, 0.15, 0.25], [0, 1, 1, 0]);
  const afterLabelOpacity = useTransform(scrollYProgress, [0.84, 0.93], [0, 1]);
  const hintOpacity       = useTransform(scrollYProgress, [0, 0.06], [1, 0]);
  const glowOpacity       = useTransform(scrollYProgress, [0.68, 0.92], [0, 0.7]);

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
          className="absolute inset-0 w-full h-full object-cover"
          src="/process-hero.mp4"
          muted
          playsInline
          preload="auto"
          onLoadedData={() => setVideoReady(true)}
        />

        {/* Fallback imagen */}
        <img
          src="/process-dirty.webp"
          alt="Esteticar"
          fetchpriority="high"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: videoReady ? 0 : 1, filter: "saturate(0.5) brightness(0.6)" }}
        />

        {/* Dark overlay */}
        <div className="absolute inset-0 z-[1] pointer-events-none" style={{ background: "rgba(0,0,0,0.45)" }} />

        {/* Gold glow */}
        <motion.div className="absolute inset-0 pointer-events-none z-[2]"
          style={{ opacity: glowOpacity, background: "radial-gradient(ellipse 70% 65% at 55% 52%, rgba(212,160,23,0.16) 0%, transparent 62%)" }}
        />

        {/* Vignette */}
        <div className="absolute inset-0 z-[2] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.65) 100%)" }} />
        <div className="absolute top-0 inset-x-0 h-1/3 z-[2] pointer-events-none"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.80), transparent)" }} />
        <div className="absolute bottom-0 inset-x-0 h-1/2 z-[2] pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.90), transparent)" }} />

        {/* ── Hero overlay ── */}
        <motion.div style={{ opacity: heroFadeOut }}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center pointer-events-none pb-16">
          <motion.img src={BRAND.logo} alt="Esteticar"
            initial={{ opacity: 0, scale: 0.92, filter: "blur(12px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
            className="h-14 sm:h-[4.5rem] md:h-20 object-contain mb-6"
            style={{ filter: "drop-shadow(0 0 40px rgba(248,200,64,0.35))" }}
          />
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light leading-[0.92] tracking-[-0.03em] text-white mb-5"
            style={{ textShadow: "0 2px 60px rgba(0,0,0,0.9)" }}>
            {BRAND.heroLines[0]}<br />{BRAND.heroLines[1]}
          </h1>
          <p className="font-ui text-[10px] sm:text-xs tracking-[0.5em] uppercase mb-8"
            style={{ color: "rgba(212,160,23,0.9)" }}>
            {BRAND.heroSub}
          </p>
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
        </motion.div>

        {/* ── Pasos grandes — uno a la vez ── */}
        {STEPS.map((step, i) => (
          <StepOverlay
            key={step.n}
            step={step}
            scrollYProgress={scrollYProgress}
            fadeIn={STEP_RANGES[i][0]}
            hold={STEP_RANGES[i][1]}
            fadeOut={STEP_RANGES[i][2]}
            isLast={i === STEPS.length - 1}
          />
        ))}

        {/* ── Showroom badge (final) ── */}
        <motion.div style={{ opacity: afterLabelOpacity }}
          className="absolute top-1/2 right-5 sm:right-10 -translate-y-[120%] z-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ background: "linear-gradient(135deg, rgba(184,134,11,0.95), rgba(212,160,23,0.95))", boxShadow: "0 4px 28px rgba(184,134,11,0.5)", backdropFilter: "blur(8px)" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.9)", flexShrink: 0 }} />
            <span className="font-ui text-[9px] tracking-[0.4em] uppercase text-white font-bold">Showroom</span>
          </div>
        </motion.div>

        {/* ── Scroll hint ── */}
        <motion.div style={{ opacity: hintOpacity }}
          className="absolute bottom-7 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
          <span className="font-ui text-[8px] tracking-[0.5em] uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>
            Desliza
          </span>
          <motion.div animate={{ y: [0, 7, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: 1, height: 26, background: "linear-gradient(to bottom, rgba(184,134,11,0.7), transparent)" }}
          />
        </motion.div>

      </div>
    </div>
  );
}
