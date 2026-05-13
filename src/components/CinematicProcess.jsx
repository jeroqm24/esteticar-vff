import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

// ─── Variance Engine: Ethereal Luxury × Z-Axis Cascade ───────────────────────
// Fondo: negro profundo #0A0A0A con velo dorado ambiental
// Layout: narrativa vertical de 3 actos con scroll reveals escalonados
// Typography: Playfair Display editorial + Plus Jakarta Sans UI
// Motion: spring custom [0.32, 0.72, 0, 1] + parallax suave en imágenes
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    n: "01",
    title: "Diagnóstico Perimetral",
    body: "Escaneo fotográfico 360° e inspección milimétrica bajo luz forense para catalogar cada imperfección antes de tocar la superficie.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><circle cx="11" cy="11" r="3"/>
      </svg>
    ),
  },
  {
    n: "02",
    title: "Descontaminación Profunda",
    body: "Espuma activa, arcilla descontaminante y remoción química de partículas férreas. La pintura queda libre de todo agente abrasivo.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>
      </svg>
    ),
  },
  {
    n: "03",
    title: "Corrección de Pintura",
    body: "Pulidora orbital de doble acción con compounds y pulimentos de precisión. Eliminación de swirl marks, rayones finos y manchas de oxidación.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
      </svg>
    ),
  },
  {
    n: "04",
    title: "Sellado & Custodia",
    body: "Aplicación de sellante cerámico con protección UV. Tu vehículo sale con garantía de custodia activa de $5.000.000 COP.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
];

function ParallaxImage({ src, alt, scale = [1, 1.08], brightness = "brightness-100" }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["4%", "-4%"]);

  return (
    <div ref={ref} className="relative w-full h-full overflow-hidden">
      <motion.img
        src={src} alt={alt}
        style={{ y }}
        className={`w-full h-full object-cover ${brightness}`}
      />
    </div>
  );
}

export default function CinematicProcess() {
  return (
    <section className="relative py-32 sm:py-44 px-5 sm:px-8 overflow-hidden"
      style={{ background: "#0A0A0A" }}
    >
      {/* ── Ambient texture ── */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 90% 60% at 50% 0%, rgba(184,134,11,0.07) 0%, transparent 65%)" }}
      />
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
      />
      <div className="absolute top-0 inset-x-0 h-px"
        style={{ background: "linear-gradient(90deg,transparent,rgba(184,134,11,0.25),transparent)" }}
      />
      <div className="absolute bottom-0 inset-x-0 h-px"
        style={{ background: "linear-gradient(90deg,transparent,rgba(184,134,11,0.15),transparent)" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.32, 0.72, 0, 1] }}
          className="mb-24 sm:mb-32"
        >
          <span className="font-ui text-[9px] tracking-[0.7em] uppercase block mb-5"
            style={{ color: "rgba(184,134,11,0.7)" }}>
            — El Proceso —
          </span>
          <h2 className="font-heading text-4xl sm:text-5xl md:text-6xl font-light leading-tight"
            style={{ color: "#F5F0E8" }}>
            Así nace<br />
            <span className="italic" style={{
              background: "linear-gradient(135deg, #B8860B 0%, #D4A017 45%, #F8C840 70%, #B8860B 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>
              la perfección.
            </span>
          </h2>
          <p className="font-body text-sm mt-7 max-w-sm leading-relaxed font-light"
            style={{ color: "rgba(255,255,255,0.3)" }}>
            Cada vehículo pasa por un protocolo de 4 fases. No improvisamos — ejecutamos con precisión quirúrgica.
          </p>
        </motion.div>

        {/* ══════════════════════════════════════════
            ACTO I — LA LLEGADA (before)
        ══════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 1.1, ease: [0.32, 0.72, 0, 1] }}
          className="mb-16 sm:mb-20"
        >
          <div className="flex items-center gap-4 mb-6">
            <span className="font-ui text-[8px] tracking-[0.6em] uppercase" style={{ color: "rgba(184,134,11,0.5)" }}>Acto I</span>
            <div className="flex-1 h-px" style={{ background: "rgba(184,134,11,0.12)" }} />
            <span className="font-ui text-[8px] tracking-[0.4em] uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>La llegada</span>
          </div>

          {/* Double-bezel outer */}
          <div className="p-[6px] rounded-[1.75rem]"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {/* Inner */}
            <div className="relative rounded-[calc(1.75rem-6px)] overflow-hidden aspect-[16/7] sm:aspect-[16/6]"
              style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
            >
              <ParallaxImage src="/antes-1.jpg" alt="BMW X7 antes del tratamiento" brightness="brightness-[0.55] saturate-[0.4] contrast-[1.1]" />
              {/* Dark vignette */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.65) 100%)" }}
              />
              {/* Bottom gradient to black */}
              <div className="absolute bottom-0 inset-x-0 h-2/5 pointer-events-none"
                style={{ background: "linear-gradient(to top, rgba(10,10,10,0.9), transparent)" }}
              />
              {/* Label */}
              <div className="absolute bottom-6 left-7 sm:bottom-8 sm:left-10">
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full"
                  style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400/80" />
                  <span className="font-ui text-[9px] tracking-[0.4em] uppercase" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Estado inicial — sin tratamiento
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════
            ACTO II — EL PROTOCOLO (4 pasos)
        ══════════════════════════════════════════ */}
        <div className="mb-16 sm:mb-20">
          <div className="flex items-center gap-4 mb-10">
            <span className="font-ui text-[8px] tracking-[0.6em] uppercase" style={{ color: "rgba(184,134,11,0.5)" }}>Acto II</span>
            <div className="flex-1 h-px" style={{ background: "rgba(184,134,11,0.12)" }} />
            <span className="font-ui text-[8px] tracking-[0.4em] uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>El protocolo</span>
          </div>

          {/* Asymmetric bento: 2 cols desktop, 1 col mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-5%" }}
                transition={{ duration: 0.85, delay: i * 0.1, ease: [0.32, 0.72, 0, 1] }}
              >
                {/* Outer bezel */}
                <div className="p-[5px] rounded-[1.5rem] h-full group transition-all duration-700"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  {/* Inner core */}
                  <div className="rounded-[calc(1.5rem-5px)] p-7 sm:p-8 h-full transition-all duration-700"
                    style={{
                      background: "rgba(255,255,255,0.025)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                    }}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between mb-6">
                      <span className="font-ui text-[11px] font-bold tabular-nums"
                        style={{ color: "rgba(184,134,11,0.4)", letterSpacing: "0.1em" }}>
                        {step.n}
                      </span>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(184,134,11,0.08)", border: "1px solid rgba(184,134,11,0.18)", color: "#B8860B" }}
                      >
                        {step.icon}
                      </div>
                    </div>
                    {/* Text */}
                    <h3 className="font-heading text-xl sm:text-2xl font-light mb-3 leading-snug"
                      style={{ color: "#F0EBE0" }}>
                      {step.title}
                    </h3>
                    <p className="font-body text-[13px] leading-relaxed font-light"
                      style={{ color: "rgba(255,255,255,0.35)" }}>
                      {step.body}
                    </p>
                    {/* Gold bottom line */}
                    <div className="mt-6 h-px w-0 group-hover:w-full transition-all duration-[900ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
                      style={{ background: "linear-gradient(90deg, rgba(184,134,11,0.5), rgba(212,160,23,0.2))" }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════
            ACTO III — LA REVELACIÓN (after)
        ══════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 1.2, ease: [0.32, 0.72, 0, 1] }}
        >
          <div className="flex items-center gap-4 mb-6">
            <span className="font-ui text-[8px] tracking-[0.6em] uppercase" style={{ color: "rgba(184,134,11,0.5)" }}>Acto III</span>
            <div className="flex-1 h-px" style={{ background: "rgba(184,134,11,0.12)" }} />
            <span className="font-ui text-[8px] tracking-[0.4em] uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>La revelación</span>
          </div>

          {/* Double-bezel gold */}
          <div className="p-[6px] rounded-[1.75rem]"
            style={{ background: "rgba(184,134,11,0.05)", border: "1px solid rgba(184,134,11,0.2)" }}
          >
            <div className="relative rounded-[calc(1.75rem-6px)] overflow-hidden aspect-[16/7] sm:aspect-[16/6]"
              style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 0 80px rgba(184,134,11,0.12)" }}
            >
              <ParallaxImage src="/despues-1.jpg" alt="BMW X7 después del tratamiento" brightness="brightness-[1.05] saturate-[1.25] contrast-[1.05]" />
              {/* Gold radial glow over image */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse 70% 80% at 60% 50%, rgba(212,160,23,0.06) 0%, transparent 65%)" }}
              />
              {/* Vignette */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.45) 100%)" }}
              />
              {/* Top gradient from black */}
              <div className="absolute top-0 inset-x-0 h-1/4 pointer-events-none"
                style={{ background: "linear-gradient(to bottom, rgba(10,10,10,0.55), transparent)" }}
              />

              {/* Label */}
              <div className="absolute bottom-6 right-7 sm:bottom-8 sm:right-10">
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full"
                  style={{
                    background: "linear-gradient(135deg, rgba(184,134,11,0.85), rgba(212,160,23,0.85))",
                    boxShadow: "0 4px 24px rgba(184,134,11,0.35)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
                  <span className="font-ui text-[9px] tracking-[0.4em] uppercase text-white font-bold">
                    Resultado final
                  </span>
                </div>
              </div>

              {/* Centered overlay text */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.4, ease: [0.32, 0.72, 0, 1] }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none"
              >
                <p className="font-ui text-[9px] tracking-[0.7em] uppercase mb-3"
                  style={{ color: "rgba(212,160,23,0.8)" }}>
                  BMW X7 — Tratamiento 3 en 1
                </p>
                <h3 className="font-heading text-3xl sm:text-4xl md:text-5xl font-light"
                  style={{ color: "#FFFFFF", textShadow: "0 2px 40px rgba(0,0,0,0.6)" }}>
                  De opaco a<br />
                  <span className="italic" style={{
                    background: "linear-gradient(135deg, #D4A017, #F8C840, #D4A017)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                  }}>showroom.</span>
                </h3>
              </motion.div>
            </div>
          </div>

          {/* Bottom stat strip */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="mt-6 grid grid-cols-3 gap-3"
          >
            {[
              { value: "4 fases", label: "Protocolo" },
              { value: "100%", label: "Satisfacción" },
              { value: "$5M COP", label: "Garantía activa" },
            ].map((stat) => (
              <div key={stat.label} className="p-[5px] rounded-[1.25rem]"
                style={{ background: "rgba(184,134,11,0.05)", border: "1px solid rgba(184,134,11,0.12)" }}
              >
                <div className="rounded-[calc(1.25rem-5px)] py-5 text-center"
                  style={{ background: "rgba(0,0,0,0.3)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" }}
                >
                  <p className="font-heading text-xl sm:text-2xl font-light mb-1"
                    style={{ color: "#D4A017" }}>
                    {stat.value}
                  </p>
                  <p className="font-ui text-[8px] tracking-[0.4em] uppercase"
                    style={{ color: "rgba(255,255,255,0.3)" }}>
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
}
