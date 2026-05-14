import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NAV_ITEMS, BRAND } from "../lib/constants";

export default function Navigation({ onBookingClick, cartCount }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.9, ease: [0.32, 0.72, 0, 1] }}
        className={`fixed top-0 inset-x-0 z-[100] transition-all duration-700 ${
          scrolled
            ? "bg-white/92 backdrop-blur-2xl border-b border-black/[0.06] shadow-[0_4px_30px_rgba(0,0,0,0.06)]"
            : "bg-transparent"
        }`}
      >
        <div className="relative max-w-7xl mx-auto px-6 flex items-center justify-between h-20">
          {/* Logo */}
          <a href="#" className="relative z-10 flex items-center">
            <img
              src={BRAND.logo}
              alt="Esteticar"
              className={`object-contain transition-all duration-700 ${
                scrolled ? "h-10 sm:h-11" : "h-10 sm:h-12"
              }`}
              style={{
                filter: scrolled
                  ? "drop-shadow(0 0 4px rgba(184,134,11,0.2))"
                  : "drop-shadow(0 0 16px rgba(248,200,64,0.55)) drop-shadow(0 0 4px rgba(248,200,64,0.3))",
              }}
            />
          </a>

          {/* Desktop links — rounded-full pills */}
          <div className="hidden lg:flex items-center gap-1.5 absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`font-ui text-[11px] tracking-[0.2em] uppercase transition-all duration-[650ms] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] px-5 py-2.5 rounded-full ${
                  scrolled
                    ? "text-ec-text-secondary bg-transparent hover:bg-ec-gold hover:text-white"
                    : "text-white/75 bg-white/[0.07] backdrop-blur-sm border border-white/[0.1] hover:bg-ec-gold hover:text-white hover:border-transparent"
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Right: RESERVA pill button */}
          <div className="hidden lg:flex items-center gap-5">
            <button
              onClick={onBookingClick}
              className="relative group/nav px-8 py-3 font-ui text-[11px] tracking-[0.3em] uppercase font-bold rounded-full transition-all duration-[650ms] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] flex items-center gap-3"
              style={{
                background: "linear-gradient(135deg, #B8860B 0%, #D4A017 100%)",
                color: "#fff",
                boxShadow: "0 4px 20px rgba(184,134,11,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
            >
              RESERVA
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-500 group-hover/nav:translate-x-0.5">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </span>
              {cartCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-white text-ec-gold text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-ec-gold"
                >
                  {cartCount}
                </motion.span>
              )}
            </button>
          </div>

          {/* Mobile hamburger / X */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden relative z-[110] w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300"
            style={{
              background: mobileOpen ? "rgba(184,134,11,0.15)" : "transparent",
              border: mobileOpen ? "1px solid rgba(184,134,11,0.35)" : "1px solid transparent",
            }}
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          >
            <div className="relative w-5 h-5">
              {/* Línea superior / brazo 1 de X */}
              <span className="absolute left-0 right-0 h-[1.5px] rounded-full transition-all duration-400"
                style={{
                  top: mobileOpen ? "50%" : "20%",
                  transform: mobileOpen ? "translateY(-50%) rotate(45deg)" : "none",
                  background: mobileOpen ? "#D4A017" : (scrolled ? "#1A1A1A" : "#ffffff"),
                }}
              />
              {/* Línea media */}
              <span className="absolute left-0 right-0 h-[1.5px] rounded-full top-1/2 -translate-y-1/2 transition-all duration-400"
                style={{
                  opacity: mobileOpen ? 0 : 1,
                  background: scrolled ? "#1A1A1A" : "#ffffff",
                }}
              />
              {/* Línea inferior / brazo 2 de X */}
              <span className="absolute left-0 right-0 h-[1.5px] rounded-full transition-all duration-400"
                style={{
                  bottom: mobileOpen ? "50%" : "20%",
                  transform: mobileOpen ? "translateY(50%) rotate(-45deg)" : "none",
                  background: mobileOpen ? "#D4A017" : (scrolled ? "#1A1A1A" : "#ffffff"),
                }}
              />
            </div>
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu — full screen dark overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[90] flex flex-col items-center justify-center pt-8 pb-12 gap-0 overflow-y-auto"
            style={{
              background: "rgba(10,10,10,0.96)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
            }}
          >
            {/* Gold line accent */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-ec-gold/40 to-transparent" />

            {NAV_ITEMS.map((item, i) => (
              <motion.a
                key={item.label}
                href={item.href}
                onClick={(e) => {
                  if (item.href.startsWith("/")) { setMobileOpen(false); return; }
                  e.preventDefault();
                  setMobileOpen(false);
                  setTimeout(() => {
                    const target = document.querySelector(item.href);
                    if (target) target.scrollIntoView({ behavior: "smooth" });
                  }, 400);
                }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, ease: [0.32, 0.72, 0, 1] }}
                className="font-heading text-4xl sm:text-5xl text-white/80 hover:text-ec-gold transition-colors duration-300 py-4"
              >
                {item.label}
              </motion.a>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, ease: [0.32, 0.72, 0, 1] }}
              className="mt-10"
            >
              <button
                onClick={() => {
                  setMobileOpen(false);
                  setTimeout(() => onBookingClick(), 400);
                }}
                className="px-10 py-5 font-ui text-[12px] tracking-[0.4em] uppercase font-bold rounded-full transition-all duration-500 active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, #B8860B 0%, #D4A017 100%)",
                  color: "#fff",
                  boxShadow: "0 8px 30px rgba(184,134,11,0.35)",
                }}
              >
                RESERVAR AHORA
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
