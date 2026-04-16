import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AdminStats from "./AdminStats";
import AdminAppointments from "./AdminAppointments";
import AdminBotConfig from "./AdminBotConfig";
import CalendarSection from "../CalendarSection";
import { Link } from "react-router-dom";
import { BRAND } from "../../lib/constants";

const TABS = [
  { id: "stats", label: "Dashboard", icon: "dashboard" },
  { id: "appointments", label: "Citas", icon: "users" },
  { id: "calendar", label: "Calendario", icon: "calendar" },
  { id: "bot", label: "Robot AI", icon: "bot" },
];

const TabIcon = ({ type, size = 20 }) => {
  const icons = {
    dashboard: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>
      </svg>
    ),
    users: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    calendar: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    bot: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/>
      </svg>
    ),
  };
  return icons[type] || null;
};

export default function AdminDashboard({ embedded = false }) {
  const [activeTab, setActiveTab] = useState("stats");

  // ── Embedded mode: compact tabs (used inside BotChat fullscreen) ──
  if (embedded) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex gap-2 mb-8 flex-wrap">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 transition-all duration-300 font-ui text-[10px] tracking-[0.2em] uppercase rounded-sm border ${
                  isActive
                    ? "bg-ec-gold text-white border-ec-gold"
                    : "text-ec-text-muted border-black/[0.06] bg-white hover:border-ec-gold/30"
                }`}
              >
                <TabIcon type={tab.icon} size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4 }}
          >
            {activeTab === "stats" && <AdminStats />}
            {activeTab === "appointments" && <AdminAppointments />}
            {activeTab === "calendar" && <CalendarSection isAdmin={true} />}
            {activeTab === "bot" && <AdminBotConfig />}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ── Standalone mode (ruta /admin) ──────────────────────────────
  return (
    <div className="min-h-screen bg-ec-cream flex flex-col lg:flex-row overflow-hidden">
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-ec-gold/[0.03] blur-[150px] rounded-full pointer-events-none" />

      {/* Sidebar */}
      <div className="relative z-20 w-full lg:w-80 border-r border-black/[0.06] bg-white h-auto lg:h-screen flex flex-col p-8 shadow-[4px_0_30px_rgba(0,0,0,0.03)]">
        <div className="mb-12 flex flex-col items-center gap-6">
          <Link to="/" className="hover:scale-105 transition-transform">
            <img src={BRAND.logo} alt="Logo" className="h-14 object-contain" />
          </Link>
          <div className="text-center">
            <h1 className="font-heading text-xl text-ec-dark tracking-widest uppercase">Panel de Control</h1>
            <p className="font-ui text-[9px] tracking-[0.4em] text-ec-gold mt-2 uppercase">Management System v2.0</p>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative w-full flex items-center gap-5 px-6 py-5 transition-all duration-500 group overflow-hidden rounded-sm ${
                  isActive
                    ? "bg-ec-gold text-white font-bold shadow-[0_4px_20px_rgba(184,134,11,0.2)]"
                    : "text-ec-text-muted hover:bg-ec-cream hover:text-ec-dark"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-ec-gold rounded-sm"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10"><TabIcon type={tab.icon} size={20} /></span>
                <span className="relative z-10 font-ui text-[11px] tracking-[0.2em] uppercase">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-auto pt-8 border-t border-black/[0.06] space-y-3">
          <Link
            to="/"
            className="flex items-center gap-4 px-6 py-4 text-ec-text-muted hover:text-ec-gold transition-all font-ui text-[10px] tracking-[0.2em] uppercase"
          >
            ← Volver al Sitio
          </Link>
          <button className="w-full flex items-center gap-4 px-6 py-4 text-red-400/50 hover:bg-red-50 hover:text-red-500 transition-all font-ui text-[10px] tracking-[0.2em] uppercase rounded-sm">
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="relative z-10 flex-1 overflow-y-auto max-h-screen">
        <div className="p-8 lg:p-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: "circOut" }}
            >
              <div className="max-w-6xl mx-auto">
                {activeTab === "stats" && <AdminStats />}
                {activeTab === "appointments" && <AdminAppointments />}
                {activeTab === "calendar" && <CalendarSection isAdmin={true} />}
                {activeTab === "bot" && <AdminBotConfig />}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
