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
  const parts = text.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    if (/^https?:\/\//.test(part))
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[#128C7E] underline break-all">{part}</a>;
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
  let h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? 'p. m.' : 'a. m.';
  h = h % 12 || 12;
  return <span className="text-[10px] text-black/40 ml-1">{h}:{m} {ampm}</span>;
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
        className={`relative max-w-[84%] min-w-[88px] px-3 py-2 text-sm rounded-[7px] shadow-sm ${isUser
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

        <div className="relative pb-[18px]">
          {isUser ? (
            <p className="font-body text-[14.5px] leading-[19px]">
              {message.content}
              <span className="inline-block w-[72px] h-0 select-none pointer-events-none" aria-hidden="true" />
            </p>
          ) : (
            <div className="text-[14.5px] leading-[19px]">
              <SafeMarkdown content={cleanContent} />
              {hasEscalation && <EscalateButton question={message.escalationQuestion} />}
              <span className="inline-block w-[72px] h-0 select-none pointer-events-none" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="absolute right-2 bottom-[5px] flex items-center justify-end gap-[3px]">
          <Timestamp ts={message.timestamp} />
          {isUser && (
            <img src="/visto.png?v=3" alt="Visto" className="w-[17px] h-auto shrink-0 mb-[1px] animate-fade-in transition-all duration-300" />
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
const WhatsAppIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.116.553 4.103 1.523 5.828L.057 23.857a.5.5 0 0 0 .636.607l6.218-1.63A11.953 11.953 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.953 9.953 0 0 1-5.077-1.384l-.364-.216-3.767.988 1.006-3.665-.236-.377A9.952 9.952 0 0 1 2 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10z"/>
  </svg>
);

function ConnectingSplash({ advisor, onStart, isLoading, hasError, onRetry }) {
  if (hasError) return <ConnectionError onRetry={onRetry} />;

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-8" style={{ background: "#E5DDD5" }}>
      <div className="mb-5 relative">
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg mx-auto bg-[#25D366]/20">
          <img
            src={advisor.photo}
            alt={advisor.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        </div>
        <div className="absolute bottom-1 right-1 w-5 h-5 bg-[#25D366] rounded-full border-2 border-white" />
      </div>

      <p className="text-[#111B21] font-bold text-xl leading-tight">{advisor.name}</p>
      <p className="text-[#8696A0] text-[13px] mb-1">Asesora · Esteticar Manizales</p>
      <p className="text-[#25D366] text-[12px] font-semibold mb-6">● En línea ahora</p>

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onStart}
        disabled={isLoading}
        className="px-8 py-3.5 rounded-full font-semibold text-[14px] text-white shadow-lg disabled:opacity-80 flex items-center gap-2.5"
        style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)" }}
      >
        {isLoading ? (
          <>
            <WhatsAppIcon />
            Vinculando con asesora...
          </>
        ) : (
          <>
            <WhatsAppIcon />
            Chatear con {advisor.name}
          </>
        )}
      </motion.button>

      <p className="text-[#8696A0] text-[10px] mt-5">
        🔒 Cifrado de extremo a extremo
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
  const [photoOpen, setPhotoOpen] = useState(false);
  const [vpStyle, setVpStyle] = useState({});
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const startedRef = useRef(false); // ← FIX: evita doble llamada

  // ── Visual viewport fix para iOS (teclado) ───────────────────
  useEffect(() => {
    if (!chatStarted) { setVpStyle({}); return; }
    const update = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      setVpStyle({ top: `${vv.offsetTop}px`, height: `${vv.height}px` });
    };
    update();
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, [chatStarted]);

  // ── Scroll to bottom ──────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Lock body scroll (fix iOS keyboard scroll) ───────────────
  useEffect(() => {
    if (!isOpen) return;

    const preventScroll = (e) => {
      if (!e.target.closest('.chat-scrollable')) {
        e.preventDefault();
      }
    };

    // Fix iOS: position:fixed en el body evita que Safari scrollee la página
    // cuando el teclado abre, lo que empujaría el header fuera de pantalla
    const scrollY = window.scrollY;
    document.body.style.setProperty('overflow', 'hidden', 'important');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
      document.removeEventListener('touchmove', preventScroll);
    };
  }, [isOpen, adminMode]);

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
        content: `${getGreeting()}, ¿cómo estás? 😊 Hablas con **${advisor.name}** de Esteticar. Cuéntame por favor, ¿buscas algún servicio en particular o prefieres que te vaya haciendo preguntas y me cuentes cómo está tu vehículo?`,
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
      onClose();
      window.dispatchEvent(new Event('open-admin'));
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
        setTimeout(() => rej(new Error("timeout")), 55000) // 55s — incluye delay orgánico
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
  // Admin panel ahora se abre desde App.jsx via evento

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[140] bg-black/25"
            onClick={onClose}
            style={{ touchAction: "none" }}
          />

          {/* Chat window */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={`fixed z-[150] flex flex-col overflow-hidden shadow-2xl bg-white ${chatStarted
              ? "left-0 right-0 w-full rounded-none sm:top-auto sm:left-auto sm:bottom-6 sm:right-6 sm:w-[370px] sm:rounded-[10px]"
              : "bottom-20 right-4 w-[calc(100vw-2rem)] h-[72vh] max-h-[620px] rounded-[10px] sm:bottom-6 sm:right-6 sm:w-[370px]"
              }`}
            style={{
              fontFamily: "'Segoe UI', 'Helvetica Neue', Helvetica, sans-serif",
              ...(chatStarted ? vpStyle : {}),
            }}
          >
            {/* Header — siempre visible, ancla la foto de la asesora */}
            <div className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0" style={{ background: "#128C7E" }}>
              <button
                onClick={() => setPhotoOpen(true)}
                className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-white/30 bg-[#25D366]/30 focus:outline-none active:opacity-80"
              >
                <img
                  src={advisor.photo}
                  alt={advisor.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-[15px] leading-tight">{advisor.name}</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                  <p className="text-white/75 text-[12px]">
                    {chatStarted ? "En línea · Asesora Esteticar" : "Asesora Esteticar"}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-white/80 transition-colors text-2xl leading-none font-light p-1 ml-2"
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Modal foto ampliada */}
            <AnimatePresence>
              {photoOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80"
                  onClick={() => setPhotoOpen(false)}
                >
                  <motion.div
                    initial={{ scale: 0.85 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.85 }}
                    className="relative flex flex-col items-center gap-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-52 h-52 rounded-full overflow-hidden border-4 border-white shadow-2xl">
                      <img src={advisor.photo} alt={advisor.name} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-white font-semibold text-lg">{advisor.name}</p>
                    <p className="text-white/60 text-sm">Asesora Esteticar · Manizales</p>
                    <button
                      onClick={() => setPhotoOpen(false)}
                      className="mt-2 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-light hover:bg-white/30 transition-colors"
                    >
                      ✕
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Body */}
            <div
              className="flex-1 overflow-y-auto flex flex-col min-h-0 relative"
              style={{
                backgroundColor: "#efeae2",
                backgroundImage: `url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")`,
                backgroundRepeat: "repeat",
                backgroundSize: "400px",
                backgroundBlendMode: "overlay",
              }}
            >
              <div className="absolute inset-0 bg-white/20 pointer-events-none" />
              <div className="relative z-10 flex-1 flex flex-col min-h-0">
                {!chatStarted ? (
                  <ConnectingSplash
                    advisor={advisor}
                    onStart={() => startChat(false)}
                    isLoading={splashLoading}
                    hasError={connectionError}
                    onRetry={() => startChat(true)}
                  />
                ) : (
                  <div className="chat-scrollable flex-1 py-3 space-y-2 overflow-y-auto overscroll-none touch-pan-y px-3">
                    {messages.map((m, i) => (
                      <MessageBubble key={`${m.timestamp}-${i}`} message={m} />
                    ))}

                    {loading && <TypingIndicator name={advisor.name} />}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </div>

            {/* Input bar */}
            {chatStarted && (
              <div
                className="flex items-end gap-2 px-2 py-2 flex-shrink-0"
                style={{ background: "#F0F2F5" }}
              >
                <div className="flex-1 flex items-end gap-2 bg-white rounded-[24px] px-4 py-1.5 shadow-sm border border-transparent">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Mensaje"
                    disabled={loading}
                    className="flex-1 text-[16px] text-[#111B21] outline-none bg-transparent placeholder:text-[#8696A0] disabled:opacity-60 resize-none py-1 focus:ring-0 focus:outline-none"
                    maxLength={500}
                    rows={1}
                    style={{ minHeight: "28px" }}
                  />
                </div>
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="w-10 h-10 rounded-full flex shrink-0 items-center justify-center transition-all duration-200 disabled:opacity-40 active:scale-95 shadow-sm mb-[2px]"
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
