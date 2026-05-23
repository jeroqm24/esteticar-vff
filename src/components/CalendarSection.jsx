import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../lib/storage";
import { SERVICES, MAX_BAYS, WORK_DAYS } from "../lib/constants";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isToday, addMonths, subMonths, getDay,
  isBefore, startOfDay, addDays, startOfWeek, endOfWeek,
  eachHourOfInterval, parseISO, isWithinInterval,
} from "date-fns";
import { es } from "date-fns/locale";

// ─── Constants ────────────────────────────────────────────────────
const HOUR_START = 8;
const HOUR_END_WEEKDAY = 17;
const HOUR_END_SATURDAY = 14;
const SLOT_HEIGHT = 64; // px per hour

const SERVICE_COLORS = {
  "Lavada Esencial": "#22c55e",
  "Tratamiento 3 en 1 a Máquina": "#f59e0b",
  "Tratamiento 3 en 1 Manual": "#f59e0b",
  "Mantenimiento Interior Sólo Cojinería": "#8b5cf6",
  "Mantenimiento Interior Levantamiento del Alfombrado": "#7c3aed",
  "Mantenimiento Interior": "#8b5cf6",
  "Brillado a Máquina": "#3b82f6",
  "Restauración de Farolas": "#06b6d4",
  "Lavado de Cojinería": "#ec4899",
  "Lavado de Chasis": "#64748b",
  "Lavado de Techo": "#64748b",
  "Descontaminación de Vidrios": "#0ea5e9",
  default: "#F8C840",
};

const getServiceColor = (service) => {
  const key = Object.keys(SERVICE_COLORS).find(k => service?.includes(k));
  return SERVICE_COLORS[key] || SERVICE_COLORS.default;
};

// Duration in hours by service (keys must be substrings of the service name).
// More specific keys first so the find() picks the right one.
const SERVICE_DURATIONS = {
  "Descontaminación de Vidrios (parabrisas)": 1,
  "Descontaminación de Vidrios": 2,       // catches "(todos)"
  "Tratamiento 3 en 1 a Máquina": 5,
  "Tratamiento 3 en 1 Manual": 4,
  "Mantenimiento Interior Sólo Cojinería": 16,
  "Mantenimiento Interior Levantamiento del Alfombrado": 16,
  "Mantenimiento Interior": 16,
  "Lavado de Cojinería": 4,
  "Restauración de Farolas": 2,
  "Brillado a Máquina": 3,
  "Recubrimiento Cerámico": 6,
  "Porcelanizado": 5,
  "Limpieza Técnica de Motor": 1,
  "Lavado de Techo": 1,                   // catches "y Parasoles"
  "Lavado de Chasis": 1,
  "Lavada Esencial": 1,                   // catches Carro y Moto
  "Brillado de Farolas": 1,
  "Brillado de Tanque": 1,
  "Descontaminación de Tubería": 1,
  default: 2,
};

const getServiceDuration = (service) => {
  const key = Object.keys(SERVICE_DURATIONS).find(k => service?.includes(k));
  return SERVICE_DURATIONS[key] || SERVICE_DURATIONS.default;
};

// ─── Helpers ──────────────────────────────────────────────────────
const parseAppointmentHour = (appt) => {
  const src = appt.date || '';
  // Match hour:min followed by optional am/pm indicator
  const match = src.match(/(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)?/i);
  if (match) {
    let h = parseInt(match[1]);
    const period = (match[3] || '').toLowerCase().replace(/\./g, '');
    if (period === 'pm' && h < 12) h += 12;
    if (period === 'am' && h === 12) h = 0;
    return h;
  }
  if (appt.time) {
    const t = appt.time.match(/(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)?/i);
    if (t) {
      let h = parseInt(t[1]);
      const period = (t[3] || '').toLowerCase().replace(/\./g, '');
      if (period === 'pm' && h < 12) h += 12;
      if (period === 'am' && h === 12) h = 0;
      return h;
    }
    const bare = appt.time.match(/(\d{1,2})/);
    if (bare) return parseInt(bare[1]);
  }
  return 9;
};

const MESES = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
};

const parseAppointmentDate = (appt) => {
  const dateStr = appt.date || appt.created_date || '';

  // ISO: 2026-05-06
  const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return new Date(dateStr.substring(0, 10));

  // Español: "6 de mayo" o "6 de mayo de 2026"
  const esMatch = dateStr.match(/(\d{1,2})\s+de\s+(\w+)(?:\s+de\s+(\d{4}))?/i);
  if (esMatch) {
    const day   = parseInt(esMatch[1]);
    const month = MESES[esMatch[2].toLowerCase()];
    const year  = esMatch[3] ? parseInt(esMatch[3]) : new Date().getFullYear();
    if (month !== undefined) return new Date(year, month, day);
  }

  return new Date();
};

const isSameDate = (appt, day) => {
  const apptDate = parseAppointmentDate(appt);
  return isSameDay(apptDate, day);
};

// ─── Status badge ─────────────────────────────────────────────────
const STATUS_CONFIG = {
  confirmada:  { label: "Confirmada", color: "#22c55e", bg: "#f0fdf4" },
  cancelada:   { label: "Cancelada",  color: "#ef4444", bg: "#fef2f2" },
  // legacy
  pending:     { label: "Confirmada", color: "#22c55e", bg: "#f0fdf4" },
  confirmed:   { label: "Confirmada", color: "#22c55e", bg: "#f0fdf4" },
  completed:   { label: "Confirmada", color: "#22c55e", bg: "#f0fdf4" },
  in_progress: { label: "Confirmada", color: "#22c55e", bg: "#f0fdf4" },
  cancelled:   { label: "Cancelada",  color: "#ef4444", bg: "#fef2f2" },
};

// ─── Month calendar grid ──────────────────────────────────────────
function MonthGrid({ currentMonth, selectedDay, appointments, onSelectDay }) {
  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOfWeek = (getDay(startOfMonth(currentMonth)) + 6) % 7;
  const today = startOfDay(new Date());
  const WEEK_DAYS = ["L", "M", "X", "J", "V", "S", "D"];

  const getApptCountForDay = (day) => {
    return appointments.filter(a => isSameDate(a, day) && a.status !== 'cancelada').length;
  };

  // A day is truly full only when every hour slot has MAX_BAYS concurrent appointments
  const isDayAtCapacity = (day) => {
    const dayAppts = appointments.filter(a => isSameDate(a, day) && a.status !== 'cancelada');
    if (dayAppts.length === 0) return false;
    const sat = (getDay(day) + 6) % 7 === 5;
    const endH = sat ? HOUR_END_SATURDAY : HOUR_END_WEEKDAY;
    for (let h = HOUR_START; h < endH; h++) {
      const concurrent = dayAppts.filter(a => {
        const start = parseAppointmentHour(a);
        const dur = getServiceDuration(a.service);
        return h >= start && h < start + dur;
      }).length;
      if (concurrent < MAX_BAYS) return false;
    }
    return true;
  };

  return (
    <div>
      {/* Week headers */}
      <div className="grid grid-cols-7 mb-3">
        {WEEK_DAYS.map((d, i) => (
          <div key={d} className="text-center py-2">
            <span className={`font-ui text-[11px] tracking-[0.2em] uppercase font-medium ${i === 6 ? "text-red-300" : "text-ec-text-muted"}`}>{d}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {Array(firstDayOfWeek).fill(null).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        {days.map((day) => {
          const dayIndex = (getDay(day) + 6) % 7;
          const isSunday = dayIndex === 6;
          const isPast = isBefore(startOfDay(day), today);
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          const count = getApptCountForDay(day);
          const isTod = isToday(day);
          const isFull = isDayAtCapacity(day);

          if (isSunday) {
            return (
              <div key={day.toISOString()} className="min-h-[64px] flex items-center justify-center opacity-20">
                <span className="font-heading text-xl text-ec-text-muted">{format(day, "d")}</span>
              </div>
            );
          }

          return (
            <button
              key={day.toISOString()}
              onClick={() => !isPast && onSelectDay(day)}
              disabled={isPast}
              className={`relative min-h-[64px] flex flex-col items-center justify-center rounded-sm transition-all duration-200 ${isSelected
                ? "bg-[#F8C840] text-white shadow-[0_4px_16px_rgba(248,200,64,0.4)] scale-105"
                : isTod
                  ? "border-2 border-[#F8C840] bg-[#F8C840]/5 text-[#F8C840]"
                  : isPast
                    ? "opacity-25 cursor-not-allowed text-ec-text-muted"
                    : isFull
                      ? "bg-red-50 text-red-400 cursor-not-allowed"
                      : "hover:bg-ec-cream text-ec-dark hover:scale-105 hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                }`}
            >
              <span className={`font-heading text-2xl leading-none ${isTod && !isSelected ? "font-bold" : "font-light"}`}>{format(day, "d")}</span>
              {count > 0 && !isSelected && (
                <div className="flex gap-1 mt-1.5">
                  {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${isFull ? "bg-red-400" : count === 2 ? "bg-amber-400" : "bg-green-400"}`} />
                  ))}
                </div>
              )}
              {count > 0 && isSelected && (
                <span className="font-ui text-[9px] mt-1 opacity-80">{count} cita{count > 1 ? "s" : ""}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Day timeline view ────────────────────────────────────────────
function DayTimeline({ day, appointments, isAdmin, onAddAppointment, onUpdateStatus }) {
  const dayIndex = (getDay(day) + 6) % 7;
  const isSaturday = dayIndex === 5;
  const hourEnd = isSaturday ? HOUR_END_SATURDAY : HOUR_END_WEEKDAY;
  const hours = Array.from({ length: hourEnd - HOUR_START }, (_, i) => HOUR_START + i);
  const dayAppts = appointments.filter(a => isSameDate(a, day) && a.status !== 'cancelada');

  // Group appointments by START hour (for rendering)
  const apptsByHour = {};
  dayAppts.forEach(a => {
    const h = parseAppointmentHour(a);
    if (!apptsByHour[h]) apptsByHour[h] = [];
    apptsByHour[h].push(a);
  });

  // Count how many appointments are simultaneously active at a given hour
  // (includes carry-overs from earlier hours based on service duration)
  const getActiveCountAtHour = (hour) =>
    dayAppts.filter(a => {
      const start = parseAppointmentHour(a);
      const dur = getServiceDuration(a.service);
      return hour >= start && hour < start + dur;
    }).length;

  const peakConcurrent = hours.reduce((max, h) => Math.max(max, getActiveCountAtHour(h)), 0);

  return (
    <div className="flex flex-col h-full">
      {/* Day header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-black/[0.06]">
        <div>
          <p className="font-ui text-[9px] tracking-[0.3em] text-[#F8C840] uppercase">
            {format(day, "EEEE", { locale: es })}
          </p>
          <h3 className="font-heading text-2xl text-ec-dark capitalize">
            {format(day, "d 'de' MMMM", { locale: es })}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {/* Capacity indicator — pico de concurrencia del día */}
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1">
              {Array.from({ length: MAX_BAYS }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    i < peakConcurrent
                      ? peakConcurrent >= MAX_BAYS ? "bg-red-400" : "bg-[#F8C840]"
                      : "bg-black/[0.08]"
                  }`}
                />
              ))}
            </div>
            <span className="font-ui text-[9px] tracking-[0.1em] text-ec-text-muted">
              pico {peakConcurrent}/{MAX_BAYS} · {dayAppts.length} cita{dayAppts.length !== 1 ? "s" : ""}
            </span>
          </div>
          {isAdmin && (
            <button
              onClick={() => onAddAppointment && onAddAppointment(day)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#F8C840] text-white font-ui text-[9px] tracking-[0.15em] uppercase rounded-sm hover:bg-[#e6b800] transition-all"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nueva cita
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative">
          {hours.map((hour) => {
            const appts = apptsByHour[hour] || [];
            const hasAppts = appts.length > 0;
            const activeCount = getActiveCountAtHour(hour);
            const isSlotFull = activeCount >= MAX_BAYS;

            return (
              <div key={hour} className="flex gap-3 mb-1" style={{ minHeight: `${SLOT_HEIGHT}px` }}>
                {/* Hour label + capacity strip */}
                <div className="w-12 flex-shrink-0 flex flex-col items-end pt-2 gap-1.5">
                  <span className="font-ui text-[10px] tracking-wider text-ec-text-muted">
                    {hour}:00
                  </span>
                  {/* 3 dots: occupied bays at this hour */}
                  <div className="flex flex-col gap-0.5">
                    {Array.from({ length: MAX_BAYS }).map((_, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${
                        i < activeCount
                          ? isSlotFull ? "bg-red-400" : "bg-[#F8C840]/60"
                          : "bg-black/[0.06]"
                      }`} />
                    ))}
                  </div>
                </div>

                {/* Slot area */}
                <div className="flex-1 border-t border-black/[0.04] pt-2 pb-2">
                  {hasAppts ? (
                    <div className="space-y-2">
                      {isSlotFull && (
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg mb-1"
                          style={{ background: 'linear-gradient(90deg,rgba(239,68,68,0.06) 0%,transparent 100%)', border: '1px solid rgba(239,68,68,0.14)' }}>
                          <div className="flex gap-1">
                            {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-red-400" />)}
                          </div>
                          <div className="w-px h-3.5 bg-red-200/50" />
                          <span className="font-ui text-[8px] tracking-[0.25em] text-red-400 uppercase">
                            3 / 3 bahías · hora sin cupo
                          </span>
                        </div>
                      )}
                      {appts.map((appt, i) => {
                        const color = getServiceColor(appt.service);
                        const duration = getServiceDuration(appt.service);
                        const status = STATUS_CONFIG[appt.status] || STATUS_CONFIG.confirmada;

                        // Traslado detection
                        const trasladoStr = (appt.traslado || '').toLowerCase();
                        const hasPickup = trasladoStr.includes('recogi') || trasladoStr.includes('recoger');
                        const hasDelivery = trasladoStr.includes('entrega') || trasladoStr.includes('entregar');
                        const hasTraslado = hasPickup || hasDelivery;

                        // Timeline calculation
                        const entryH = parseAppointmentHour(appt);
                        const exitH = entryH + duration;
                        const fmtH = (h) => `${Math.floor(h)}:${(h % 1) * 60 === 0 ? '00' : '30'}`;

                        return (
                          <motion.div
                            key={appt.id || i}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-start gap-3 p-3 rounded-sm border-l-[3px] shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                            style={{
                              borderLeftColor: hasTraslado ? '#3b82f6' : color,
                              background: hasTraslado ? '#eff6ff' : '#ffffff',
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-ui text-[10px] tracking-[0.15em] text-ec-dark font-bold uppercase truncate">
                                  {appt.clientName || appt.client_name || "Cliente"}
                                </p>
                                <span
                                  className="font-ui text-[8px] tracking-[0.1em] uppercase px-2 py-0.5 rounded-full"
                                  style={{ color: status.color, background: status.bg }}
                                >
                                  {status.label}
                                </span>
                                {hasTraslado && (
                                  <span className="font-ui text-[8px] tracking-[0.1em] uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">
                                    {hasPickup && hasDelivery ? '🚗 Recogida + Entrega' : hasPickup ? '🚗 Recogida' : '📦 Entrega'}
                                  </span>
                                )}
                              </div>
                              <p className="font-body text-xs text-ec-text-muted mt-0.5">{appt.service}</p>

                              {/* Timeline strip */}
                              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                {hasPickup && (
                                  <>
                                    <span className="font-ui text-[8px] px-2 py-0.5 rounded-sm bg-blue-100 text-blue-700 border border-blue-200">
                                      🚗 Recogida {fmtH(entryH - 0.5)}
                                    </span>
                                    <span className="text-ec-text-muted/40 text-[8px]">→</span>
                                  </>
                                )}
                                <span className="font-ui text-[8px] px-2 py-0.5 rounded-sm bg-green-50 text-green-700 border border-green-200">
                                  ↓ Entrada {fmtH(entryH)}
                                </span>
                                <span className="text-ec-text-muted/40 text-[8px]">→</span>
                                <span className="font-ui text-[8px] px-2 py-0.5 rounded-sm bg-amber-50 text-amber-700 border border-amber-200">
                                  ↑ Salida ~{fmtH(exitH)}
                                </span>
                                {hasDelivery && (
                                  <>
                                    <span className="text-ec-text-muted/40 text-[8px]">→</span>
                                    <span className="font-ui text-[8px] px-2 py-0.5 rounded-sm bg-purple-50 text-purple-700 border border-purple-200">
                                      🏠 Entrega ~{fmtH(exitH + 0.5)}
                                    </span>
                                  </>
                                )}
                              </div>

                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                <span className="font-ui text-[9px] tracking-wider text-[#F8C840]">
                                  {appt.priceDisplay || appt.price}
                                </span>
                                <span className="font-ui text-[9px] tracking-wider text-ec-text-muted">
                                  {duration}h · {appt.vehicleType || "Vehículo"}
                                </span>
                                {appt.clientPhone && (
                                  <span className="font-ui text-[9px] tracking-wider text-ec-text-muted">
                                    {appt.clientPhone}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Status */}
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              {isAdmin && (
                                <select
                                  value={appt.status === "cancelada" || appt.status === "cancelled" ? "cancelada" : "confirmada"}
                                  onChange={(e) => onUpdateStatus && onUpdateStatus(appt.id, e.target.value)}
                                  className="font-ui text-[8px] tracking-wider border border-black/[0.06] rounded-sm px-1 py-0.5 bg-white text-ec-text-muted focus:outline-none focus:border-[#F8C840]"
                                  style={{ fontSize: '9px' }}
                                >
                                  <option value="confirmada">Confirmada</option>
                                  <option value="cancelada">Cancelada</option>
                                </select>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-full flex items-center">
                      {isAdmin && !isSlotFull ? (
                        <button
                          onClick={() => onAddAppointment && onAddAppointment(day, hour)}
                          className="w-full h-10 border border-dashed border-black/[0.08] rounded-sm text-ec-text-muted/30 font-ui text-[9px] tracking-wider hover:border-[#F8C840]/40 hover:text-[#F8C840]/60 transition-all flex items-center justify-center gap-1"
                        >
                          <span>+</span>
                        </button>
                      ) : isSlotFull ? (
                        <div className="w-full flex items-center gap-3 px-3 py-2 rounded-lg"
                          style={{ background: 'linear-gradient(90deg,rgba(239,68,68,0.05) 0%,transparent 80%)', border: '1px solid rgba(239,68,68,0.12)' }}>
                          <div className="flex gap-1">
                            {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-red-400/80" />)}
                          </div>
                          <div className="w-px h-3.5 bg-red-200/40" />
                          <span className="font-ui text-[8px] tracking-[0.25em] text-red-400/80 uppercase">
                            3 / 3 bahías · sin disponibilidad
                          </span>
                        </div>
                      ) : (
                        <div className="w-full h-px bg-black/[0.04]" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Add appointment modal ────────────────────────────────────────
// null = precio por cotización (campo editable en el modal)
const SERVICE_PRICES = {
  // CARROS
  "Lavada Esencial Carro": 49000,
  "Brillado a Máquina": 100000,
  "Lavado de Chasis": 59000,
  "Lavado de Techo y Parasoles": 49000,
  "Descontaminación de Vidrios (todos)": 250000,
  "Descontaminación de Vidrios (parabrisas)": 60000,
  "Restauración de Farolas": 180000,
  "Lavado de Cojinería": 199000,
  "Mantenimiento Interior Sólo Cojinería": 290000,
  "Mantenimiento Interior Levantamiento del Alfombrado": 350000,
  "Mantenimiento Interior": 280000,
  "Tratamiento 3 en 1 Manual": 290000,
  "Tratamiento 3 en 1 a Máquina": 350000,
  "Limpieza Técnica de Motor": 49000,
  "Recubrimiento Cerámico": null,
  "Porcelanizado": null,
  // MOTOS
  "Lavada Esencial Moto": 49000,
  "Brillado de Farolas": 49000,
  "Brillado de Tanque": 59000,
  "Descontaminación de Tubería": 49000,
};

function formatCOP(amount) {
  return "$" + amount.toLocaleString("es-CO");
}

function AddAppointmentModal({ day, defaultHour, appointments = [], onClose, onSave }) {
  const CAR_SERVICES = [
    "Lavada Esencial Carro",
    "Brillado a Máquina",
    "Lavado de Chasis",
    "Lavado de Techo y Parasoles",
    "Descontaminación de Vidrios (todos)",
    "Descontaminación de Vidrios (parabrisas)",
    "Restauración de Farolas",
    "Lavado de Cojinería",
    "Mantenimiento Interior Sólo Cojinería",
    "Mantenimiento Interior Levantamiento del Alfombrado",
    "Tratamiento 3 en 1 Manual",
    "Tratamiento 3 en 1 a Máquina",
    "Limpieza Técnica de Motor",
    "Recubrimiento Cerámico",
    "Porcelanizado",
  ];
  const MOTO_SERVICES = [
    "Lavada Esencial Moto", "Brillado de Farolas", "Brillado de Tanque", "Descontaminación de Tubería",
  ];

  const defaultService = "Lavada Esencial Carro";
  const toDateInput = (d) => format(d instanceof Date ? d : new Date(), "yyyy-MM-dd");

  const SERVICE_DURATION_DISPLAY = {
    "Lavada Esencial Carro": "1-2 horas",
    "Brillado a Máquina": "2-3 horas",
    "Lavado de Chasis": "2 horas",
    "Lavado de Techo y Parasoles": "1-2 horas",
    "Descontaminación de Vidrios (todos)": "1-3 horas",
    "Descontaminación de Vidrios (parabrisas)": "1 hora",
    "Restauración de Farolas": "2-3 horas",
    "Lavado de Cojinería": "1 día completo",
    "Mantenimiento Interior Sólo Cojinería": "2 días",
    "Mantenimiento Interior Levantamiento del Alfombrado": "2 días",
    "Mantenimiento Interior": "2 días",
    "Tratamiento 3 en 1 Manual": "4-5 horas",
    "Tratamiento 3 en 1 a Máquina": "5-6 horas",
    "Limpieza Técnica de Motor": "2 horas",
    "Lavada Esencial Moto": "1-2 horas",
    "Brillado de Farolas": "1 hora",
    "Brillado de Tanque": "1-2 horas",
    "Descontaminación de Tubería": "1-2 horas",
  };

  const [form, setForm] = useState({
    clientName: "",
    clientPhone: "",
    service: defaultService,
    vehicleType: "Carro",
    hour: defaultHour || 9,
    status: "confirmada",
    discount: 0,
    manualPrice: "",
    selectedDate: toDateInput(day || new Date()),
    traslado: "",
    durationHours: "",
  });

  const selectedDay = form.selectedDate ? new Date(form.selectedDate + "T12:00:00") : (day || new Date());
  const rawPrice = SERVICE_PRICES[form.service];
  const isCotizacion = rawPrice === null;
  const isVariableDuration = form.service?.includes("Recubrimiento") || form.service?.includes("Porcelanizado");

  // Capacity enforcement
  const countAtHour = (hour) => {
    const dayAppts = appointments.filter(a => {
      const apptDate = parseAppointmentDate(a);
      return isSameDay(apptDate, selectedDay) && a.status !== 'cancelada';
    });
    return dayAppts.filter(a => {
      const start = parseAppointmentHour(a);
      const dur = getServiceDuration(a.service);
      return hour >= start && hour < start + dur;
    }).length;
  };
  const newDuration = getServiceDuration(form.service);
  const firstBlockedHour = Array.from({ length: newDuration }, (_, i) => form.hour + i)
    .find(h => countAtHour(h) >= MAX_BAYS);
  const isCapacityBlocked = firstBlockedHour !== undefined;
  const TRUCK_SURCHARGE_SERVICES = ["Tratamiento 3 en 1 Manual", "Tratamiento 3 en 1 a Máquina"];
  const truckExtra = form.vehicleType === "Camioneta" && TRUCK_SURCHARGE_SERVICES.includes(form.service) ? 10000 : 0;
  const basePrice = isCotizacion ? (parseInt(form.manualPrice) || 0) : ((rawPrice || 0) + truckExtra);
  const finalPrice = Math.max(0, basePrice - (Number(form.discount) || 0));
  const hasDiscount = form.discount > 0;

  const handleServiceChange = (service) => {
    setForm(f => ({ ...f, service, discount: 0, manualPrice: "", durationHours: "" }));
  };

  const handleVehicleChange = (vehicleType) => {
    const services = vehicleType === "Moto" ? MOTO_SERVICES : CAR_SERVICES;
    setForm(f => ({ ...f, vehicleType, service: services[0], discount: 0, manualPrice: "" }));
  };

  const allServices = form.vehicleType === "Moto" ? MOTO_SERVICES : CAR_SERVICES;
  const isSat = (getDay(selectedDay) + 6) % 7 === 5;
  const hourEnd = isSat ? HOUR_END_SATURDAY : HOUR_END_WEEKDAY;
  const hours = Array.from({ length: hourEnd - HOUR_START }, (_, i) => HOUR_START + i);

  const handleSubmit = () => {
    if (!form.clientName || !form.clientPhone || isCapacityBlocked) return;
    const dateStr = format(selectedDay, "EEEE, d 'de' MMMM", { locale: es });
    const fullDate = `${dateStr} a las ${form.hour}:00`;
    onSave({
      clientName: form.clientName,
      clientPhone: form.clientPhone,
      service: form.service,
      vehicleType: form.vehicleType,
      hour: form.hour,
      status: form.status,
      date: fullDate,
      time: `${form.hour}:00`,
      priceDisplay: (isCotizacion && !basePrice) ? "Por cotización" : formatCOP(finalPrice),
      discount: form.discount,
      traslado: form.traslado || null,
      duration_hours: isVariableDuration ? (parseInt(form.durationHours) || null) : null,
      confirmationCode: `EST-M${Math.floor(Math.random() * 9000) + 1000}`,
      channel: "manual",
      id: Math.random().toString(36).substr(2, 9),
      created_date: new Date().toISOString(),
    });
  };

  const inputCls = "w-full bg-transparent border-0 border-b border-black/[0.1] py-2 font-body text-ec-dark focus:outline-none focus:border-[#F8C840] transition-colors placeholder-black/25";
  const selectCls = "w-full bg-transparent border-0 border-b border-black/[0.1] py-2 font-body text-ec-dark focus:outline-none focus:border-[#F8C840] transition-colors";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 16 }}
        transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden min-w-0"
        onClick={e => e.stopPropagation()}
      >
        {/* Color bar */}
        <div className="h-2 bg-[#F8C840]" />

        {/* Header */}
        <div className="px-4 sm:px-6 pt-5 pb-4 flex items-start justify-between gap-4">
          <input
            value={form.clientName}
            onChange={e => setForm({ ...form, clientName: e.target.value })}
            placeholder="Nombre del cliente"
            autoFocus
            className="flex-1 font-heading text-2xl text-ec-dark bg-transparent border-0 border-b-2 border-transparent focus:border-[#F8C840] focus:outline-none placeholder-black/20 transition-colors pb-1"
            style={{ fontSize: '16px' }}
          />
          <button onClick={onClose} className="mt-1 w-8 h-8 flex items-center justify-center rounded-full text-ec-text-muted hover:bg-ec-cream hover:text-ec-dark transition-all text-lg flex-shrink-0">✕</button>
        </div>

        <div className="px-4 sm:px-6 pb-6 space-y-0">

          {/* Date & Time row */}
          <div className="flex items-center gap-3 py-3 border-b border-black/[0.05]">
            <svg className="text-ec-text-muted flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <input
                type="date"
                value={form.selectedDate}
                onChange={e => setForm(f => ({ ...f, selectedDate: e.target.value }))}
                className="font-body text-sm text-ec-dark bg-ec-cream hover:bg-[#F8C840]/10 px-3 py-1.5 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-[#F8C840]/40 cursor-pointer transition-colors"
                style={{ fontSize: '16px' }}
              />
              <select
                value={form.hour}
                onChange={e => setForm({ ...form, hour: parseInt(e.target.value) })}
                className="font-body text-sm text-ec-dark bg-ec-cream hover:bg-[#F8C840]/10 px-3 py-1.5 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-[#F8C840]/40 cursor-pointer transition-colors"
                style={{ fontSize: '16px' }}
              >
                {hours.map(h => {
                  const cnt = countAtHour(h);
                  const full = cnt >= MAX_BAYS;
                  return (
                    <option key={h} value={h}>
                      {h}:00{cnt > 0 ? ` · ${cnt}/${MAX_BAYS} bahías` : ''}{full ? ' — LLENO' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Phone row */}
          <div className="flex items-center gap-3 py-3 border-b border-black/[0.05]">
            <svg className="text-ec-text-muted flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 2.91 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/>
            </svg>
            <input
              value={form.clientPhone}
              onChange={e => setForm({ ...form, clientPhone: e.target.value })}
              placeholder="Teléfono del cliente"
              className={inputCls}
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Traslado row */}
          <div className="flex items-center gap-3 py-3 border-b border-black/[0.05]">
            <svg className="text-ec-text-muted flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/><rect x="9" y="11" width="14" height="10" rx="1"/><circle cx="12" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            </svg>
            <select
              value={form.traslado}
              onChange={e => setForm(f => ({ ...f, traslado: e.target.value }))}
              className={selectCls}
              style={{ fontSize: '16px' }}
            >
              <option value="">Sin traslado (cliente trae y recoge)</option>
              <option value="Solo recogida">Solo recogida · $7.000</option>
              <option value="Solo entrega">Solo entrega · $7.000</option>
              <option value="Recogida y entrega">Recogida y entrega · $9.000</option>
            </select>
          </div>

          {/* Vehicle & Service row */}
          <div className="flex items-center gap-3 py-3 border-b border-black/[0.05]">
            <div className="flex gap-2 flex-1 min-w-0">
              <select
                value={form.vehicleType}
                onChange={e => handleVehicleChange(e.target.value)}
                className="flex-shrink-0 font-body text-sm text-ec-dark bg-ec-cream px-3 py-1.5 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-[#F8C840]/40 cursor-pointer"
                style={{ fontSize: '16px' }}
              >
                <option value="Carro">🚗 Carro</option>
                <option value="Camioneta">🚙 Camioneta</option>
                <option value="Moto">🏍️ Moto</option>
              </select>
              <select
                value={form.service}
                onChange={e => handleServiceChange(e.target.value)}
                className="flex-1 min-w-0 font-body text-sm text-ec-dark bg-transparent border-0 border-b border-black/[0.1] focus:outline-none focus:border-[#F8C840] transition-colors cursor-pointer"
                style={{ fontSize: '16px' }}
              >
                {allServices.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Duration row */}
          <div className="flex items-center gap-3 py-3 border-b border-black/[0.05]">
            <svg className="text-ec-text-muted flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <div className="flex-1 flex items-center gap-2 flex-wrap">
              {isVariableDuration ? (
                <>
                  <span className="font-ui text-[10px] tracking-[0.15em] uppercase text-ec-text-muted">Duración estimada</span>
                  <input
                    type="number"
                    min="1"
                    max="96"
                    value={form.durationHours}
                    onChange={e => setForm(f => ({ ...f, durationHours: e.target.value }))}
                    placeholder="Horas"
                    className="w-20 font-body text-sm text-ec-dark bg-ec-cream px-2 py-1 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-[#F8C840]/40 text-center"
                    style={{ fontSize: '16px' }}
                  />
                  <span className="font-body text-sm text-ec-text-muted">horas</span>
                  <span className="font-ui text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 bg-purple-50 text-purple-500 border border-purple-200 rounded-full">Según cotización</span>
                </>
              ) : (
                <>
                  <span className="font-ui text-[10px] tracking-[0.15em] uppercase text-ec-text-muted">Duración</span>
                  <span className="font-body text-sm text-ec-dark font-medium">
                    {SERVICE_DURATION_DISPLAY[form.service] || "Consultar"}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Price row */}
          <div className="flex items-center gap-3 py-3 border-b border-black/[0.05]">
            <svg className="text-ec-text-muted flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
              {isCotizacion ? (
                <>
                  <span className="font-ui text-[9px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 border border-purple-200">Por cotización</span>
                  <input
                    type="number"
                    min="0"
                    value={form.manualPrice}
                    onChange={e => setForm(f => ({ ...f, manualPrice: e.target.value }))}
                    placeholder="Precio acordado (opcional)"
                    className="flex-1 font-body text-sm text-ec-dark bg-ec-cream px-3 py-1.5 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-purple-300 min-w-0"
                    style={{ fontSize: '16px' }}
                  />
                </>
              ) : (
                <span className="font-body text-sm text-ec-text-muted">{formatCOP(basePrice)}</span>
              )}
              <div className="flex items-center gap-1.5">
                <span className="font-ui text-[10px] text-ec-text-muted uppercase tracking-wider">Descuento</span>
                <input
                  type="number"
                  min="0"
                  max={basePrice || undefined}
                  value={form.discount || ""}
                  onChange={e => setForm(f => ({ ...f, discount: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                  className="w-20 font-body text-sm text-ec-dark bg-ec-cream px-2 py-1 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-[#F8C840]/40 text-center"
                  style={{ fontSize: '16px' }}
                />
              </div>
              {(basePrice > 0) && (
                <span className={`font-heading text-base font-bold ${hasDiscount ? "text-[#B8860B]" : "text-ec-dark"}`}>
                  = {formatCOP(finalPrice)}
                </span>
              )}
            </div>
          </div>

          {/* Status row */}
          <div className="flex items-center gap-3 py-3">
            <svg className="text-ec-text-muted flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <select
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
              className="font-body text-sm text-ec-dark bg-ec-cream px-3 py-1.5 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-[#F8C840]/40 cursor-pointer"
              style={{ fontSize: '16px' }}
            >
              <option value="confirmada">Confirmada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 pb-5">
          {isCapacityBlocked && (
            <p className="font-ui text-[9px] tracking-[0.15em] uppercase text-red-500 text-right mb-2">
              Bahías llenas a las {firstBlockedHour}:00 — elige otro horario
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-5 py-2.5 font-ui text-[10px] tracking-[0.2em] uppercase text-ec-text-muted hover:bg-ec-cream rounded-lg transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!form.clientName || !form.clientPhone || isCapacityBlocked}
              className="px-6 py-2.5 bg-[#F8C840] text-white font-ui text-[10px] tracking-[0.2em] uppercase rounded-lg hover:bg-[#e6b800] disabled:opacity-30 transition-all shadow-sm"
            >
              Guardar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Week view ────────────────────────────────────────────────────
function WeekView({ currentWeek, appointments, isAdmin, onAddAppointment, onUpdateStatus }) {
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)); // Mon-Sat

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Day headers */}
        <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: "48px repeat(6, 1fr)" }}>
          <div />
          {days.map(day => (
            <div key={day.toISOString()} className={`text-center py-2 rounded-sm ${isToday(day) ? "bg-[#F8C840]/10" : ""}`}>
              <p className="font-ui text-[8px] tracking-[0.2em] text-ec-text-muted uppercase">
                {format(day, "EEE", { locale: es })}
              </p>
              <p className={`font-heading text-lg ${isToday(day) ? "text-[#F8C840]" : "text-ec-dark"}`}>
                {format(day, "d")}
              </p>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div>
          {Array.from({ length: HOUR_END_WEEKDAY - HOUR_START }, (_, i) => HOUR_START + i).map(hour => (
            <div key={hour} className="grid gap-1 mb-1" style={{ gridTemplateColumns: "48px repeat(6, 1fr)", minHeight: "52px" }}>
              <div className="flex items-start pt-1">
                <span className="font-ui text-[9px] tracking-wider text-ec-text-muted">{hour}:00</span>
              </div>
              {days.map(day => {
                const isSat = (getDay(day) + 6) % 7 === 5;
                const isAfterSatClose = isSat && hour >= HOUR_END_SATURDAY;
                const dayAppts = appointments.filter(a => isSameDate(a, day) && parseAppointmentHour(a) === hour && a.status !== 'cancelada');

                if (isAfterSatClose) {
                  return (
                    <div key={day.toISOString()} className="border-t border-black/[0.04] bg-black/[0.02] rounded-sm flex items-center justify-center">
                      <span className="font-ui text-[8px] text-ec-text-muted/30">cerrado</span>
                    </div>
                  );
                }

                return (
                  <div key={day.toISOString()} className={`border-t border-black/[0.04] p-1 rounded-sm min-h-[52px] ${isToday(day) ? "bg-[#F8C840]/[0.03]" : ""}`}>
                    {dayAppts.map((appt, i) => {
                      const color = getServiceColor(appt.service);
                      return (
                        <div
                          key={appt.id || i}
                          className="rounded-sm p-1.5 mb-1 border-l-2 text-[9px]"
                          style={{ borderLeftColor: color, background: color + "15" }}
                        >
                          <p className="font-bold text-ec-dark truncate">{appt.clientName || "Cliente"}</p>
                          <p className="text-ec-text-muted truncate">{appt.service}</p>
                        </div>
                      );
                    })}
                    {dayAppts.length === 0 && isAdmin && (
                      <button
                        onClick={() => onAddAppointment && onAddAppointment(day, hour)}
                        className="w-full h-full min-h-[40px] flex items-center justify-center text-ec-text-muted/20 hover:text-[#F8C840]/50 hover:bg-[#F8C840]/5 rounded-sm transition-all text-lg"
                      >
                        +
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main CalendarSection ─────────────────────────────────────────
export default function CalendarSection({ isAdmin = false, onOpenChat, openNewOnMount = false }) {
  const [view, setView] = useState("month"); // "month" | "week" | "day"
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalDay, setAddModalDay] = useState(null);
  const [addModalHour, setAddModalHour] = useState(null);

  useEffect(() => { loadAppointments(); }, [currentMonth]);

  useEffect(() => {
    if (openNewOnMount) {
      setAddModalDay(new Date());
      setAddModalHour(9);
      setShowAddModal(true);
    }
  }, [openNewOnMount]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const all = await db.appointments.list();
      setAppointments(all || []);
    } catch { setAppointments([]); }
    setLoading(false);
  };

  const handleSelectDay = (day) => {
    setSelectedDay(day);
    setView("day");
  };

  const handleAddAppointment = (day, hour) => {
    setAddModalDay(day);
    setAddModalHour(hour || 9);
    setShowAddModal(true);
  };

  const handleSaveAppointment = async (data) => {
    try {
      await db.appointments.create(data);
      await loadAppointments();
    } catch { }
    setShowAddModal(false);
  };

  const handleUpdateStatus = async (id, status) => {
    await db.appointments.update(id, { status });
    await loadAppointments();
  };

  const todayAppts = appointments.filter(a => isSameDate(a, new Date()) && a.status !== 'cancelada' && a.status !== 'cancelled');
  const confirmedAppts = appointments.filter(a => a.status !== 'cancelada' && a.status !== 'cancelled');

  // Bahías ocupadas en este momento (basado en hora actual y duración de servicio)
  const currentHour = new Date().getHours();
  const nowOccupied = todayAppts.filter(a => {
    const start = parseAppointmentHour(a);
    const dur = getServiceDuration(a.service);
    return currentHour >= start && currentHour < start + dur;
  }).length;

  // Public view (landing page)
  if (!isAdmin) {
    return (
      <section id="calendario" className="relative py-24 sm:py-32 px-4 sm:px-6 bg-ec-cream overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-8">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <span className="section-label mb-6 block">AGENDA EN VIVO</span>
              <h2 className="font-heading text-4xl sm:text-5xl md:text-6xl text-ec-dark font-light mt-6 leading-tight">
                Reserva tu <br /><span className="italic gold-gradient-text">Momento</span>
              </h2>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-sm">
              <p className="font-body text-sm text-ec-text-secondary leading-relaxed border-l-2 border-ec-gold/30 pl-6 font-light">
                Disponibilidad en tiempo real. Máximo <strong className="text-ec-dark">{MAX_BAYS} vehículos simultáneos</strong> para garantizar la perfección absoluta.
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="lg:col-span-7 bg-white border border-black/[0.06] p-5 sm:p-8 rounded-sm shadow-[0_4px_30px_rgba(0,0,0,0.06)]"
            >
              <div className="flex items-center justify-between mb-6">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="w-10 h-10 flex items-center justify-center border border-black/[0.06] hover:border-[#F8C840]/30 transition-all text-[#F8C840] rounded-sm">←</button>
                <h3 className="font-heading text-lg text-ec-dark capitalize">{format(currentMonth, "MMMM yyyy", { locale: es })}</h3>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="w-10 h-10 flex items-center justify-center border border-black/[0.06] hover:border-[#F8C840]/30 transition-all text-[#F8C840] rounded-sm">→</button>
              </div>
              <MonthGrid currentMonth={currentMonth} selectedDay={selectedDay} appointments={appointments} onSelectDay={handleSelectDay} />
            </motion.div>

            <motion.div
              layout
              className="lg:col-span-5 bg-white border border-black/[0.06] p-5 sm:p-8 rounded-sm shadow-[0_4px_30px_rgba(0,0,0,0.06)] min-h-[300px]"
            >
              {!selectedDay ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <div className="w-16 h-16 mb-6 border border-[#F8C840]/20 flex items-center justify-center rounded-sm bg-[#F8C840]/[0.04]">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#F8C840]/60">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <p className="font-heading text-lg text-ec-dark mb-2">Selecciona un día</p>
                  <p className="font-body text-sm text-ec-text-muted font-light">Toca cualquier día disponible para ver los cupos.</p>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    <p className="font-ui text-[9px] tracking-[0.3em] text-[#F8C840] uppercase">{format(selectedDay, "EEEE", { locale: es })}</p>
                    <h4 className="font-heading text-2xl text-ec-dark capitalize">{format(selectedDay, "d 'de' MMMM", { locale: es })}</h4>
                  </div>
                  {onOpenChat && (
                    <button
                      onClick={onOpenChat}
                      className="w-full py-4 bg-[#F8C840] text-white font-ui text-[11px] tracking-[0.3em] uppercase font-bold rounded-sm hover:shadow-[0_4px_20px_rgba(248,200,64,0.3)] transition-all"
                    >
                      RESERVAR POR CHAT →
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>
    );
  }

  // ── Admin view ─────────────────────────────────────────────────
  return (
    <div className="space-y-4 w-full overflow-x-hidden">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { value: todayAppts.length, occupancy: nowOccupied, label: "Hoy", sublabel: `${MAX_BAYS - nowOccupied} bahía${MAX_BAYS - nowOccupied !== 1 ? "s" : ""} libre${MAX_BAYS - nowOccupied !== 1 ? "s" : ""} ahora` },
          { value: confirmedAppts.length, label: "Confirmadas", sublabel: "total activas" },
          { value: appointments.filter(a => a.status === 'cancelada' || a.status === 'cancelled').length, label: "Canceladas", sublabel: "histórico" },
          { value: appointments.length, label: "Total", sublabel: "todas las citas" },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-black/[0.06] p-5 rounded-sm">
            <p className="font-heading text-5xl font-light text-ec-gold leading-none">{stat.value}</p>
            <p className="font-ui text-[10px] tracking-[0.2em] text-ec-dark uppercase mt-3">{stat.label}</p>
            <p className="font-ui text-[9px] text-ec-text-muted mt-0.5">{stat.sublabel}</p>
            {stat.occupancy !== undefined && (
              <div className="flex gap-1 mt-2" title={`${stat.occupancy}/${MAX_BAYS} bahías ocupadas ahora`}>
                {Array.from({ length: MAX_BAYS }).map((_, j) => (
                  <div key={j} className={`h-1 flex-1 rounded-full ${
                    j < stat.occupancy
                      ? stat.occupancy >= MAX_BAYS ? "bg-red-400" : "bg-[#F8C840]"
                      : "bg-black/[0.06]"
                  }`} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* View switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex gap-1 bg-white border border-black/[0.06] p-1 rounded-sm w-full sm:w-auto">
          {[
            { id: "month", label: "Mes" },
            { id: "week", label: "Semana" },
            { id: "day", label: "Día" },
          ].map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`px-4 py-2 font-ui text-[10px] tracking-[0.15em] uppercase rounded-sm transition-all ${view === v.id ? "bg-[#F8C840] text-white" : "text-ec-text-muted hover:text-ec-dark"
                }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-hidden">
          {view === "month" && (
            <>
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="w-9 h-9 border border-black/[0.06] flex items-center justify-center text-[#F8C840] rounded-sm hover:border-[#F8C840]/30 transition-all">←</button>
              <span className="font-heading text-base text-ec-dark capitalize min-w-[140px] text-center">{format(currentMonth, "MMMM yyyy", { locale: es })}</span>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="w-9 h-9 border border-black/[0.06] flex items-center justify-center text-[#F8C840] rounded-sm hover:border-[#F8C840]/30 transition-all">→</button>
            </>
          )}
          {view === "week" && (
            <>
              <button onClick={() => setCurrentWeek(addDays(currentWeek, -7))} className="w-9 h-9 border border-black/[0.06] flex items-center justify-center text-[#F8C840] rounded-sm hover:border-[#F8C840]/30 transition-all">←</button>
              <span className="font-heading text-base text-ec-dark min-w-[200px] text-center">
                {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), "d MMM", { locale: es })} – {format(addDays(startOfWeek(currentWeek, { weekStartsOn: 1 }), 5), "d MMM yyyy", { locale: es })}
              </span>
              <button onClick={() => setCurrentWeek(addDays(currentWeek, 7))} className="w-9 h-9 border border-black/[0.06] flex items-center justify-center text-[#F8C840] rounded-sm hover:border-[#F8C840]/30 transition-all">→</button>
            </>
          )}
          {view === "day" && selectedDay && (
            <>
              <button onClick={() => setSelectedDay(addDays(selectedDay, -1))} className="w-9 h-9 border border-black/[0.06] flex items-center justify-center text-[#F8C840] rounded-sm hover:border-[#F8C840]/30 transition-all">←</button>
              <span className="font-heading text-base text-ec-dark min-w-[200px] text-center capitalize">{format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}</span>
              <button onClick={() => setSelectedDay(addDays(selectedDay, 1))} className="w-9 h-9 border border-black/[0.06] flex items-center justify-center text-[#F8C840] rounded-sm hover:border-[#F8C840]/30 transition-all">→</button>
            </>
          )}
        </div>
      </div>

      {/* Calendar content */}
      <div className="bg-white border border-black/[0.06] p-5 sm:p-8 rounded-sm shadow-[0_4px_30px_rgba(0,0,0,0.04)] min-h-[500px]">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-[#F8C840] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {view === "month" && (
              <MonthGrid
                currentMonth={currentMonth}
                selectedDay={selectedDay}
                appointments={appointments}
                onSelectDay={(day) => { setSelectedDay(day); setView("day"); }}
              />
            )}
            {view === "week" && (
              <WeekView
                currentWeek={currentWeek}
                appointments={appointments}
                isAdmin={isAdmin}
                onAddAppointment={handleAddAppointment}
                onUpdateStatus={handleUpdateStatus}
              />
            )}
            {view === "day" && selectedDay && (
              <DayTimeline
                day={selectedDay}
                appointments={appointments}
                isAdmin={isAdmin}
                onAddAppointment={handleAddAppointment}
                onUpdateStatus={handleUpdateStatus}
              />
            )}
            {view === "day" && !selectedDay && (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="font-body text-ec-text-muted">Selecciona un día en la vista mensual</p>
                <button onClick={() => setView("month")} className="mt-4 font-ui text-[10px] tracking-[0.2em] text-[#F8C840] uppercase">← Ver mes</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add appointment modal */}
      <AnimatePresence>
        {showAddModal && addModalDay && (
          <AddAppointmentModal
            day={addModalDay}
            defaultHour={addModalHour}
            appointments={appointments}
            onClose={() => setShowAddModal(false)}
            onSave={handleSaveAppointment}
          />
        )}
      </AnimatePresence>
    </div>
  );
}