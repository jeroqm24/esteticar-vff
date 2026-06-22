import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { BRAND } from "../lib/constants";
import { pixelContact } from "../lib/pixel";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const DEFAULT_URL = "https://heyzine.com/flip-book/7591b1d346.html#page/1";
const DEFAULT_SERVICES = [
  "Recubrimiento Cerámico",
  "Porcelanizado",
  "Tratamiento 3 en 1 a Máquina",
  "Tratamiento 3 en 1 Manual",
  "Mantenimiento Interior Sólo Cojinería",
  "Mantenimiento Interior Levantamiento del Alfombrado",
  "Lavado de Cojinería",
  "Restauración de Farolas",
  "Brillado a Máquina",
  "Descontaminación de Vidrios",
  "Lavada Esencial",
];

export default function PortfolioSection() {
  const [portfolioUrl, setPortfolioUrl] = useState(DEFAULT_URL);
  const [services, setServices] = useState(DEFAULT_SERVICES);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data } = await supabase
          .from("bot_config")
          .select("value")
          .eq("key", "default")
          .single();
        if (!data) return;
        const cfg = JSON.parse(data.value || "{}");
        if (cfg.portfolio_url) setPortfolioUrl(cfg.portfolio_url);
        if (cfg.portfolio_services?.length > 0) {
          const names = cfg.portfolio_services.map(s => typeof s === 'string' ? s : s.name).filter(Boolean);
          if (names.length > 0) setServices(names);
        }
      } catch { }
    };
    loadConfig();
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => setVisible(e.isIntersecting),
      { threshold: 0.1 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  const handleContact = () => {
    if (!selected) return;
    const msg = encodeURIComponent(
      `Hola Esteticar, estaba viendo el portafolio en la pagina y me interesa el servicio de ${selected}. Me pueden dar mas informacion?`
    );
    pixelContact();
    window.open(`${BRAND.whatsappUrl}?text=${msg}`, "_blank");
    setOpen(false);
    setSelected("");
  };

  return (
    <section ref={sectionRef} id="portafolio" className="overflow-hidden">

      {/* Parte oscura: header + flipbook */}
      <div className="relative bg-[#0A0A0A] pt-8 pb-0">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-10"
            style={{ background: "radial-gradient(ellipse, #B8860B 0%, transparent 70%)" }} />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
            className="text-center mb-12"
          >
            <span className="inline-block font-ui text-[10px] tracking-[0.4em] text-ec-gold uppercase mb-4 px-4 py-1.5 rounded-full border border-ec-gold/20 bg-ec-gold/5">
              Portafolio
            </span>
            <h2 className="font-heading text-4xl sm:text-5xl font-light text-white leading-tight">
              Cada vehículo,<br />
              <span className="text-ec-gold">una transformación.</span>
            </h2>
            <p className="font-body text-white/40 text-sm mt-4 max-w-md mx-auto">
              Hojea nuestros trabajos. Cuando veas algo que quieras para tu vehículo, cuéntanos.
            </p>
          </motion.div>

          {/* Flipbook — double bezel */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
            className="relative"
          >
            <div className="p-1.5 rounded-[1.25rem] bg-white/[0.04] ring-1 ring-white/[0.08] shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
              <div className="rounded-[calc(1.25rem-0.375rem)] overflow-hidden bg-[#111] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
                <iframe
                  src={portfolioUrl}
                  title="Portafolio Esteticar"
                  className="w-full"
                  style={{ height: "clamp(560px, 90vw, 720px)", border: "none" }}
                  allow="fullscreen"
                  loading="lazy"
                />
              </div>
            </div>

            {/* CTA absoluto dentro del área blanca de Heyzine */}
            <AnimatePresence>
              {visible && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                  onClick={() => setOpen(true)}
                  className="group absolute bottom-[9rem] left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-ec-gold text-white font-ui text-[10px] tracking-[0.2em] uppercase shadow-[0_6px_24px_rgba(184,134,11,0.5)] hover:shadow-[0_10px_32px_rgba(184,134,11,0.6)] whitespace-nowrap"
                  style={{ transition: "all 0.45s cubic-bezier(0.32,0.72,0,1)" }}
                >
                  <span>Me interesa este servicio</span>
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M7 17L17 7M17 7H7M17 7v10" />
                    </svg>
                  </div>
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Modal selector de servicio */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
              className="fixed z-50 bottom-0 left-0 right-0 sm:inset-0 sm:flex sm:items-center sm:justify-center px-4 pb-6 sm:pb-0"
            >
              <div className="w-full sm:max-w-sm bg-[#111] rounded-t-3xl sm:rounded-2xl p-6 border border-white/[0.08] shadow-[0_-20px_60px_rgba(0,0,0,0.6)]">

                {/* Handle móvil */}
                <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5 sm:hidden" />

                <p className="font-heading text-lg text-white font-light mb-1">¿Qué servicio te interesa?</p>
                <p className="font-body text-white/40 text-xs mb-5">Te conectamos con Sara directamente por WhatsApp.</p>

                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 mb-5">
                  {services.map(s => (
                    <button
                      key={s}
                      onClick={() => setSelected(s)}
                      className={`w-full text-left px-4 py-3 rounded-xl font-body text-sm transition-all duration-200 ${
                        selected === s
                          ? "bg-ec-gold text-white shadow-[0_4px_16px_rgba(184,134,11,0.3)]"
                          : "bg-white/[0.05] text-white/70 hover:bg-white/[0.08] hover:text-white"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleContact}
                  disabled={!selected}
                  className="w-full py-3.5 rounded-full font-ui text-[11px] tracking-[0.2em] uppercase text-white transition-all duration-300 flex items-center justify-center gap-2"
                  style={{
                    background: selected ? "#25D366" : "rgba(255,255,255,0.08)",
                    cursor: selected ? "pointer" : "not-allowed",
                    opacity: selected ? 1 : 0.5,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.556 4.112 1.524 5.84L0 24l6.364-1.498A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.79 9.79 0 01-5.003-1.374l-.36-.213-3.714.875.936-3.617-.235-.372A9.789 9.789 0 012.182 12c0-5.418 4.4-9.818 9.818-9.818 5.418 0 9.818 4.4 9.818 9.818 0 5.418-4.4 9.818-9.818 9.818z"/>
                  </svg>
                  Hablar con Sara
                </button>

                <button onClick={() => setOpen(false)}
                  className="w-full mt-2 py-2.5 font-ui text-[10px] tracking-widest uppercase text-white/30 hover:text-white/60 transition-colors">
                  Cancelar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
