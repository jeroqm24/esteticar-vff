import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const CONFIG_KEY = "default";

async function loadConfig() {
  try {
    const { data } = await supabase
      .from("bot_config")
      .select("value")
      .eq("key", CONFIG_KEY)
      .single();
    return data ? JSON.parse(data.value || "{}") : {};
  } catch { return {}; }
}

async function saveConfig(updates) {
  try {
    const current = await loadConfig();
    const merged = { ...current, ...updates };
    await supabase.from("bot_config").upsert({ key: CONFIG_KEY, value: JSON.stringify(merged) });
    return merged;
  } catch { return {}; }
}

function Toggle({ active, onChange }) {
  return (
    <button
      onClick={() => onChange(!active)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-300 flex-shrink-0 ${active ? "bg-ec-gold" : "bg-black/10"}`}
    >
      <motion.div
        animate={{ x: active ? 20 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
      />
    </button>
  );
}

export default function AdminConfig() {
  const [team, setTeam] = useState([]);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig().then(cfg => {
      setTeam(cfg.pickup_team || []);
      setLoading(false);
    });
  }, []);

  const persist = async (newTeam) => {
    setSaving(true);
    await saveConfig({ pickup_team: newTeam });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    if (team.find(m => m.name.toLowerCase() === name.toLowerCase())) return;
    const updated = [...team, { name, active: true }];
    setTeam(updated);
    setNewName("");
    persist(updated);
  };

  const handleToggle = (idx) => {
    const updated = team.map((m, i) => i === idx ? { ...m, active: !m.active } : m);
    setTeam(updated);
    persist(updated);
  };

  const handleDelete = (idx) => {
    const updated = team.filter((_, i) => i !== idx);
    setTeam(updated);
    persist(updated);
  };

  const activeNames = team.filter(m => m.active).map(m => m.name);

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="font-heading text-2xl font-light text-ec-dark">Configuración</h2>
        <p className="font-body text-sm text-ec-text-muted mt-1">Ajustes operativos del negocio</p>
      </div>

      {/* Equipo de traslados */}
      <div className="bg-white border border-black/[0.06] rounded-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between">
          <div>
            <h3 className="font-ui text-[11px] tracking-[0.3em] uppercase text-ec-dark font-semibold">Equipo de traslados</h3>
            <p className="font-body text-xs text-ec-text-muted mt-0.5">
              Los nombres activos aparecen en el recordatorio de cita enviado por WhatsApp
            </p>
          </div>
          <AnimatePresence>
            {saving && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="w-4 h-4 border-2 border-ec-gold border-t-transparent rounded-full animate-spin" />
            )}
            {saved && !saving && (
              <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="font-ui text-[10px] text-emerald-600 tracking-widest uppercase">
                Guardado
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 space-y-4">
          {/* Preview del mensaje */}
          {activeNames.length > 0 && (
            <div className="bg-[#DCF8C6] rounded-2xl rounded-tl-sm px-4 py-3 text-[12px] text-[#111B21] leading-relaxed font-body">
              <p className="font-semibold text-[11px] text-[#8696A0] mb-1">Vista previa del recordatorio</p>
              Por tu vehículo irá alguna de estas personas con su carné de identificación, por favor verifica que sea alguno de ellos: <strong>{activeNames.join(", ")}</strong>
            </div>
          )}

          {/* Lista de empleados */}
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-ec-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : team.length === 0 ? (
            <div className="text-center py-8 text-ec-text-muted">
              <svg className="mx-auto mb-3 opacity-30" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
              <p className="font-body text-sm">Aún no hay empleados registrados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {team.map((member, idx) => (
                <motion.div
                  key={member.name}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-4 px-4 py-3 rounded-sm border transition-colors ${
                    member.active
                      ? "bg-ec-gold/[0.04] border-ec-gold/20"
                      : "bg-black/[0.02] border-black/[0.04]"
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-heading text-sm flex-shrink-0 ${
                    member.active ? "bg-ec-gold/20 text-ec-gold" : "bg-black/[0.06] text-ec-text-muted"
                  }`}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Nombre */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-ui text-[12px] font-semibold truncate ${member.active ? "text-ec-dark" : "text-ec-text-muted"}`}>
                      {member.name}
                    </p>
                    <p className="font-body text-[10px] text-ec-text-muted">
                      {member.active ? "Disponible esta semana" : "No disponible"}
                    </p>
                  </div>

                  {/* Toggle */}
                  <Toggle active={member.active} onChange={() => handleToggle(idx)} />

                  {/* Eliminar */}
                  <button
                    onClick={() => handleDelete(idx)}
                    className="w-7 h-7 flex items-center justify-center text-red-300 hover:text-red-500 transition-colors rounded-sm hover:bg-red-50"
                    title="Eliminar"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                    </svg>
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          {/* Agregar nuevo */}
          <div className="flex gap-2 pt-2">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder="Nombre del empleado"
              className="flex-1 px-4 py-2.5 border border-black/[0.1] rounded-sm font-body text-sm bg-ec-cream focus:border-ec-gold focus:outline-none"
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="px-5 py-2.5 rounded-sm font-ui text-[11px] tracking-widest uppercase text-white transition-all disabled:opacity-40"
              style={{ background: newName.trim() ? "#B8860B" : "#ccc" }}
            >
              Agregar
            </button>
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 pt-1 px-1">
            <svg className="flex-shrink-0 mt-0.5 text-ec-text-muted" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="font-body text-[11px] text-ec-text-muted leading-relaxed">
              Activa solo los empleados disponibles esa semana. El recordatorio automático los incluirá al cliente el día antes de su cita.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
