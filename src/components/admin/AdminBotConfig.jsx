import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { db, ai } from "../../lib/storage";
import { BRAND } from "../../lib/constants";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default function AdminBotConfig() {
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => { setConfig(await db.botConfig.get()); };

  const handleSave = async () => {
    setSaving(true);
    await db.botConfig.update(config);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const testBot = async () => {
    setTesting(true);
    setTestResult("");
    const result = await ai.invoke(`Eres ${config?.bot_name || "Estela"}. Un cliente pregunta: "Hola, ¿cómo puedo agendar una cita?".`);
    setTestResult(result);
    setTesting(false);
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center py-32 text-ec-text-muted">
        <div className="w-8 h-8 border-2 border-ec-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Bot identity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-black/[0.06] p-8 bg-white rounded-sm shadow-[0_4px_30px_rgba(0,0,0,0.06)]"
      >
        <div className="flex flex-wrap items-center gap-6 mb-12">
          <div className="w-20 h-20 border-2 border-ec-gold overflow-hidden bg-ec-cream flex items-center justify-center rounded-sm shadow-[0_4px_20px_rgba(184,134,11,0.1)]">
            <svg width="36" height="36" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="11" r="7" stroke="#B8860B" strokeWidth="1.5" fill="none"/>
              <line x1="14" y1="4" x2="14" y2="1" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="14" cy="1" r="1.2" fill="#B8860B"/>
              <circle cx="11.2" cy="10.5" r="1.5" fill="#B8860B"/>
              <circle cx="16.8" cy="10.5" r="1.5" fill="#B8860B"/>
              <path d="M11 13.5 Q14 15.5 17 13.5" stroke="#B8860B" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
              <path d="M7 22 Q7 18 14 18 Q21 18 21 22" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          <div>
            <h3 className="font-heading text-3xl text-ec-gold">{config.bot_name}</h3>
            <p className="font-ui text-[10px] tracking-[0.3em] text-ec-text-muted uppercase mt-1">Asistente Virtual Esteticar</p>
          </div>
          <div className="ml-auto flex items-center gap-2 bg-green-50 px-4 py-2 border border-green-200 rounded-sm">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-ui text-[9px] tracking-[0.2em] text-green-600 uppercase font-bold">Activo</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="font-ui text-[10px] tracking-[0.3em] text-ec-text-muted uppercase block mb-3">Nombre del Bot</label>
            <input
              value={config.bot_name || ""}
              onChange={(e) => setConfig({ ...config, bot_name: e.target.value })}
              className="w-full p-4 border border-black/[0.06] bg-ec-cream text-ec-dark font-body outline-none focus:border-ec-gold transition-colors rounded-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="font-ui text-[10px] tracking-[0.3em] text-ec-text-muted uppercase block mb-3">Mensaje de Bienvenida</label>
            <textarea
              value={config.greeting_message || ""}
              onChange={(e) => setConfig({ ...config, greeting_message: e.target.value })}
              rows={3}
              className="w-full p-4 border border-black/[0.06] bg-ec-cream text-ec-dark font-body outline-none focus:border-ec-gold transition-colors resize-none rounded-sm"
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <label className="font-ui text-[10px] tracking-[0.3em] text-ec-text-muted uppercase">Personalidad e Instrucciones</label>
              <span className="font-ui text-[9px] text-ec-gold">Tono premium y profesional</span>
            </div>
            <textarea
              value={config.personality || ""}
              onChange={(e) => setConfig({ ...config, personality: e.target.value })}
              rows={6}
              className="w-full p-4 border border-black/[0.06] bg-ec-cream text-ec-dark font-body outline-none focus:border-ec-gold transition-colors resize-none rounded-sm"
            />
          </div>

          <div>
            <label className="font-ui text-[10px] tracking-[0.3em] text-ec-text-muted uppercase block mb-3">Hora Inicio</label>
            <input
              type="time"
              value={config.available_hours_start || "08:00"}
              onChange={(e) => setConfig({ ...config, available_hours_start: e.target.value })}
              className="w-full p-4 border border-black/[0.06] bg-ec-cream text-ec-dark outline-none focus:border-ec-gold transition-colors rounded-sm"
            />
          </div>
          <div>
            <label className="font-ui text-[10px] tracking-[0.3em] text-ec-text-muted uppercase block mb-3">Hora Fin</label>
            <input
              type="time"
              value={config.available_hours_end || "18:00"}
              onChange={(e) => setConfig({ ...config, available_hours_end: e.target.value })}
              className="w-full p-4 border border-black/[0.06] bg-ec-cream text-ec-dark outline-none focus:border-ec-gold transition-colors rounded-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="font-ui text-[10px] tracking-[0.3em] text-ec-text-muted uppercase block mb-4">Días de Atención</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => {
                const isActive = (config.working_days || []).includes(day);
                return (
                  <button
                    key={day}
                    onClick={() => {
                      const days = config.working_days || [];
                      setConfig({ ...config, working_days: isActive ? days.filter((d) => d !== day) : [...days, day] });
                    }}
                    className={`px-5 py-2.5 font-ui text-[9px] tracking-[0.2em] border transition-all duration-300 uppercase rounded-sm ${
                      isActive ? "bg-ec-gold text-white border-ec-gold font-bold" : "bg-ec-cream text-ec-text-muted border-black/[0.06] hover:border-ec-gold/30"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Templates */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="border border-black/[0.06] p-8 bg-white rounded-sm shadow-[0_4px_30px_rgba(0,0,0,0.06)]"
      >
        <h3 className="font-heading text-2xl text-ec-dark mb-8 border-b border-black/[0.06] pb-6">Plantillas de Comunicación</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <label className="font-ui text-[10px] tracking-[0.3em] text-ec-text-muted uppercase block mb-3">Confirmación de Cita</label>
            <textarea
              value={config.confirmation_email_template || ""}
              onChange={(e) => setConfig({ ...config, confirmation_email_template: e.target.value })}
              rows={5}
              className="w-full p-4 border border-black/[0.06] bg-ec-cream text-sm text-ec-dark font-body outline-none focus:border-ec-gold transition-colors resize-none rounded-sm"
            />
          </div>
          <div>
            <label className="font-ui text-[10px] tracking-[0.3em] text-ec-text-muted uppercase block mb-3">Recordatorio Mensual</label>
            <textarea
              value={config.reminder_email_template || ""}
              onChange={(e) => setConfig({ ...config, reminder_email_template: e.target.value })}
              rows={5}
              className="w-full p-4 border border-black/[0.06] bg-ec-cream text-sm text-ec-dark font-body outline-none focus:border-ec-gold transition-colors resize-none rounded-sm"
            />
          </div>
        </div>
      </motion.div>

      {/* Test bot */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="border border-black/[0.06] p-8 bg-white rounded-sm shadow-[0_4px_30px_rgba(0,0,0,0.06)]"
      >
        <div className="flex items-center justify-between mb-8">
          <h3 className="font-heading text-2xl text-ec-dark">Prueba de Personalidad</h3>
          <button
            onClick={testBot}
            disabled={testing}
            className="px-8 py-3 font-ui text-[10px] tracking-[0.2em] border border-ec-gold text-ec-gold uppercase hover:bg-ec-gold hover:text-white transition-all disabled:opacity-25 rounded-sm"
          >
            {testing ? "SIMULANDO..." : "PROBAR RESPUESTA"}
          </button>
        </div>

        {testResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 border border-ec-gold/15 bg-ec-gold/[0.04] rounded-sm"
          >
            <p className="font-ui text-[9px] tracking-[0.3em] text-ec-gold uppercase mb-3">Respuesta Generada:</p>
            <p className="font-body text-sm text-ec-text-secondary italic leading-relaxed">"{testResult}"</p>
          </motion.div>
        )}
      </motion.div>

      {/* Save */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-12 py-5 font-ui text-xs tracking-[0.3em] transition-all duration-500 uppercase font-bold rounded-sm ${
            saved ? "bg-green-500 text-white shadow-[0_4px_20px_rgba(34,197,94,0.2)]" : "bg-ec-gold text-white hover:scale-105 shadow-[0_8px_30px_rgba(184,134,11,0.2)]"
          }`}
        >
          {saving ? "GUARDANDO..." : saved ? "¡CONFIGURACIÓN GUARDADA!" : "GUARDAR CAMBIOS"}
        </button>
      </div>
    </div>
  );
}
