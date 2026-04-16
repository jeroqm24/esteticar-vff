import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function BookingFAB({ count, onClick }) {
  if (count === 0) return null;

  return (
    <AnimatePresence>
      <motion.button
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-8 py-4 shadow-[0_8px_40px_rgba(184,134,11,0.3)] bg-ec-gold text-white group overflow-hidden rounded-sm"
      >
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="m1 1 4 0 2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        <span className="relative z-10 font-ui text-[11px] tracking-[0.3em] uppercase font-bold">
          VER PLAN ({count})
        </span>
        <motion.div
          key={count}
          initial={{ scale: 2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 w-6 h-6 flex items-center justify-center text-[10px] font-bold bg-white text-ec-gold rounded-full"
        >
          {count}
        </motion.div>
      </motion.button>
    </AnimatePresence>
  );
}

