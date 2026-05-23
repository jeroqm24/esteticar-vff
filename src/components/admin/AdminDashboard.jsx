import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AdminStats from "./AdminStats";
import AdminAppointments from "./AdminAppointments";
import AdminClients from "./AdminClients";
import AdminFinanzas from "./AdminFinanzas";
import AdminConversations from "./AdminConversations";
import AdminCancellations from "./AdminCancellations";
import AdminCosts from "./AdminCosts";
import AdminConfig from "./AdminConfig";
import AdminLeads from "./AdminLeads";
import AdminAnalytics from "./AdminAnalytics";
import CalendarSection from "../CalendarSection";
import { BRAND } from "../../lib/constants";

const ADMIN_PASSWORD = "Esteticar11.";

function AdminLogin({ onSuccess }) {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pwd === ADMIN_PASSWORD) {
      sessionStorage.setItem("admin_auth", "1");
      onSuccess();
    } else {
      setError(true);
      setPwd("");
    }
  };

  return (
    <div className="min-h-screen bg-ec-cream flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-black/[0.06] shadow-sm rounded-sm p-8 sm:p-10 w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <span className="font-ui text-[10px] tracking-[0.4em] text-ec-gold uppercase block mb-3">Panel Administrativo</span>
          <h1 className="font-heading text-3xl text-ec-dark font-light">Esteticar</h1>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* font-size mínimo 16px para evitar auto-zoom de iOS Safari */}
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              value={pwd}
              onChange={(e) => { setPwd(e.target.value); setError(false); }}
              placeholder="Contraseña"
              autoFocus
              className="w-full px-4 py-3 pr-12 border border-black/[0.1] rounded-sm font-body bg-ec-cream focus:border-ec-gold focus:outline-none"
              style={{ fontSize: '16px' }}
            />
            <button
              type="button"
              onClick={() => setShowPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-ec-text-muted hover:text-ec-dark transition-colors"
              tabIndex={-1}
            >
              {showPwd ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
          {error && (
            <p className="text-red-500 text-xs font-body text-center">Contraseña incorrecta</p>
          )}
          <button type="submit" className="btn-gold w-full py-3 rounded-sm text-[11px]">
            ENTRAR
          </button>
        </form>
      </motion.div>
    </div>
  );
}

const TABS = [
  { id: "stats", label: "Dashboard", icon: "dashboard" },
  { id: "appointments", label: "Citas", icon: "users" },
  { id: "clients", label: "Clientes", icon: "clients" },
  { id: "leads", label: "Pipeline", icon: "leads" },
  { id: "calendar", label: "Calendario", icon: "calendar" },
  { id: "finanzas", label: "Finanzas", icon: "finanzas" },
  { id: "conversations", label: "Chats", icon: "chat" },
  { id: "cancellations", label: "Cancelaciones", icon: "cancel" },
  { id: "costs", label: "Costos API", icon: "costs" },
  { id: "analytics", label: "Analítica", icon: "analytics" },
  { id: "config", label: "Configuración", icon: "config" },
];

const TabIcon = ({ type, size = 20 }) => {
  const icons = {
    dashboard: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
      </svg>
    ),
    users: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    calendar: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    finanzas: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    clients: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
      </svg>
    ),
    leads: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
      </svg>
    ),
    chat: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    cancel: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    ),
    costs: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    config: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
    analytics: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  };
  return icons[type] || null;
};

export default function AdminDashboard({ onClose }) {
  const convParam = new URLSearchParams(window.location.search).get("conv");
  const [activeTab, setActiveTab] = useState(convParam ? "conversations" : "stats");
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("admin_auth") === "1");
  const [openNewAppt, setOpenNewAppt] = useState(false);
  const [cancellationCount, setCancellationCount] = useState(0);
  const [initialPhone] = useState(convParam);

  const navigateTo = (tab, newAppt = false) => {
    setActiveTab(tab);
    if (tab === "calendar" && newAppt) {
      setOpenNewAppt(true);
    } else {
      setOpenNewAppt(false);
    }
  };

  if (!authed) return <AdminLogin onSuccess={() => { setAuthed(true); }} />;

  const shortNavLabel = {
    stats: "Panel", appointments: "Citas", clients: "Clientes",
    leads: "Pipeline", calendar: "Agenda", finanzas: "Finanzas",
    conversations: "Chats", cancellations: "Cancel.", costs: "API", analytics: "Web", config: "Config.",
  };

  return (
    <div className="h-[100dvh] bg-ec-cream flex flex-col lg:flex-row">

      {/* ── SIDEBAR (desktop only) ── */}
      <div className="hidden lg:flex relative z-20 w-72 xl:w-80 border-r border-black/[0.06] bg-white h-full flex-col p-8 shadow-[4px_0_30px_rgba(0,0,0,0.03)] flex-shrink-0">
        <div className="mb-10 flex flex-col items-center gap-4">
          <div className="cursor-pointer hover:scale-105 transition-transform" onClick={onClose}>
            <img src={BRAND.logo} alt="Logo" className="h-12 object-contain" />
          </div>
          <div className="text-center">
            <h1 className="font-heading text-lg text-ec-dark tracking-widest uppercase">Panel de Control</h1>
            <p className="font-ui text-[9px] tracking-[0.4em] text-ec-gold mt-1 uppercase">Management System</p>
          </div>
        </div>

        <div className="flex-1 space-y-1.5 overflow-y-auto">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative w-full flex items-center gap-4 px-5 py-4 transition-all duration-300 overflow-hidden rounded-sm ${isActive
                  ? "bg-ec-gold text-white shadow-[0_4px_20px_rgba(184,134,11,0.2)]"
                  : "text-ec-text-muted hover:bg-ec-cream hover:text-ec-dark"
                  }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-ec-gold rounded-sm"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10"><TabIcon type={tab.icon} size={18} /></span>
                <span className="relative z-10 font-ui text-[11px] tracking-[0.2em] uppercase">{tab.label}</span>
                {tab.id === "cancellations" && cancellationCount > 0 && (
                  <span className={`relative z-10 ml-auto flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${isActive ? "bg-white text-ec-gold" : "bg-red-500 text-white"}`}>
                    {cancellationCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-auto pt-6 border-t border-black/[0.06]">
          <button
            onClick={onClose}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-red-400/60 hover:text-red-500 hover:bg-red-50 transition-all font-ui text-[10px] tracking-[0.2em] uppercase rounded-sm"
          >
            ✕ Cerrar Panel
          </button>
        </div>
      </div>

      {/* ── COLUMNA DERECHA: header móvil + contenido + nav móvil ── */}
      {/* En desktop es flex-1 (el sidebar ocupa el lateral). En móvil es toda la pantalla. */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

        {/* Mobile header — in-flow, nunca fixed ni sticky */}
        <div className="lg:hidden flex-shrink-0 bg-white border-b border-black/[0.06] px-4 py-3 flex items-center justify-between shadow-sm">
          <img src={BRAND.logo} alt="Logo" className="h-8 object-contain" />
          <div className="flex items-center gap-3">
            <span className="font-ui text-[10px] tracking-[0.3em] text-ec-gold uppercase">
              {TABS.find(t => t.id === activeTab)?.label}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-ec-text-muted hover:text-red-500 transition-colors text-lg"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Contenido */}
        {activeTab === "conversations" ? (
          <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <AdminConversations initialPhone={initialPhone} />
          </main>
        ) : (
          <main className="flex-1 min-h-0 overflow-y-auto touch-pan-y">
            <div className="p-4 sm:p-6 lg:p-10 xl:p-16">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  <div className="max-w-6xl mx-auto">
                    {activeTab === "stats" && <AdminStats onNavigate={(tab) => navigateTo(tab, tab === "calendar")} onNewAppointment={() => navigateTo("calendar", true)} />}
                    {activeTab === "appointments" && <AdminAppointments />}
                    {activeTab === "clients" && <AdminClients />}
                    {activeTab === "leads" && <AdminLeads />}
                    {activeTab === "calendar" && <CalendarSection isAdmin={true} openNewOnMount={openNewAppt} />}
                    {activeTab === "finanzas" && <AdminFinanzas />}
                    {activeTab === "cancellations" && <AdminCancellations onCountChange={setCancellationCount} />}
                    {activeTab === "costs" && <AdminCosts />}
                    {activeTab === "analytics" && <AdminAnalytics />}
                    {activeTab === "config" && <AdminConfig />}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        )}

        {/* Mobile bottom nav — in-flow al fondo del flex-col, nunca fixed */}
        <div
          className="lg:hidden flex-shrink-0 bg-white border-t border-black/[0.06] shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex overflow-x-auto" style={{ height: "60px", scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex-shrink-0 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 ${isActive ? "text-ec-gold" : "text-[#8696A0]"}`}
                  style={{ minWidth: "60px", paddingInline: "6px" }}
                >
                  <div className="relative">
                    <TabIcon type={tab.icon} size={isActive ? 21 : 19} />
                    {tab.id === "cancellations" && cancellationCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] text-white font-bold flex items-center justify-center">
                        {cancellationCount > 9 ? "9+" : cancellationCount}
                      </span>
                    )}
                  </div>
                  <span className={`text-[8px] leading-none font-ui ${isActive ? "font-bold text-ec-gold" : "text-[#8696A0]"}`}>
                    {shortNavLabel[tab.id] || tab.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="bottomNav"
                      className="absolute top-0 inset-x-0 h-[2px] bg-ec-gold rounded-b-sm"
                      transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </div>{/* fin columna derecha */}
    </div>
  );
}