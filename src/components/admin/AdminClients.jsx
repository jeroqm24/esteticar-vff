import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";

// ─── Configuración de perfiles ────────────────────────────────────
const LEAD_PROFILES = {
  regateador: {
    emoji: "🫰", label: "El Regateador", color: "#dc2626",
    bg: "rgba(220,38,38,0.07)", border: "rgba(220,38,38,0.2)",
    remarketingDays: 3,
    message: (name) => `Hola ${name || ""}👋 Te saluda Sara de Esteticar. Tenemos una *Lavada Esencial* en $49.000 que deja el carro impecable, y esta semana hay espacio disponible. A qué hora te queda bien?`,
  },
  analista: {
    emoji: "📚", label: "El Analista", color: "#7c3aed",
    bg: "rgba(124,58,237,0.07)", border: "rgba(124,58,237,0.2)",
    remarketingDays: 5,
    message: (name) => `Hola ${name || ""}, soy Sara de Esteticar. Quería contarte que el *Tratamiento 3 en 1* que mencionamos incluye lavada, descontaminación y brillado profesional. El resultado sorprende. Tenemos disponibilidad esta semana. A qué hora te queda bien?`,
  },
  embalado: {
    emoji: "⚡", label: "El Embalado", color: "#d97706",
    bg: "rgba(217,119,6,0.07)", border: "rgba(217,119,6,0.2)",
    remarketingDays: 1,
    message: (name) => `Hola ${name || ""}, soy Sara de Esteticar. Sé que necesitabas solución para tu carro. Tenemos espacio esta semana y te podemos atender rápido. A qué hora te queda bien?`,
  },
  billetudo: {
    emoji: "💸", label: "El Billetudo", color: "#B8860B",
    bg: "rgba(184,134,11,0.07)", border: "rgba(184,134,11,0.25)",
    remarketingDays: 7,
    message: (name) => `Hola ${name || ""}, soy Sara de Esteticar. Para un vehículo como el tuyo el *Recubrimiento Cerámico* es la inversión que marca la diferencia: protección de 5 años, brillo de concesionario. Esta semana tenemos agenda para una visita de diagnóstico sin costo. Te interesa?`,
  },
};

const STATUS_CONFIG = {
  potencial:      { label: "Potencial",     bg: "rgba(59,130,246,0.08)",  color: "#2563eb", border: "rgba(59,130,246,0.25)" },
  efectivo:       { label: "Efectivo",      bg: "rgba(34,197,94,0.08)",   color: "#16a34a", border: "rgba(34,197,94,0.25)" },
  desinteresado:  { label: "Desinteresado", bg: "rgba(239,68,68,0.08)",   color: "#dc2626", border: "rgba(239,68,68,0.25)" },
  otro:           { label: "Otro",          bg: "rgba(107,114,128,0.08)", color: "#6b7280", border: "rgba(107,114,128,0.25)" },
  // aliases legacy por si hay registros viejos en Supabase
  active:    { label: "Potencial",     bg: "rgba(59,130,246,0.08)",  color: "#2563eb", border: "rgba(59,130,246,0.25)" },
  converted: { label: "Efectivo",      bg: "rgba(34,197,94,0.08)",   color: "#16a34a", border: "rgba(34,197,94,0.25)" },
  lost:      { label: "Desinteresado", bg: "rgba(239,68,68,0.08)",   color: "#dc2626", border: "rgba(239,68,68,0.25)" },
};

// ─── Helpers ──────────────────────────────────────────────────────
const daysSince = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return Math.floor((Date.now() - d) / 86400000);
};

const shouldSendRemarketing = (client) => {
  if (!client.leadType || ['desinteresado', 'lost', 'efectivo', 'converted', 'otro'].includes(client.remarketingStatus)) return false;
  const profile = LEAD_PROFILES[client.leadType];
  if (!profile) return false;
  const days = daysSince(client.lastRemarketingAt || client.updatedAt);
  return days !== null && days >= profile.remarketingDays;
};

function Badge({ type, label, bg, color, border }) {
  return (
    <span className="font-ui text-[9px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-sm whitespace-nowrap"
      style={{ background: bg, color, border: `1px solid ${border}` }}>
      {type} {label}
    </span>
  );
}

function CopyBtn({ text, label = "Copiar" }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy}
      className="px-3 py-1.5 font-ui text-[9px] tracking-[0.15em] uppercase border border-black/[0.1] rounded-sm hover:border-ec-gold hover:text-ec-gold transition-all duration-200">
      {copied ? "Copiado ✓" : label}
    </button>
  );
}

// ─── Card de cliente (estilo "reunión de Teams") ──────────────────
function ClientCard({ client, apptCount, isSelected, onClick }) {
  const profile = LEAD_PROFILES[client.leadType];
  const status  = STATUS_CONFIG[client.remarketingStatus] || STATUS_CONFIG.active;
  const lastDays = daysSince(client.lastVisitDate || client.updatedAt);
  const needsRemarketing = shouldSendRemarketing(client);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`cursor-pointer p-5 border rounded-sm transition-all duration-200 ${
        isSelected
          ? "bg-ec-gold/[0.04] border-ec-gold shadow-[0_4px_20px_rgba(184,134,11,0.1)]"
          : "bg-white border-black/[0.06] hover:border-ec-gold/25"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-heading text-base text-ec-dark truncate">{client.name || "Sin nombre"}</p>
          <p className="font-body text-xs text-ec-text-muted mt-0.5">{client.phone}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {profile && (
            <span className="font-ui text-[10px] px-2 py-0.5 rounded-sm"
              style={{ background: profile.bg, color: profile.color, border: `1px solid ${profile.border}` }}>
              {profile.emoji} {profile.label}
            </span>
          )}
          <span className="font-ui text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 rounded-sm"
            style={{ background: status.bg, color: status.color, border: `1px solid ${status.border}` }}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Info row */}
      <div className="flex flex-wrap gap-3 text-xs font-body text-ec-text-muted border-t border-black/[0.04] pt-3">
        {client.vehiclePlate && (
          <span className="font-ui tracking-widest bg-ec-cream border border-black/[0.08] px-2 py-0.5 rounded-sm text-ec-dark text-[10px]">
            {client.vehiclePlate.toUpperCase()}
          </span>
        )}
        {client.lastService && (
          <span className="truncate max-w-[160px]">{client.lastService}</span>
        )}
        {lastDays !== null && (
          <span className={`ml-auto font-ui text-[9px] ${lastDays > 30 ? "text-red-400" : lastDays > 14 ? "text-amber-500" : "text-green-600"}`}>
            hace {lastDays}d
          </span>
        )}
      </div>

      {/* Sin nombre aún */}
      {!client.name && (
        <div className="mt-2.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-sm flex items-center gap-2">
          <span className="font-ui text-[9px] text-gray-400 tracking-[0.1em] uppercase">
            Nombre pendiente · Solo tenemos el teléfono
          </span>
        </div>
      )}

      {/* Atención manual activa */}
      {client.botPaused && (
        <div className="mt-2.5 px-3 py-2 bg-orange-50 border border-orange-200 rounded-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse flex-shrink-0" />
          <p className="font-ui text-[9px] text-orange-700 tracking-[0.1em] uppercase">
            Sara está atendiendo manualmente
          </p>
        </div>
      )}

      {/* Remarketing alert */}
      {needsRemarketing && (
        <div className="mt-2.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-sm">
          <p className="font-ui text-[9px] text-amber-700 tracking-[0.1em] uppercase">
            Remarketar ahora · {LEAD_PROFILES[client.leadType]?.remarketingDays}d sin contacto
          </p>
        </div>
      )}

      {/* Objeción */}
      {client.objection && (
        <div className="mt-2 px-3 py-1.5 bg-red-50 border border-red-100 rounded-sm">
          <p className="font-ui text-[9px] text-red-500 tracking-[0.1em] uppercase">
            Objeción: {client.objection}
          </p>
        </div>
      )}

      {/* Total citas */}
      {apptCount > 0 && (
        <div className="mt-2 text-right">
          <span className="font-ui text-[9px] text-ec-gold tracking-wider">{apptCount} cita{apptCount !== 1 ? "s" : ""}</span>
        </div>
      )}
    </motion.div>
  );
}

const FIELD_OPTIONS = [
  "Año del vehículo", "Color del vehículo", "Kilometraje", "Problema a resolver",
  "Presupuesto aproximado", "Tipo de uso (personal/trabajo)", "Fecha de compra del vehículo",
  "Observaciones especiales", "Personalizado...",
];

// ─── Panel de detalle ─────────────────────────────────────────────
function ClientDetail({ client, apptCount, onClose, onUpdateStatus, onRemarketing, onDelete, onToggleBot, onUpdateCustomFields }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addingField,    setAddingField]   = useState(false);
  const [fieldTitle,     setFieldTitle]    = useState('');
  const [fieldValue,     setFieldValue]    = useState('');
  const [fieldBotAsk,    setFieldBotAsk]   = useState(false);
  const [customTitle,    setCustomTitle]   = useState('');

  const isCustom = fieldTitle === 'Personalizado...';
  const fields   = client.customFields || [];

  const saveField = () => {
    const title = isCustom ? customTitle.trim() : fieldTitle;
    if (!title) return;
    const updated = [...fields, { id: Math.random().toString(36).slice(2, 9), title, value: fieldValue.trim(), botShouldAsk: fieldBotAsk }];
    onUpdateCustomFields(client.phone, updated);
    setAddingField(false); setFieldTitle(''); setFieldValue(''); setFieldBotAsk(false); setCustomTitle('');
  };

  const toggleBotAsk = (id) =>
    onUpdateCustomFields(client.phone, fields.map(f => f.id === id ? { ...f, botShouldAsk: !f.botShouldAsk } : f));

  const deleteField = (id) =>
    onUpdateCustomFields(client.phone, fields.filter(f => f.id !== id));
  const profile = LEAD_PROFILES[client.leadType];
  const status  = STATUS_CONFIG[client.remarketingStatus] || STATUS_CONFIG.active;
  const lastDays = daysSince(client.lastVisitDate || client.updatedAt);
  const remarketingMsg = profile?.message(client.name) || '';
  const waLink = `https://wa.me/57${client.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(remarketingMsg)}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="border border-black/[0.06] bg-white rounded-t-2xl lg:rounded-sm shadow-[0_-4px_40px_rgba(0,0,0,0.12)] lg:shadow-[0_8px_40px_rgba(0,0,0,0.08)] lg:sticky lg:top-28 overflow-hidden"
    >
      {/* Drag handle — móvil only */}
      <div className="lg:hidden flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 bg-black/[0.12] rounded-full" />
      </div>
      {/* Header */}
      <div className="p-6 border-b border-black/[0.06]">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-heading text-2xl text-ec-dark">{client.name || "Sin nombre"}</h3>
            {profile && (
              <span className="mt-1.5 inline-block font-ui text-xs px-3 py-1 rounded-sm"
                style={{ background: profile.bg, color: profile.color, border: `1px solid ${profile.border}` }}>
                {profile.emoji} {profile.label}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-black/20 hover:text-ec-dark transition-colors">✕</button>
        </div>
      </div>

      <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
        {/* Datos */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Teléfono",        value: client.phone },
            { label: "Correo",          value: client.email || "—" },
            { label: "Placa",           value: client.vehiclePlate?.toUpperCase() || "—" },
            { label: "Vehículo",        value: client.vehicleType === "car" ? "Carro" : client.vehicleType === "moto" ? "Moto" : (client.vehicleType || "—") },
            { label: "Último servicio", value: client.lastService || "—" },
            { label: "Total citas",     value: apptCount || 0 },
            { label: "Último contacto", value: lastDays !== null ? `hace ${lastDays} días` : "—" },
            { label: "Estado",          value: status.label },
            ...(client.direccion ? [{ label: "Dirección traslado", value: client.direccion }] : []),
          ].map((item) => (
            <div key={item.label}>
              <p className="font-ui text-[9px] tracking-[0.2em] text-ec-text-muted uppercase mb-0.5">{item.label}</p>
              <p className="font-body text-sm text-ec-dark break-all">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Objeción */}
        {client.objection && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-sm">
            <p className="font-ui text-[9px] tracking-[0.2em] text-red-400 uppercase mb-1">Por qué no compró</p>
            <p className="font-body text-sm text-red-600">{client.objection}</p>
          </div>
        )}

        {/* Mensaje de remarketing */}
        {profile && client.remarketingStatus !== 'lost' && (
          <div className="space-y-3">
            <p className="font-ui text-[9px] tracking-[0.2em] text-ec-text-muted uppercase">
              Mensaje de remarketing ({profile.emoji} {profile.label} · cada {profile.remarketingDays}d)
            </p>
            <div className="p-3 bg-ec-cream/60 border border-black/[0.06] rounded-sm">
              <p className="font-body text-xs text-ec-text-secondary leading-relaxed">{remarketingMsg}</p>
            </div>
            <div className="flex gap-2">
              <CopyBtn text={remarketingMsg} label="Copiar mensaje" />
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 font-ui text-[9px] tracking-[0.15em] uppercase text-white rounded-sm transition-all"
                style={{ background: "linear-gradient(135deg,#25D366,#128C7E)" }}
                onClick={() => onRemarketing(client.phone)}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a9.09 9.09 0 01-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.116.553 4.103 1.523 5.828L.057 23.857a.5.5 0 00.636.607l6.218-1.63A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.953 9.953 0 01-5.077-1.384l-.364-.216-3.767.988 1.006-3.665-.236-.377A9.952 9.952 0 012 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10z"/>
                </svg>
                Enviar por WhatsApp
              </a>
            </div>
          </div>
        )}

        {/* Control del bot */}
        <div className="pt-2 border-t border-black/[0.06]">
          {client.botPaused ? (
            <div className="space-y-2">
              <div className="px-4 py-3 bg-orange-50 border border-orange-200 rounded-sm flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse flex-shrink-0" />
                <div>
                  <p className="font-ui text-[10px] tracking-[0.15em] text-orange-700 uppercase font-bold">Bot pausado</p>
                  <p className="font-body text-xs text-orange-600 mt-0.5">Sara está atendiendo manualmente a este cliente.</p>
                </div>
              </div>
              <button
                onClick={() => onToggleBot(client.phone, false)}
                className="w-full py-3 font-ui text-[10px] tracking-[0.2em] uppercase bg-ec-gold text-white hover:bg-[#e6b800] rounded-sm transition-all flex items-center justify-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Reactivar bot (Sara)
              </button>
            </div>
          ) : (
            <button
              onClick={() => onToggleBot(client.phone, true)}
              className="w-full py-3 font-ui text-[10px] tracking-[0.2em] uppercase border border-orange-200 text-orange-500 hover:bg-orange-50 rounded-sm transition-all flex items-center justify-center gap-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
              </svg>
              Pausar bot manualmente
            </button>
          )}
        </div>

        {/* Campos personalizados */}
        <div className="pt-2 border-t border-black/[0.06] space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-ui text-[9px] tracking-[0.2em] text-ec-text-muted uppercase">Campos personalizados</p>
            {!addingField && (
              <button onClick={() => setAddingField(true)}
                className="font-ui text-[9px] tracking-[0.15em] uppercase px-2.5 py-1 border border-ec-gold/30 text-ec-gold hover:bg-ec-gold hover:text-white rounded-sm transition-all">
                + Añadir
              </button>
            )}
          </div>

          {fields.length === 0 && !addingField && (
            <p className="font-body text-xs text-ec-text-muted italic">Sin campos. Añade datos adicionales y configura qué debe preguntar el bot.</p>
          )}

          {fields.map(f => (
            <div key={f.id} className="flex items-start gap-2 p-2.5 bg-ec-cream/40 border border-black/[0.06] rounded-sm">
              <div className="flex-1 min-w-0">
                <p className="font-ui text-[8px] tracking-[0.15em] uppercase text-ec-text-muted">{f.title}</p>
                <p className="font-body text-sm text-ec-dark mt-0.5 break-words">{f.value || <span className="text-black/30 italic text-xs">Sin valor</span>}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                <button onClick={() => toggleBotAsk(f.id)}
                  className={`px-2 py-1 font-ui text-[8px] tracking-[0.1em] uppercase rounded-sm border transition-all whitespace-nowrap ${
                    f.botShouldAsk ? 'bg-ec-gold text-white border-ec-gold' : 'border-black/[0.1] text-ec-text-muted hover:border-ec-gold/30 hover:text-ec-gold'
                  }`}>
                  {f.botShouldAsk ? 'Bot pregunta ✓' : 'Bot pregunta'}
                </button>
                <button onClick={() => deleteField(f.id)} className="text-black/20 hover:text-red-400 transition-colors text-sm leading-none">✕</button>
              </div>
            </div>
          ))}

          {addingField && (
            <div className="p-3 bg-white border border-ec-gold/20 rounded-sm space-y-2">
              <select value={fieldTitle} onChange={e => setFieldTitle(e.target.value)}
                className="w-full px-3 py-2 border border-black/[0.1] rounded-sm font-body text-sm bg-white focus:border-ec-gold focus:outline-none"
                style={{ fontSize: '16px' }}>
                <option value="">Seleccionar campo...</option>
                {FIELD_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {isCustom && (
                <input value={customTitle} onChange={e => setCustomTitle(e.target.value)}
                  placeholder="Nombre del campo..."
                  className="w-full px-3 py-2 border border-black/[0.1] rounded-sm font-body text-sm focus:border-ec-gold focus:outline-none"
                  style={{ fontSize: '16px' }} />
              )}
              <input value={fieldValue} onChange={e => setFieldValue(e.target.value)}
                placeholder="Valor (opcional — el bot puede preguntarlo)"
                className="w-full px-3 py-2 border border-black/[0.1] rounded-sm font-body text-sm focus:border-ec-gold focus:outline-none"
                style={{ fontSize: '16px' }} />
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={fieldBotAsk} onChange={e => setFieldBotAsk(e.target.checked)}
                  className="accent-ec-gold w-4 h-4" />
                <span className="font-ui text-[9px] tracking-[0.1em] uppercase text-ec-text-muted">Bot debe preguntar este dato</span>
              </label>
              <div className="flex gap-2 pt-1">
                <button onClick={saveField}
                  className="flex-1 py-2 font-ui text-[9px] tracking-[0.15em] uppercase bg-ec-gold text-white hover:bg-[#e6b800] rounded-sm transition-all">
                  Guardar
                </button>
                <button onClick={() => { setAddingField(false); setFieldTitle(''); setFieldValue(''); setFieldBotAsk(false); setCustomTitle(''); }}
                  className="flex-1 py-2 font-ui text-[9px] tracking-[0.15em] uppercase border border-black/[0.1] text-ec-text-muted hover:bg-ec-cream rounded-sm transition-all">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Acciones de estado */}
        <div className="space-y-2 pt-2 border-t border-black/[0.06]">
          <p className="font-ui text-[9px] tracking-[0.2em] uppercase text-ec-text-muted mb-1">Cambiar estado manualmente</p>
          <div className="grid grid-cols-3 gap-1.5">
            {['potencial', 'efectivo', 'desinteresado'].map(s => {
              const cfg = STATUS_CONFIG[s];
              const isActive = client.remarketingStatus === s || (s === 'potencial' && client.remarketingStatus === 'active') || (s === 'efectivo' && client.remarketingStatus === 'converted') || (s === 'desinteresado' && client.remarketingStatus === 'lost');
              return (
                <button key={s}
                  onClick={() => !isActive && onUpdateStatus(client.phone, s)}
                  disabled={isActive}
                  className="py-2 font-ui text-[9px] tracking-[0.1em] uppercase rounded-sm transition-all disabled:cursor-default"
                  style={{
                    background: isActive ? cfg.bg : 'transparent',
                    color: isActive ? cfg.color : '#9CA3AF',
                    border: `1px solid ${isActive ? cfg.border : 'rgba(0,0,0,0.08)'}`,
                  }}>
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full py-3 font-ui text-[10px] tracking-[0.2em] uppercase border border-red-200 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 rounded-sm transition-all flex items-center justify-center gap-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
              Eliminar cliente
            </button>
          ) : (
            <div className="p-3 bg-red-50 border border-red-200 rounded-sm space-y-2">
              <p className="font-ui text-[9px] tracking-[0.15em] text-red-600 uppercase text-center">¿Confirmar eliminación?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-2 font-ui text-[9px] tracking-[0.15em] uppercase border border-black/[0.1] text-ec-text-muted hover:bg-ec-cream rounded-sm transition-all">
                  Cancelar
                </button>
                <button
                  onClick={() => onDelete(client.phone)}
                  className="flex-1 py-2 font-ui text-[9px] tracking-[0.15em] uppercase bg-red-500 text-white hover:bg-red-600 rounded-sm transition-all">
                  Sí, eliminar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Componente principal ─────────────────────────────────────────
export default function AdminClients() {
  const [clients, setClients]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState("all");
  const [selected, setSelected]   = useState(null);
  const [apptCounts, setApptCounts] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);

  const load = useCallback(async () => {
    try {
      const [{ data: convs }, { data: webClients }, { data: appts }] = await Promise.all([
        supabase.from("conversations").select("*").order("updated_at", { ascending: false }),
        supabase.from("clients").select("*").order("updated", { ascending: false }),
        supabase.from("appointments").select("client_phone, status"),
      ]);

      const counts = {};
      for (const a of appts || []) {
        if (!a.client_phone) continue;
        counts[a.client_phone] = (counts[a.client_phone] || 0) + 1;
      }
      setApptCounts(counts);

      const map = new Map();
      for (const c of webClients || []) {
        if (!c.phone) continue;
        map.set(c.phone, {
          phone: c.phone, name: c.name, email: null,
          lastService: c.last_service, lastDate: c.last_date,
          vehiclePlate: null, vehicleType: null,
          channel: "web", updatedAt: c.updated,
          leadType: null, objection: null,
          remarketingStatus: 'active', lastVisitDate: null,
        });
      }
      for (const c of convs || []) {
        if (!c.phone) continue;
        const existing = map.get(c.phone);
        map.set(c.phone, {
          phone: c.phone,
          name:            c.client_name   || existing?.name,
          email:           c.client_email  || existing?.email,
          lastService:     c.last_service  || existing?.lastService,
          vehiclePlate:    c.vehicle_plate || existing?.vehiclePlate,
          vehicleType:     c.vehicle_type  || existing?.vehicleType,
          channel:         "whatsapp",
          updatedAt:       c.updated_at    || existing?.updatedAt,
          leadType:        c.lead_type     || existing?.leadType     || null,
          objection:       c.objection     || existing?.objection    || null,
          remarketingStatus: c.remarketing_status || existing?.remarketingStatus || 'active',
          lastVisitDate:      c.last_visit_date     || existing?.lastVisitDate     || null,
          lastRemarketingAt:  c.last_remarketing_at || existing?.lastRemarketingAt || null,
          remarketingCount:   c.remarketing_count   || existing?.remarketingCount  || 0,
          botPaused:          c.bot_paused          || false,
          direccion:          c.direccion           || existing?.direccion         || null,
          customFields:       c.custom_fields       || existing?.customFields      || [],
        });
      }

      setClients(Array.from(map.values()));
      setLastUpdate(new Date());
      if (loading) setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // actualiza cada 30s
    return () => clearInterval(interval);
  }, [load]);

  const deleteClient = async (phone) => {
    await fetch('/api/conversations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': 'Esteticar11.' },
      body: JSON.stringify({ phone }),
    });
    setClients(prev => prev.filter(c => c.phone !== phone));
    if (selected?.phone === phone) setSelected(null);
  };

  const updateStatus = async (phone, status) => {
    await supabase.from('conversations').upsert({ phone, remarketing_status: status, updated_at: new Date().toISOString() }, { onConflict: 'phone' });
    setClients(prev => prev.map(c => c.phone === phone ? { ...c, remarketingStatus: status } : c));
    if (selected?.phone === phone) setSelected(prev => ({ ...prev, remarketingStatus: status }));
  };

  const setBotPaused = async (phone, paused) => {
    await supabase.from('conversations').upsert(
      { phone, bot_paused: paused, updated_at: new Date().toISOString() },
      { onConflict: 'phone' }
    );
    setClients(prev => prev.map(c => c.phone === phone ? { ...c, botPaused: paused } : c));
    if (selected?.phone === phone) setSelected(prev => ({ ...prev, botPaused: paused }));
  };

  const updateCustomFields = async (phone, fields) => {
    await supabase.from('conversations').upsert(
      { phone, custom_fields: fields, updated_at: new Date().toISOString() },
      { onConflict: 'phone' }
    );
    setClients(prev => prev.map(c => c.phone === phone ? { ...c, customFields: fields } : c));
    if (selected?.phone === phone) setSelected(prev => ({ ...prev, customFields: fields }));
  };

  const markRemarketing = async (phone) => {
    const now = new Date().toISOString();
    await supabase.from('conversations').upsert({
      phone, last_remarketing_at: now,
      remarketing_count: (clients.find(c => c.phone === phone)?.remarketingCount || 0) + 1,
      updated_at: now,
    }, { onConflict: 'phone' });
  };

  // Filtros
  const FILTERS = [
    { id: "all",        label: "Todos" },
    { id: "manual",     label: "⚠️ Manual" },
    { id: "noname",     label: "❓ Sin nombre" },
    { id: "regateador", label: "🫰 Regateadores" },
    { id: "analista",   label: "📚 Analistas" },
    { id: "embalado",   label: "⚡ Embalados" },
    { id: "billetudo",  label: "💸 Billetudos" },
  ];

  const filtered = clients.filter(c => {
    if (filter === "manual")  return c.botPaused === true;
    if (filter === "noname")  return !c.name;
    if (filter !== "all")     return c.leadType === filter;
    const q = search.toLowerCase();
    if (!q) return true;
    return c.name?.toLowerCase().includes(q) || c.phone?.includes(q) ||
           c.email?.toLowerCase().includes(q) || c.vehiclePlate?.toLowerCase().includes(q) ||
           c.lastService?.toLowerCase().includes(q);
  }).filter(c => {
    if (filter !== "all") return true;
    const q = search.toLowerCase();
    if (!q) return true;
    return c.name?.toLowerCase().includes(q) || c.phone?.includes(q) ||
           c.email?.toLowerCase().includes(q) || c.vehiclePlate?.toLowerCase().includes(q);
  });

  const manualCount      = clients.filter(c => c.botPaused).length;
  const noNameCount      = clients.filter(c => !c.name).length;
  const leadCounts       = clients.reduce((acc, c) => { if (c.leadType) acc[c.leadType] = (acc[c.leadType] || 0) + 1; return acc; }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl text-ec-dark">Tabla Maestra de Clientes</h2>
          <p className="font-body text-sm text-ec-text-muted mt-1 font-light">
            {clients.length} clientes · {manualCount > 0 ? <span className="text-orange-500 font-medium">{manualCount} en atención manual · </span> : null}
            {lastUpdate ? `Actualizado hace ${Math.floor((Date.now() - lastUpdate) / 1000)}s` : 'Cargando...'}
          </p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, teléfono, placa..."
          className="w-full sm:w-64 px-4 py-2.5 border border-black/[0.1] rounded-sm font-body text-sm bg-white focus:border-ec-gold focus:outline-none"
          style={{ fontSize: '16px' }}
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => { setFilter(f.id); setSearch(""); }}
            className={`px-4 py-2 font-ui text-[10px] tracking-[0.15em] uppercase border rounded-sm transition-all duration-200 ${
              filter === f.id ? "bg-ec-gold text-white border-ec-gold" : "bg-white text-ec-text-muted border-black/[0.06] hover:border-ec-gold/30"
            }`}>
            {f.label}
            {f.id === "manual"     && manualCount > 0          && <span className="ml-1.5 bg-orange-500 text-white rounded-full text-[8px] px-1.5 py-0.5">{manualCount}</span>}
            {f.id === "noname"     && noNameCount > 0          && <span className="ml-1.5 bg-gray-400 text-white rounded-full text-[8px] px-1.5 py-0.5">{noNameCount}</span>}
            {!["all","manual","noname"].includes(f.id) && leadCounts[f.id] > 0 && <span className="ml-1.5 bg-ec-gold text-white rounded-full text-[8px] px-1.5 py-0.5">{leadCounts[f.id]}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-2 border-ec-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center border border-black/[0.06] bg-white rounded-sm">
          <p className="font-heading text-lg text-ec-dark mb-2">Sin resultados</p>
          <p className="font-body text-sm text-ec-text-muted font-light">Intenta con otro filtro o término de búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Lista de cards */}
          <div className="lg:col-span-2 space-y-3">
            <AnimatePresence>
              {filtered.map((c) => (
                <ClientCard
                  key={c.phone}
                  client={{ ...c, leadType: c.leadType, remarketingStatus: c.remarketingStatus }}
                  apptCount={apptCounts[c.phone] || 0}
                  isSelected={selected?.phone === c.phone}
                  onClick={() => setSelected(c)}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Panel de detalle */}
          <AnimatePresence>
            {selected && (
              <>
                {/* Backdrop móvil */}
                <motion.div
                  key="client-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                  onClick={() => setSelected(null)}
                />
                <div className="fixed lg:relative inset-x-0 bottom-0 lg:inset-auto z-50 lg:z-auto max-h-[90dvh] lg:max-h-none overflow-y-auto lg:overflow-visible">
                  <ClientDetail
                    client={selected}
                    apptCount={apptCounts[selected.phone] || 0}
                    onClose={() => setSelected(null)}
                    onUpdateStatus={updateStatus}
                    onRemarketing={markRemarketing}
                    onDelete={deleteClient}
                    onToggleBot={setBotPaused}
                    onUpdateCustomFields={updateCustomFields}
                  />
                </div>
              </>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
