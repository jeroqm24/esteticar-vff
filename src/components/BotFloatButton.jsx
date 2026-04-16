import React from "react";
import { motion, AnimatePresence } from "framer-motion";

// Premium WhatsApp-style bot trigger button
export default function BotFloatButton({ isOpen, onClick, hasUnread }) {
  return (
    <div className="fixed z-[55] bottom-4 right-4 sm:bottom-6 sm:right-6">
      {/* Pulse rings (only when closed) */}
      <AnimatePresence>
        {!isOpen && (
          <>
            <motion.div
              key="ring1"
              initial={{ scale: 1, opacity: 0.3 }}
              animate={{ scale: 2.2, opacity: 0 }}
              transition={{ duration: 2.2, repeat: Infinity }}
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ background: "rgba(37,211,102,0.2)" }}
            />
            <motion.div
              key="ring2"
              initial={{ scale: 1, opacity: 0.15 }}
              animate={{ scale: 1.7, opacity: 0 }}
              transition={{ duration: 2.2, repeat: Infinity, delay: 0.7 }}
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ background: "rgba(37,211,102,0.15)" }}
            />
          </>
        )}
      </AnimatePresence>

      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.2, type: "spring", stiffness: 220, damping: 16 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        onClick={onClick}
        aria-label={isOpen ? "Cerrar chat" : "Hablar con nuestra asesora"}
        className="relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-[0_4px_24px_rgba(37,211,102,0.35)] transition-all duration-300"
        style={{ background: isOpen ? "#075E54" : "#25D366" }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-white text-xl font-light"
            >
              ✕
            </motion.div>
          ) : (
            <motion.div
              key="wa"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* WhatsApp icon */}
              <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Tooltip label */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ delay: 2.5, duration: 0.4 }}
            className="absolute right-[calc(100%+10px)] top-1/2 -translate-y-1/2 bg-white border border-black/[0.06] px-3 py-1.5 whitespace-nowrap pointer-events-none shadow-md hidden sm:block rounded-sm"
          >
            <span className="font-ui text-[10px] tracking-[0.15em] text-[#075E54] uppercase">Habla con nosotros</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unread badge */}
      {hasUnread && !isOpen && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white z-20"
        />
      )}
    </div>
  );
}
