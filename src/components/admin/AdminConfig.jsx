import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const CONFIG_KEY = "default";

const DEFAULT_SERVICES = [
  { name: "Recubrimiento Cerámico", price: "Bajo cotización · 2 días · protección 5 años", vehicle: "car" },
  { name: "Porcelanizado", price: "Bajo cotización · 2 días · protección 6m-1 año", vehicle: "car" },
  { name: "Tratamiento 3 en 1 a Máquina", price: "$350.000 (camioneta $360.000)", vehicle: "car" },
  { name: "Tratamiento 3 en 1 Manual", price: "$290.000 (camioneta $300.000)", vehicle: "car" },
  { name: "Mantenimiento del Interior", price: "$280.000", vehicle: "car" },
  { name: "Lavado de Cojinería", price: "$199.000", vehicle: "car" },
  { name: "Restauración de Farolas", price: "$180.000", vehicle: "car" },
  { name: "Descontaminación de Vidrios", price: "todos $250.000 · solo parabrisas $60.000", vehicle: "car" },
  { name: "Brillado a Máquina", price: "$100.000", vehicle: "car" },
  { name: "Lavado de Chasis", price: "$59.000", vehicle: "car" },
  { name: "Lavado de Techo y Parasoles", price: "$49.000", vehicle: "car" },
  { name: "Limpieza Técnica de Motor", price: "$49.000", vehicle: "car" },
  { name: "Lavada Esencial Carro", price: "$49.000", vehicle: "car" },
  { name: "Recubrimiento Cerámico", price: "Bajo cotización · protección 5 años", vehicle: "moto" },
  { name: "Porcelanizado", price: "Bajo cotización · protección 6m-1 año", vehicle: "moto" },
  { name: "Tratamiento 3 en 1 a Máquina", price: "$350.000", vehicle: "moto" },
  { name: "Tratamiento 3 en 1 Manual", price: "$290.000", vehicle: "moto" },
  { name: "Brillado de Tanque", price: "$59.000", vehicle: "moto" },
  { name: "Descontaminación de Tubería", price: "$49.000", vehicle: "moto" },
  { name: "Brillado de Farolas", price: "$49.000", vehicle: "moto" },
  { name: "Lavada Esencial Moto", price: "$49.000", vehicle: "moto" },
];

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

  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [portfolioServices, setPortfolioServices] = useState([]);
  const [newSvcName, setNewSvcName] = useState("");
  const [newSvcPrice, setNewSvcPrice] = useState("");
  const [newSvcVehicle, setNewSvcVehicle] = useState("car");
  const [savingPortfolio, setSavingPortfolio] = useState(false);
  const [savedPortfolio, setSavedPortfolio] = useState(false);

  useEffect(() => {
    loadConfig().then(cfg => {
      setTeam(cfg.pickup_team || []);
      setPortfolioUrl(cfg.portfolio_url || "");

      const raw = cfg.portfolio_services;
      if (!raw || raw.length === 0) {
        setPortfolioServices(DEFAULT_SERVICES);
      } else if (typeof raw[0] === "string") {
        // Migración: formato antiguo (solo nombres) → enriquecer con defaults donde coincida
        const migrated = raw.map(name => {
          const found = DEFAULT_SERVICES.find(d => d.name.toLowerCase() === name.toLowerCase());
          return found || { name, price: "A consultar", vehicle: "car" };
        });
        setPortfolioServices(migrated);
      } else {
        setPortfolioServices(raw);
      }
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

  const handleAddService = () => {
    const name = newSvcName.trim();
    const price = newSvcPrice.trim();
    if (!name || !price) return;
    setPortfolioServices(prev => [...prev, { name, price, vehicle: newSvcVehicle }]);
    setNewSvcName("");
    setNewSvcPrice("");
    setNewSvcVehicle("car");
  };

  const handleDeleteService = (idx) => {
    setPortfolioServices(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSavePortfolio = async () => {
    setSavingPortfolio(true);
    await saveConfig({ portfolio_url: portfolioUrl, portfolio_services: portfolioServices });
    setSavingPortfolio(false);
    setSavedPortfolio(true);
    setTimeout(() => setSavedPortfolio(false), 2000);
  };

  const carServices  = portfolioServices.filter(s => s.vehicle === "car");
  const motoServices = portfolioServices.filter(s => s.vehicle === "moto");

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
          {activeNames.length > 0 && (
            <div className="bg-[#DCF8C6] rounded-2xl rounded-tl-sm px-4 py-3 text-[12px] text-[#111B21] leading-relaxed font-body">
              <p className="font-semibold text-[11px] text-[#8696A0] mb-1">Vista previa del recordatorio</p>
              Por tu vehículo irá alguna de estas personas con su carné de identificación, por favor verifica que sea alguno de ellos: <strong>{activeNames.join(", ")}</strong>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-ec-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : team.length === 0 ? (
            <div className="text-center py-8 text-ec-text-muted">
              <p className="font-body text-sm">Aún no hay empleados registrados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {team.map((member, idx) => (
                <motion.div key={member.name} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-4 px-4 py-3 rounded-sm border transition-colors ${
                    member.active ? "bg-ec-gold/[0.04] border-ec-gold/20" : "bg-black/[0.02] border-black/[0.04]"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-heading text-sm flex-shrink-0 ${
                    member.active ? "bg-ec-gold/20 text-ec-gold" : "bg-black/[0.06] text-ec-text-muted"
                  }`}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-ui text-[12px] font-semibold truncate ${member.active ? "text-ec-dark" : "text-ec-text-muted"}`}>
                      {member.name}
                    </p>
                    <p className="font-body text-[10px] text-ec-text-muted">
                      {member.active ? "Disponible esta semana" : "No disponible"}
                    </p>
                  </div>
                  <Toggle active={member.active} onChange={() => handleToggle(idx)} />
                  <button onClick={() => handleDelete(idx)}
                    className="w-7 h-7 flex items-center justify-center text-red-300 hover:text-red-500 transition-colors rounded-sm hover:bg-red-50">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                    </svg>
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <input value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder="Nombre del empleado"
              className="flex-1 px-4 py-2.5 border border-black/[0.1] rounded-sm font-body text-sm bg-ec-cream focus:border-ec-gold focus:outline-none"
            />
            <button onClick={handleAdd} disabled={!newName.trim()}
              className="px-5 py-2.5 rounded-sm font-ui text-[11px] tracking-widest uppercase text-white transition-all disabled:opacity-40"
              style={{ background: newName.trim() ? "#B8860B" : "#ccc" }}>
              Agregar
            </button>
          </div>

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

      {/* Portafolio y servicios del bot */}
      <div className="bg-white border border-black/[0.06] rounded-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between">
          <div>
            <h3 className="font-ui text-[11px] tracking-[0.3em] uppercase text-ec-dark font-semibold">Portafolio y servicios</h3>
            <p className="font-body text-xs text-ec-text-muted mt-0.5">
              El bot usa esta lista en tiempo real. Cualquier cambio se refleja automáticamente.
            </p>
          </div>
          <AnimatePresence>
            {savingPortfolio && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="w-4 h-4 border-2 border-ec-gold border-t-transparent rounded-full animate-spin" />
            )}
            {savedPortfolio && !savingPortfolio && (
              <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="font-ui text-[10px] text-emerald-600 tracking-widest uppercase">
                Guardado
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 space-y-5">
          {/* URL del portafolio */}
          <div>
            <label className="font-ui text-[10px] tracking-[0.2em] uppercase text-ec-text-muted block mb-2">URL del flipbook (Heyzine)</label>
            <input value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)}
              placeholder="https://heyzine.com/flip-book/..."
              className="w-full px-4 py-2.5 border border-black/[0.1] rounded-sm font-body text-sm bg-ec-cream focus:border-ec-gold focus:outline-none"
            />
          </div>

          {/* Servicios — Carro */}
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-ec-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {[{ label: "Servicios — Carro", list: carServices, vehicle: "car" },
                { label: "Servicios — Moto",  list: motoServices, vehicle: "moto" }].map(({ label, list, vehicle: v }) => (
                <div key={v}>
                  <p className="font-ui text-[10px] tracking-[0.2em] uppercase text-ec-text-muted mb-2">{label}</p>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 mb-1">
                    {list.map((s, idx) => {
                      const globalIdx = portfolioServices.findIndex((x, i) => x === s || (x.name === s.name && x.vehicle === s.vehicle && portfolioServices.indexOf(x) === portfolioServices.filter((y, j) => j < i && y.name === s.name && y.vehicle === s.vehicle).length + portfolioServices.filter((y, j) => j <= portfolioServices.indexOf(x) - 1 && y.name === x.name && y.vehicle === x.vehicle).length));
                      const realIdx = portfolioServices.findIndex((x, i) => {
                        return x.vehicle === v && portfolioServices.filter((y, j) => j < i && y.vehicle === v).length === idx;
                      });
                      return (
                        <motion.div key={`${v}-${idx}`} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-3 px-4 py-2.5 rounded-sm border border-black/[0.06] bg-black/[0.02]">
                          <div className="flex-1 min-w-0">
                            <p className="font-body text-sm text-ec-dark truncate">{s.name}</p>
                            <p className="font-body text-[11px] text-ec-text-muted truncate">{s.price}</p>
                          </div>
                          <button onClick={() => handleDeleteService(realIdx)}
                            className="w-6 h-6 flex-shrink-0 flex items-center justify-center text-red-300 hover:text-red-500 transition-colors rounded-sm hover:bg-red-50">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                            </svg>
                          </button>
                        </motion.div>
                      );
                    })}
                    {list.length === 0 && (
                      <p className="font-body text-xs text-ec-text-muted py-2 px-1">Sin servicios para {v === "car" ? "carro" : "moto"}</p>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Agregar nuevo servicio */}
          <div className="border border-black/[0.06] rounded-sm p-4 space-y-3">
            <p className="font-ui text-[10px] tracking-[0.2em] uppercase text-ec-text-muted">Agregar servicio</p>
            <div className="flex gap-2">
              <input value={newSvcName} onChange={e => setNewSvcName(e.target.value)}
                placeholder="Nombre del servicio"
                className="flex-1 px-3 py-2 border border-black/[0.1] rounded-sm font-body text-sm bg-ec-cream focus:border-ec-gold focus:outline-none"
              />
              <select value={newSvcVehicle} onChange={e => setNewSvcVehicle(e.target.value)}
                className="px-3 py-2 border border-black/[0.1] rounded-sm font-body text-sm bg-ec-cream focus:border-ec-gold focus:outline-none">
                <option value="car">Carro</option>
                <option value="moto">Moto</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input value={newSvcPrice} onChange={e => setNewSvcPrice(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddService()}
                placeholder="Precio (ej: $350.000 o Bajo cotización)"
                className="flex-1 px-3 py-2 border border-black/[0.1] rounded-sm font-body text-sm bg-ec-cream focus:border-ec-gold focus:outline-none"
              />
              <button onClick={handleAddService} disabled={!newSvcName.trim() || !newSvcPrice.trim()}
                className="px-5 py-2 rounded-sm font-ui text-[11px] tracking-widest uppercase text-white transition-all disabled:opacity-40"
                style={{ background: newSvcName.trim() && newSvcPrice.trim() ? "#B8860B" : "#ccc" }}>
                Agregar
              </button>
            </div>
          </div>

          <button onClick={handleSavePortfolio}
            className="w-full py-3 rounded-sm font-ui text-[11px] tracking-widest uppercase text-white transition-all"
            style={{ background: "#B8860B" }}>
            Guardar cambios
          </button>

          <div className="flex items-start gap-2 px-1">
            <svg className="flex-shrink-0 mt-0.5 text-ec-text-muted" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="font-body text-[11px] text-ec-text-muted leading-relaxed">
              Al guardar, el bot de WhatsApp y el chat web actualizan su portafolio en la próxima consulta. No requiere redeploy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
