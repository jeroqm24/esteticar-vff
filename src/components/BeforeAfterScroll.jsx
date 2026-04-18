import React, { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { TRANSFORMATIONS } from "../lib/constants";

function RevealCard({ item, index }) {
  const [sliderX, setSliderX] = useState(60);
  const [isDragging, setIsDragging] = useState(false);
  const [autoRevealed, setAutoRevealed] = useState(false);
  const [showProcess, setShowProcess] = useState(false);
  const cardRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start 85%", "center center"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.6], [0, 1]);
  const y = useTransform(scrollYProgress, [0, 0.6], [80, 0]);

  const interacted = useRef(false);

  useEffect(() => {
    let frame;
    let start = null;

    const animate = (ts) => {
      if (interacted.current) return;
      if (!start) start = ts;
      
      const time = (ts - start) / 1000;
      // Oscilación suave entre 40% y 60%
      setSliderX(50 + Math.sin(time * 2.5) * 10);
      frame = requestAnimationFrame(animate);
    };

    if (!isDragging && !interacted.current) {
      frame = requestAnimationFrame(animate);
    }

    return () => {
      if (frame) cancelAnimationFrame(frame);
    };
  }, [isDragging]);

  const handlePointer = (e) => {
    if (!isDragging) return;
    interacted.current = true; // Desactiva la animación una vez que toquen
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const pos = ((x - rect.left) / rect.width) * 100;
    setSliderX(Math.max(2, Math.min(98, pos)));
  };

  return (
    <motion.div ref={cardRef} style={{ opacity, y }} className="relative w-full">
      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-12 items-center ${index % 2 === 1 ? "lg:flex-row-reverse" : ""}`}>
        <div className={`lg:col-span-8 ${index % 2 === 1 ? "lg:order-2" : ""}`}>
          <div
            className="relative overflow-hidden aspect-[16/9] touch-none border border-black/[0.08] cursor-ew-resize select-none rounded-sm shadow-[0_8px_40px_rgba(0,0,0,0.1)]"
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onMouseMove={handlePointer}
            onTouchMove={handlePointer}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
          >
            <img src={item.after} alt="Resultado" className="absolute inset-0 w-full h-full object-cover saturate-[1.15] brightness-[1.05]" />
            <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ width: `${sliderX}%` }}>
              <img src={item.before} alt="Antes" className="absolute top-0 left-0 h-full max-w-none object-cover brightness-[0.7] contrast-[0.95]" style={{ width: `${100 / (sliderX / 100)}%` }} />
            </div>
            <div className="absolute top-0 bottom-0 z-10 w-px bg-ec-gold/80" style={{ left: `${sliderX}%` }}>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur-md border border-ec-gold flex items-center justify-center rounded-full shadow-lg">
                <div className="flex gap-1 items-center">
                  <div className="w-0 h-0 border-y-[4px] border-y-transparent border-r-[5px] border-r-ec-gold" />
                  <div className="w-0 h-0 border-y-[4px] border-y-transparent border-l-[5px] border-l-ec-gold" />
                </div>
              </div>
            </div>
            <div className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-white/80 backdrop-blur-sm border border-black/10 rounded-sm">
              <span className="font-ui text-[9px] tracking-[0.4em] text-ec-text-secondary uppercase">Antes</span>
            </div>
            <div className="absolute bottom-4 right-4 z-10 px-3 py-1.5 bg-ec-gold/90 backdrop-blur-sm rounded-sm">
              <span className="font-ui text-[9px] tracking-[0.4em] text-white uppercase font-bold">Después</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="space-y-3">
            <span className="font-ui text-[10px] tracking-[0.5em] text-ec-gold uppercase">{item.tag}</span>
            <h3 className="font-body font-semibold text-2xl sm:text-3xl text-ec-dark leading-tight">{item.label}</h3>
            <p className="font-body text-sm text-ec-text-secondary/70 leading-relaxed font-light">{item.desc}</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="px-6 py-4 bg-ec-gold/[0.06] border border-ec-gold/15 rounded-sm">
              <span className="font-ui text-[9px] tracking-[0.3em] text-ec-gold block uppercase">Inversión</span>
              <span className="font-body font-bold text-xl text-ec-gold mt-1 block">{item.price}</span>
            </div>
            <button 
              onClick={() => setShowProcess(!showProcess)}
              className={`flex-1 py-5 border font-ui text-[10px] tracking-[0.3em] uppercase transition-all duration-500 rounded-sm ${
                showProcess 
                  ? "bg-ec-gold text-white border-ec-gold shadow-[0_4px_20px_rgba(184,134,11,0.2)]" 
                  : "border-black/[0.08] text-ec-text-muted hover:bg-ec-gold hover:text-white hover:border-ec-gold"
              }`}
            >
              {showProcess ? "Ocultar" : "Ver Proceso"}
            </button>
          </div>

          {/* Process Steps Reveal */}
          <AnimatePresence>
            {showProcess && item.process && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="p-6 bg-white border border-black/[0.06] rounded-sm shadow-[0_4px_20px_rgba(0,0,0,0.04)] space-y-0">
                  <span className="font-ui text-[9px] tracking-[0.5em] text-ec-gold uppercase block mb-5">
                    PROTOCOLO DE TRATAMIENTO
                  </span>
                  {item.process.map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.12, duration: 0.5, ease: "circOut" }}
                      className="flex gap-4 items-start py-3 border-b border-black/[0.04] last:border-b-0"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-7 h-7 bg-ec-gold/10 border border-ec-gold/20 rounded-full flex items-center justify-center">
                          <span className="font-ui text-[10px] font-bold text-ec-gold">{i + 1}</span>
                        </div>
                        {i < item.process.length - 1 && (
                          <div className="absolute top-7 left-1/2 -translate-x-1/2 w-px h-5 bg-ec-gold/10" />
                        )}
                      </div>
                      <p className="font-body text-[13px] text-ec-text-secondary leading-relaxed pt-1">
                        {step}
                      </p>
                    </motion.div>
                  ))}
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
    <section id="transformacion" className="relative py-24 sm:py-32 px-6 overflow-hidden bg-ec-white">
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="section-label justify-center mb-6">LA TRANSFORMACIÓN</span>
            <h2 className="font-heading text-4xl sm:text-5xl md:text-7xl lg:text-8xl text-ec-dark font-light mt-6 italic gold-gradient-text">
              Ver para Creer
            </h2>
            <p className="font-body text-sm text-ec-text-muted mt-8 max-w-xl mx-auto leading-relaxed font-light">
              Desliza para descubrir la diferencia que el detalle artesanal hace en cada superficie de tu vehículo.
            </p>
          </motion.div>
        </div>
        <div className="space-y-24 sm:space-y-32">
          {TRANSFORMATIONS.map((item, i) => <RevealCard key={i} item={item} index={i} />)}
        </div>
      </div>
    </section>
  );
}
