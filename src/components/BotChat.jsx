import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db, ai, generateEscalationURL, resetConversationState, check20DayReminders, getGreeting } from "../lib/storage";
import { BRAND, ADMIN_SECRET } from "../lib/constants";
import AdminDashboard from "./admin/AdminDashboard";

// ─── Advisor profiles ─────────────────────────────────────────────
const ADVISORS = [
  { name: "Camila", photo: "/1.jpg" },
  { name: "Sofía", photo: "/2.jpg" },
  { name: "Manuela", photo: "/3.jpg" },
  { name: "Daniela", photo: "/4.jpg" },
];

// ─── Inline markdown renderer ─────────────────────────────────────
function renderInline(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    return <span key={i}>{part}</span>;
  });
}

function SafeMarkdown({ content }) {
  if (!content) return null;
  const lines = content.split("\n");
  const elements = [];
  let key = 0;
  for (const line of lines) {
    if (line.trim() === "") { elements.push(<div key={key++} className="h-1" />); continue; }
    if (line.trim() === "---") {
      elements.push(<hr key={key++} style={{ border: "none", borderTop: "1px solid rgba(0,0,0,0.08)", margin: "6px 0" }} />);
      continue;
    }
    if (/^[•\-\*]\s/.test(line.trim())) {
      const text = line.trim().replace(/^[•\-\*]\s/, "");
      elements.push(
        <div key={key++} className="flex gap-1.5 items-start py-0.5">
          <span className="text-[#128C7E] shrink-0 mt-0.5 text-xs">•</span>
          <span>{renderInline(text)}</span>
        </div>
      );
      continue;
    }
    const numMatch = line.trim().match(/^(\d+[\.]\s?️?\s?)(.*)/);
    if (numMatch) {
      elements.push(
        <div key={key++} className="flex gap-1.5 items-start py-0.5">
          <span className="text-[#128C7E]/70 text-xs shrink-0">{numMatch[1]}</span>
          <span>{renderInline(numMatch[2])}</span>
        </div>
      );
      continue;
    }
    elements.push(<p key={key++} className="leading-relaxed">{renderInline(line)}</p>);
  }
  return <div className="space-y-0.5 text-sm text-[#111B21]">{elements}</div>;
}

// ─── WhatsApp timestamp ───────────────────────────────────────────
function Timestamp({ ts }) {
  const date = ts ? new Date(ts) : new Date();
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return <span className="text-[10px] text-black/30 ml-1">{h}:{m}</span>;
}

// ─── WhatsApp escalation button ───────────────────────────────────
function EscalateButton({ question }) {
  const url = generateEscalationURL(question);
  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
      className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg text-white text-[12px] font-semibold shadow-sm"
      style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)", textDecoration: "none", display: "inline-flex" }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.116.553 4.103 1.523 5.828L.057 23.857a.5.5 0 0 0 .636.607l6.218-1.63A11.953 11.953 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.953 9.953 0 0 1-5.077-1.384l-.364-.216-3.767.988 1.006-3.665-.236-.377A9.952 9.952 0 0 1 2 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10z" />
      </svg>
      Conectar con Sara →
    </motion.a>
  );
}

// ─── Message bubbles ──────────────────────────────────────────────
function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const isBot = message.role === "assistant";
  if (!isUser && !isBot) return null;

  const hasEscalation = isBot && message.escalationUrl;
  // Limpiar sentinels del texto visible
  const cleanContent = (message.content || "")
    .replace(/__ESCALATE__:[^\n]*/g, "")
    .replace(/__BOOKING_CONFIRMED__[\s\S]*?__END_BOOKING__/g, "")
    .trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} px-3`}
    >
      <div
        className={`relative max-w-[84%] px-3 py-2 text-sm rounded-[7px] shadow-sm ${isUser
          ? "bg-[#D9FDD3] text-[#111B21] rounded-tr-[2px]"
          : "bg-white text-[#111B21] rounded-tl-[2px]"
          }`}
        style={{ wordBreak: "break-word" }}
      >
        {isBot && (
          <span className="absolute -left-[6px] top-0 w-0 h-0"
            style={{ borderWidth: "0 8px 8px 0", borderColor: "transparent white transparent transparent", borderStyle: "solid" }} />
        )}
        {isUser && (
          <span className="absolute -right-[6px] top-0 w-0 h-0"
            style={{ borderWidth: "0 0 8px 8px", borderColor: "transparent transparent transparent #D9FDD3", borderStyle: "solid" }} />
        )}

        {isUser ? (
          <p className="font-body">{message.content}</p>
        ) : (
          <div>
            <SafeMarkdown content={cleanContent} />
            {hasEscalation && <EscalateButton question={message.escalationQuestion} />}
          </div>
        )}

        <div className="flex justify-end mt-1 gap-1 items-center">
          <Timestamp ts={message.timestamp} />
          {isUser && (
            <svg width="14" height="10" viewBox="0 0 18 11" fill="#53BDEB" className="shrink-0">
              <path d=".3 5.3l1.4-1.4 4 4.1L14.3.3l1.4 1.4-9 9.1z" />
              <path d="M4.2 9.3l-1-1.1L14.3 0l1.4 1.4z" />
            </svg>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────
function TypingIndicator({ name }) {
  return (
    <div className="flex items-center gap-2 px-3">
      <div className="bg-white rounded-[7px] rounded-tl-[2px] px-3 py-2 shadow-sm flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ y: [-2, 2, -2], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.7, delay: i * 0.15, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-[#8696A0]"
          />
        ))}
      </div>
      <span className="text-[11px] text-[#8696A0]">{name} está escribiendo...</span>
    </div>
  );
}

// ─── Quick chip replies ───────────────────────────────────────────
const QUICK_REPLIES = [
  { label: "Ver servicios 🚗" },
  { label: "¿Cuánto cuesta? 💰" },
  { label: "Quiero una cita 📅" },
  { label: "¿Qué garantía dan? 🛡️" },
  { label: "Salón VIP ☕" },
  { label: "Servicios para motos 🏍️" },
];

// ─── Connection error state ───────────────────────────────────────
function ConnectionError({ onRetry }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-8" style={{ background: "#E5DDD5" }}>
      <div className="w-14 h-14 rounded-full bg-white/80 flex items-center justify-center mb-4 shadow-sm">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8696A0" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p className="text-[#111B21] font-semibold text-[14px] mb-1">Algo salió mal</p>
      <p className="text-[#8696A0] text-[12px] mb-5">
        No te preocupes, no perdiste nada.<br />Volvamos a intentarlo 😊
      </p>
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onRetry}
        className="px-6 py-2.5 rounded-full font-semibold text-[13px] text-white"
        style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
      >
        Reintentar
      </motion.button>
    </div>
  );
}

// ─── Splash screen ────────────────────────────────────────────────
function ConnectingSplash({ advisor, onStart, isLoading, hasError, onRetry }) {
  if (hasError) return <ConnectionError onRetry={onRetry} />;

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-8" style={{ background: "#E5DDD5" }}>
      <div className="mb-6 relative">
        <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg mx-auto bg-[#25D366]/20">
          <img
            src={advisor.photo}
            alt={advisor.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        </div>
        <div className="absolute bottom-1 right-1 w-5 h-5 bg-[#25D366] rounded-full border-2 border-white" />
      </div>

      <p className="text-[#111B21] font-semibold text-lg leading-tight">{advisor.name}</p>
      <p className="text-[#8696A0] text-[12px] mb-4">Esteticar · Asesora de Estética</p>

      <div className="bg-white/80 backdrop-blur rounded-xl p-5 max-w-[280px] shadow-sm mb-6">
        <p className="text-[#111B21] text-[13px] leading-relaxed mb-1">
          <span className="font-semibold">Asesoras disponibles ahora mismo</span>
        </p>
        <p className="text-[#25D366] font-bold text-[14px]">24 horas / 7 días 🟢</p>
        <p className="text-[#8696A0] text-[11px] mt-1.5">
          Respuesta inmediata · Sin esperas
        </p>
      </div>

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onStart}
        disabled={isLoading}
        className="px-8 py-3.5 rounded-full font-semibold text-[14px] text-white shadow-lg disabled:opacity-70 flex items-center gap-2"
        style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)" }}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            Iniciando...
          </>
        ) : (
          "Comenzar a chatear"
        )}
      </motion.button>

      <p className="text-[#8696A0] text-[10px] mt-4">
        Chat directo · Sin esperas · 100% privado
      </p>
    </div>
  );
}

// ─── Main BotChat component ───────────────────────────────────────
export default function BotChat({ isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [splashLoading, setSplashLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const [advisor] = useState(() => ADVISORS[Math.floor(Math.random() * ADVISORS.length)]);
  const [adminMode, setAdminMode] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const startedRef = useRef(false); // ← FIX: evita doble llamada

  // ── Scroll to bottom ──────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Prefill listener ──────────────────────────────────────────
  useEffect(() => {
    const handlePrefill = (e) => {
      if (e.detail) setInput(e.detail);
    };
    window.addEventListener('prefill-bot', handlePrefill);
    return () => window.removeEventListener('prefill-bot', handlePrefill);
  }, []);
  useEffect(() => {
    check20DayReminders();
  }, []);

  // ── Focus input ────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && chatStarted) {
      const timer = setTimeout(() => inputRef.current?.focus(), 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen, chatStarted]);

  // ═══════════════════════════════════════════════════════════
  // BUG FIX: startChat completamente reescrito
  // Problema original: si db.agents.getMessages() tarda mucho
  // o el localStorage falla, setSplashLoading(false) nunca corre.
  // Solución: try/catch exhaustivo + estado garantizado al final.
  // ═══════════════════════════════════════════════════════════
  const startChat = useCallback(async (isRetry = false) => {
    // Evitar llamadas duplicadas
    if (startedRef.current && !isRetry) return;
    startedRef.current = true;

    if (isRetry) {
      setConnectionError(false);
      startedRef.current = false;
    }

    setSplashLoading(true);
    setConnectionError(false);

    // Delay mínimo para UX (se ve natural)
    await new Promise((r) => setTimeout(r, 400));

    let existing = [];

    // Intentar leer mensajes — si falla, arrancamos con array vacío
    try {
      const result = await Promise.race([
        db.agents.getMessages(),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000))
      ]);
      existing = Array.isArray(result) ? result : [];
    } catch {
      existing = [];
      // No mostramos error aquí — arrancamos fresh
    }

    // ── Construir saludo inicial si no hay historial ───────────
    if (existing.length === 0) {
      const greeting = {
        role: "assistant",
        content: `${getGreeting()}, bienvenido/a a **Esteticar**. Estoy aquí para atenderle. ¿En qué le puedo ayudar?`,
        timestamp: new Date().toISOString(),
      };

      try {
        await db.agents.addMessage(greeting.role, greeting.content);
      } catch { }

      setMessages([greeting]);
      setShowQuick(true);
    } else {
      setMessages(existing);
      setShowQuick(existing.length <= 2);
    }

    // ── SIEMPRE terminar en estado correcto ────────────────────
    setSplashLoading(false);
    setChatStarted(true);

    setTimeout(() => inputRef.current?.focus(), 300);
  }, [advisor.name]);

  // ── sendMessage ────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    setShowQuick(false);

    // Admin secret
    if (msg.toUpperCase() === ADMIN_SECRET) {
      const userMsg = { role: "user", content: msg, timestamp: new Date().toISOString() };
      try { await db.agents.addMessage("user", msg); } catch { }
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      await new Promise((r) => setTimeout(r, 700));
      const botMsg = {
        role: "assistant",
        content: "🔐 **Código verificado.** Bienvenido al panel de administración.",
        timestamp: new Date().toISOString(),
      };
      try { await db.agents.addMessage("assistant", botMsg.content); } catch { }
      setMessages((prev) => [...prev, botMsg]);
      setLoading(false);
      await new Promise((r) => setTimeout(r, 1200));
      setAdminMode(true);
      return;
    }

    // Agregar mensaje del usuario inmediatamente
    const userMsg = { role: "user", content: msg, timestamp: new Date().toISOString() };
    try { await db.agents.addMessage("user", msg); } catch { }
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    // Delay de escritura realista
    const typingDelay = 600 + Math.random() * 800;
    await new Promise((r) => setTimeout(r, typingDelay));

    try {
      const responsePromise = ai.invoke(msg, advisor.name);
      const timeoutPromise = new Promise((_, rej) =>
        setTimeout(() => rej(new Error("timeout")), 15000) // 15s para Claude API
      );
      const response = await Promise.race([responsePromise, timeoutPromise]);

      // Detectar escalación en la respuesta
      const escalateMatch = response && response.match(/\n?__ESCALATE__:(.+)/);
      if (escalateMatch) {
        const userQuestion = escalateMatch[1].trim();
        const cleanText = response.replace(/\n?__ESCALATE__:.+/, '').trim();
        const botMsg = {
          role: "assistant",
          content: cleanText,
          escalationUrl: true,
          escalationQuestion: userQuestion,
          timestamp: new Date().toISOString(),
        };
        try { await db.agents.addMessage("assistant", cleanText); } catch { }
        setMessages((prev) => [...prev, botMsg]);
      } else {
        const botMsg = {
          role: "assistant",
          content: response,
          timestamp: new Date().toISOString(),
        };
        try { await db.agents.addMessage("assistant", response); } catch { }
        setMessages((prev) => [...prev, botMsg]);
      }
    } catch (err) {
      const errorMsg = {
        role: "assistant",
        content: `Uy, tuve un problemita de conexión ahora mismo 😅 Pero tranquilo/a, ya volvió. Cuéntame de nuevo, estoy acá.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, advisor.name]);

  // ── Clear chat ─────────────────────────────────────────────────
  const handleClear = useCallback(async () => {
    try { await db.agents.clearMessages(); } catch { }
    resetConversationState();
    startedRef.current = false;
    setMessages([]);
    setShowQuick(true);
    setChatStarted(false);
    setSplashLoading(false);
    setConnectionError(false);
  }, []);

  // ── Admin panel ────────────────────────────────────────────────
  if (adminMode && isOpen) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-ec-white overflow-y-auto"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] bg-white sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-3">
              <img src={BRAND.logo} alt="Esteticar" className="h-8 object-contain" />
              <span className="font-ui text-[11px] tracking-[0.3em] text-ec-gold uppercase">Admin Panel</span>
            </div>
            <button
              onClick={() => { setAdminMode(false); onClose(); }}
              className="font-ui text-[10px] tracking-[0.2em] text-ec-text-muted uppercase hover:text-red-400 transition-colors border border-black/[0.06] px-4 py-2 rounded-sm"
            >
              SALIR DEL PANEL
            </button>
          </div>
          <div className="p-6">
            <AdminDashboard embedded />
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/25"
            onClick={onClose}
          />

          {/* Chat window */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[70] w-[calc(100vw-2rem)] sm:w-[370px] flex flex-col rounded-[10px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.22)] h-[72vh] max-h-[620px]"
            style={{ fontFamily: "'Segoe UI', 'Helvetica Neue', Helvetica, sans-serif" }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ background: "#128C7E" }}>
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-white/20 bg-[#25D366]/30">
                <img
                  src={advisor.photo}
                  alt={advisor.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-[15px] leading-tight">{advisor.name}</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                  <p className="text-white/75 text-[12px]">
                    {chatStarted ? "En línea · Asesora Esteticar" : "Asesora Esteticar"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {chatStarted && (
                  <button
                    onClick={handleClear}
                    className="text-white/70 hover:text-white transition-colors"
                    title="Nuevo chat"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="text-white/70 hover:text-white transition-colors text-lg leading-none font-light"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body */}
            <div
              className="flex-1 overflow-y-auto flex flex-col min-h-0"
              style={{
                background: "#E5DDD5",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cpath d='M30 0 L60 30 L30 60 L0 30 Z' fill='none' stroke='rgba(0,0,0,0.03)' stroke-width='1'/%3E%3C/svg%3E")`,
              }}
            >
              {!chatStarted ? (
                <ConnectingSplash
                  advisor={advisor}
                  onStart={() => startChat(false)}
                  isLoading={splashLoading}
                  hasError={connectionError}
                  onRetry={() => startChat(true)}
                />
              ) : (
                <div className="flex-1 py-3 space-y-2 overflow-y-auto">
                  {messages.map((m, i) => (
                    <MessageBubble key={`${m.timestamp}-${i}`} message={m} />
                  ))}

                  {loading && <TypingIndicator name={advisor.name} />}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input bar */}
            {chatStarted && (
              <div
                className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
                style={{ background: "#F0F2F5" }}
              >
                <div className="flex-1 flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Escribe un mensaje..."
                    disabled={loading}
                    className="flex-1 text-[14px] text-[#111B21] outline-none bg-transparent placeholder:text-[#8696A0] disabled:opacity-60 resize-none py-1"
                    maxLength={500}
                    rows={2}
                  />
                </div>
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-40 active:scale-95"
                  style={{ background: input.trim() && !loading ? "#128C7E" : "#8696A0" }}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
