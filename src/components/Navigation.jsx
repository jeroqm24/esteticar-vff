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
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 inset-x-0 z-[100] transition-all duration-700 ${
          scrolled
            ? "bg-white/90 backdrop-blur-xl border-b border-black/[0.06] shadow-[0_2px_20px_rgba(0,0,0,0.04)]"
            : "bg-transparent"
        }`}
      >
        <div className="relative max-w-7xl mx-auto px-6 flex items-center justify-between h-20">
          {/* Logo — visible on all breakpoints, size adapts to scroll state */}
          <a href="#" className="relative z-10 flex items-center">
            <img
              src={BRAND.logo}
              alt="Esteticar"
              className={`object-contain transition-all duration-500 ${
                scrolled ? "h-10 sm:h-11" : "h-10 sm:h-12"
              }`}
              style={{
                filter: scrolled
                  ? "drop-shadow(0 0 4px rgba(184,134,11,0.2))"
                  : "drop-shadow(0 0 12px rgba(248,200,64,0.5)) drop-shadow(0 0 4px rgba(248,200,64,0.3))",
              }}
            />
          </a>

          {/* Desktop links — each in its own pill/banner */}
          <div className="hidden lg:flex items-center gap-2 absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`font-ui text-[11px] tracking-[0.2em] uppercase transition-all duration-500 px-5 py-2 border rounded-sm ${
                  scrolled
                    ? "text-ec-text-secondary border-black/[0.06] bg-ec-cream/50 hover:bg-ec-gold hover:text-white hover:border-ec-gold"
                    : "text-white/80 border-white/[0.12] bg-white/[0.06] backdrop-blur-sm hover:bg-ec-gold hover:text-white hover:border-ec-gold"
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Right actions — no Admin link, gold RESERVA button always */}
          <div className="hidden lg:flex items-center gap-5">
            <button
              onClick={onBookingClick}
              className="relative px-8 py-3 font-ui text-[11px] tracking-[0.3em] uppercase transition-all duration-500 font-bold bg-ec-gold text-white hover:shadow-[0_4px_20px_rgba(184,134,11,0.25)] hover:scale-[1.02] rounded-sm"
            >
              RESERVA
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

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`lg:hidden relative z-[110] w-8 h-6 flex flex-col justify-between ${mobileOpen ? "gap-0" : ""}`}
          >
            <span className={`block w-full h-px transition-all duration-500 ${
              mobileOpen
                ? "rotate-45 translate-y-[10px] bg-ec-dark"
                : scrolled ? "bg-ec-dark" : "bg-white"
            }`} />
            <span className={`block w-full h-px transition-all duration-500 ${
              mobileOpen ? "opacity-0" : scrolled ? "bg-ec-dark" : "bg-white"
            }`} />
            <span className={`block w-full h-px transition-all duration-500 ${
              mobileOpen
                ? "-rotate-45 -translate-y-[10px] bg-ec-dark"
                : scrolled ? "bg-ec-dark" : "bg-white"
            }`} />
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-white/95 backdrop-blur-xl flex flex-col items-center justify-start pt-32 pb-10 gap-10 overflow-y-auto"
          >
            {NAV_ITEMS.map((item, i) => (
              <motion.a
                key={item.label}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  setMobileOpen(false);
                  setTimeout(() => {
                    const target = document.querySelector(item.href);
                    if (target) {
                      target.scrollIntoView({ behavior: 'smooth' });
                    }
                  }, 400);
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="font-heading text-3xl text-ec-dark hover:text-ec-gold transition-colors"
              >
                {item.label}
              </motion.a>
            ))}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-4"
            >
              <button
                onClick={() => { 
                  setMobileOpen(false); 
                  setTimeout(() => onBookingClick(), 400); 
                }}
                className="btn-gold rounded-sm"
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
