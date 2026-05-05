import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";

const CHANNEL_BADGE = {
  whatsapp: { label: "WhatsApp", bg: "rgba(37,211,102,0.08)", color: "#16a34a", border: "rgba(37,211,102,0.25)" },
  web: { label: "Web", bg: "rgba(59,130,246,0.08)", color: "#2563eb", border: "rgba(59,130,246,0.25)" },
};

function Badge({ channel }) {
  const style = CHANNEL_BADGE[channel] || CHANNEL_BADGE.web;
  return (
    <span
      className="font-ui text-[9px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-sm"
      style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}
    >
      {style.label}
    </span>
  );
}

function WhatsAppIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.116.553 4.103 1.523 5.828L.057 23.857a.5.5 0 0 0 .636.607l6.218-1.63A11.953 11.953 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.953 9.953 0 0 1-5.077-1.384l-.364-.216-3.767.988 1.006-3.665-.236-.377A9.952 9.952 0 0 1 2 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10z"/>
    </svg>
  );
}

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [apptCounts, setApptCounts] = useState({});

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: convs }, { data: webClients }, { data: appts }] = await Promise.all([
        supabase.from("conversations").select("*").order("updated_at", { ascending: false }),
        supabase.from("clients").select("*").order("updated", { ascending: false }),
        supabase.from("appointments").select("client_phone, status"),
      ]);

      // Contar citas por teléfono
      const counts = {};
      for (const a of appts || []) {
        const p = a.client_phone;
        if (!p) continue;
        counts[p] = (counts[p] || 0) + 1;
      }
      setApptCounts(counts);

      // Construir mapa unificado por teléfono
      const map = new Map();

      for (const c of webClients || []) {
        if (!c.phone) continue;
        map.set(c.phone, {
          phone: c.phone,
          name: c.name,
          email: null,
          lastService: c.last_service,
          lastDate: c.last_date,
          vehiclePlate: null,
          vehicleType: null,
          channel: "web",
          updatedAt: c.updated,
        });
      }

      for (const c of convs || []) {
        if (!c.phone) continue;
        const existing = map.get(c.phone);
        if (existing) {
          map.set(c.phone, {
            ...existing,
            name: c.client_name || existing.name,
            email: c.client_email || existing.email,
            vehiclePlate: c.vehicle_plate || existing.vehiclePlate,
            vehicleType: c.vehicle_type || existing.vehicleType,
            lastService: c.last_service || existing.lastService,
            channel: "whatsapp",
            updatedAt: c.updated_at || existing.updatedAt,
          });
        } else {
          map.set(c.phone, {
            phone: c.phone,
            name: c.client_name,
            email: c.client_email,
            lastService: c.last_service,
            lastDate: null,
            vehiclePlate: c.vehicle_plate,
            vehicleType: c.vehicle_type,
            channel: "whatsapp",
            updatedAt: c.updated_at,
          });
        }
      }

      setClients(Array.from(map.values()));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const filtered = clients.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.vehiclePlate?.toLowerCase().includes(q) ||
      c.lastService?.toLowerCase().includes(q)
    );
  });

  const waLink = (phone, name) => {
    const num = phone?.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Hola ${name || ""}, te saluda Esteticar Manizales. Queremos saber cómo está tu vehículo y si podemos ayudarte con algo.`
    );
    return `https://wa.me/57${num}?text=${msg}`;
  };

  return (
    <div className="space-y-8">
      {/* Header + Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl text-ec-dark">Tabla Maestra de Clientes</h2>
          <p className="font-body text-sm text-ec-text-muted mt-1 font-light">
            {clients.length} clientes · Web + WhatsApp unificado
          </p>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, teléfono, placa..."
          className="w-full sm:w-72 px-4 py-2.5 border border-black/[0.1] rounded-sm font-body text-sm bg-white focus:border-ec-gold focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-2 border-ec-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center border border-black/[0.06] bg-white rounded-sm">
          <p className="font-heading text-lg text-ec-dark mb-2">Sin resultados</p>
          <p className="font-body text-sm text-ec-text-muted font-light">Intenta con otro término de búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Table */}
          <div className="lg:col-span-2 bg-white border border-black/[0.06] rounded-sm overflow-hidden shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-black/[0.06] bg-ec-cream/60">
                    {["Cliente", "Teléfono", "Placa", "Último servicio", "Citas", "Canal", ""].map((h) => (
                      <th key={h} className="px-5 py-4 font-ui text-[9px] tracking-[0.25em] text-ec-text-muted uppercase whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  <AnimatePresence>
                    {filtered.map((c, i) => (
                      <motion.tr
                        key={c.phone}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        onClick={() => setSelected(c)}
                        className={`cursor-pointer transition-colors duration-150 ${
                          selected?.phone === c.phone ? "bg-ec-gold/[0.04]" : "hover:bg-ec-cream/40"
                        }`}
                      >
                        <td className="px-5 py-4">
                          <p className="font-heading text-sm text-ec-dark leading-tight">{c.name || "—"}</p>
                          {c.email && <p className="font-body text-[11px] text-ec-text-muted mt-0.5 truncate max-w-[160px]">{c.email}</p>}
                        </td>
                        <td className="px-5 py-4 font-body text-sm text-ec-dark whitespace-nowrap">{c.phone}</td>
                        <td className="px-5 py-4">
                          {c.vehiclePlate ? (
                            <span className="font-ui text-[11px] tracking-widest bg-ec-cream border border-black/[0.08] px-2 py-1 rounded-sm">
                              {c.vehiclePlate.toUpperCase()}
                            </span>
                          ) : <span className="text-ec-text-muted text-sm">—</span>}
                        </td>
                        <td className="px-5 py-4 font-body text-xs text-ec-text-secondary max-w-[160px] truncate">
                          {c.lastService || "—"}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="font-heading text-lg text-ec-gold">{apptCounts[c.phone] || 0}</span>
                        </td>
                        <td className="px-5 py-4"><Badge channel={c.channel} /></td>
                        <td className="px-5 py-4">
                          <a
                            href={waLink(c.phone, c.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="w-8 h-8 flex items-center justify-center bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white rounded-sm transition-all duration-200"
                            title="Escribir por WhatsApp"
                          >
                            <WhatsAppIcon />
                          </a>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail panel */}
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="border border-black/[0.06] p-8 h-fit sticky top-28 bg-white rounded-sm shadow-[0_8px_40px_rgba(0,0,0,0.08)] space-y-6"
              >
                <div className="flex items-start justify-between pb-6 border-b border-black/[0.06]">
                  <div>
                    <h3 className="font-heading text-2xl text-ec-gold">{selected.name || "Sin nombre"}</h3>
                    <Badge channel={selected.channel} />
                  </div>
                  <button onClick={() => setSelected(null)} className="text-black/20 hover:text-ec-dark transition-colors text-lg">✕</button>
                </div>

                <div className="space-y-4">
                  {[
                    { label: "Teléfono", value: selected.phone },
                    { label: "Correo", value: selected.email || "—" },
                    { label: "Placa", value: selected.vehiclePlate?.toUpperCase() || "—" },
                    { label: "Vehículo", value: selected.vehicleType === "car" ? "Carro" : selected.vehicleType === "moto" ? "Moto" : "—" },
                    { label: "Último servicio", value: selected.lastService || "—" },
                    { label: "Total citas", value: apptCounts[selected.phone] || 0 },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-start gap-4">
                      <p className="font-ui text-[9px] tracking-[0.2em] text-ec-text-muted uppercase whitespace-nowrap">{item.label}</p>
                      <p className="font-body text-sm text-ec-dark text-right break-all">{item.value}</p>
                    </div>
                  ))}
                </div>

                <a
                  href={waLink(selected.phone, selected.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 flex items-center justify-center gap-2.5 font-ui text-[11px] tracking-[0.2em] uppercase text-white rounded-sm transition-all duration-300"
                  style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)" }}
                >
                  <WhatsAppIcon size={15} />
                  Escribir por WhatsApp
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
