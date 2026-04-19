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

// Duration in hours by service name
const SERVICE_DURATIONS = {
  "Lavada Esencial": 2,
  "Lavado de Techo": 2,
  "Lavado de Chasis": 2,
  "Brillado Farolas": 1,
  "Descontaminación de Tubería": 2,
  "Brillado de Tanque": 2,
  "Descontaminación de Vidrios": 2,
  "Brillado a Máquina": 3,
  "Restauración de Farolas": 3,
  "Lavado de Cojinería": 8,
  "Mantenimiento Interior": 16,
  "Tratamiento 3 en 1 Manual": 5,
  "Tratamiento 3 en 1 a Máquina": 6,
  default: 2,
};

const getServiceDuration = (service) => {
  const key = Object.keys(SERVICE_DURATIONS).find(k => service?.includes(k));
  return SERVICE_DURATIONS[key] || SERVICE_DURATIONS.default;
};

// ─── Helpers ──────────────────────────────────────────────────────
const parseAppointmentHour = (appt) => {
  // Try to extract hour from date string
  const match = (appt.date || '').match(/(\d{1,2}):(\d{2})/);
  if (match) return parseInt(match[1]);
  if (appt.time) {
    const t = appt.time.match(/(\d{1,2})/);
    if (t) return parseInt(t[1]);
  }
  return 9; // default 9am
};

const parseAppointmentDate = (appt) => {
  // Try yyyy-MM-dd format
  const isoMatch = (appt.date || '').match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return new Date(appt.date.substring(0, 10));
  // Try "lunes, 21 de abril" format
  const today = new Date();
  return today;
};

const isSameDate = (appt, day) => {
  const apptDate = parseAppointmentDate(appt);
  return isSameDay(apptDate, day);
};

// ─── Status badge ─────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending: { label: "Pendiente", color: "#F8C840", bg: "#FFF8E7" },
  confirmed: { label: "Confirmada", color: "#22c55e", bg: "#f0fdf4" },
  completed: { label: "Completada", color: "#6366f1", bg: "#eef2ff" },
  cancelled: { label: "Cancelada", color: "#ef4444", bg: "#fef2f2" },
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

  return (
    <div>
      {/* Week headers */}
      <div className="grid grid-cols-7 mb-2">
        {WEEK_DAYS.map((d, i) => (
          <div key={d} className="text-center py-2">
            <span className={`font-ui text-[9px] tracking-[0.15em] uppercase ${i === 6 ? "text-red-300" : "text-ec-text-muted"}`}>{d}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
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
          const isFull = count >= MAX_BAYS;

          if (isSunday) {
            return (
              <div key={day.toISOString()} className="aspect-square flex items-center justify-center opacity-20">
                <span className="text-xs text-ec-text-muted">{format(day, "d")}</span>
              </div>
            );
          }

          return (
            <button
              key={day.toISOString()}
              onClick={() => !isPast && onSelectDay(day)}
              disabled={isPast}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-sm text-xs transition-all duration-200 ${isSelected
                ? "bg-[#F8C840] text-white shadow-[0_4px_12px_rgba(248,200,64,0.35)] scale-105"
                : isTod
                  ? "border border-[#F8C840]/50 bg-[#F8C840]/5 text-[#F8C840] font-bold"
                  : isPast
                    ? "opacity-25 cursor-not-allowed text-ec-text-muted"
                    : isFull
                      ? "bg-red-50 text-red-400 cursor-not-allowed"
                      : "hover:bg-ec-cream text-ec-dark hover:scale-105"
                }`}
            >
              <span className="font-heading text-sm">{format(day, "d")}</span>
              {count > 0 && !isSelected && (
                <div className="absolute bottom-1 flex gap-0.5">
                  {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                    <div key={i} className={`w-1 h-1 rounded-full ${isFull ? "bg-red-400" : count === 2 ? "bg-amber-400" : "bg-green-400"}`} />
                  ))}
                </div>
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

  // Group appointments by hour
  const apptsByHour = {};
  dayAppts.forEach(a => {
    const h = parseAppointmentHour(a);
    if (!apptsByHour[h]) apptsByHour[h] = [];
    apptsByHour[h].push(a);
  });

  const totalSlots = MAX_BAYS;
  const usedCount = dayAppts.length;

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
          {/* Capacity indicator */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSlots }).map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all ${i < usedCount ? "bg-[#F8C840]" : "bg-black/[0.08]"
                  }`}
              />
            ))}
            <span className="font-ui text-[9px] tracking-[0.15em] text-ec-text-muted ml-1">
              {totalSlots - usedCount} libres
            </span>
          </div>
          {isAdmin && usedCount < totalSlots && (
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

            return (
              <div key={hour} className="flex gap-3 mb-1" style={{ minHeight: `${SLOT_HEIGHT}px` }}>
                {/* Hour label */}
                <div className="w-12 flex-shrink-0 flex items-start pt-2">
                  <span className="font-ui text-[10px] tracking-wider text-ec-text-muted">
                    {hour}:00
                  </span>
                </div>

                {/* Slot area */}
                <div className="flex-1 border-t border-black/[0.04] pt-2 pb-2">
                  {hasAppts ? (
                    <div className="space-y-2">
                      {appts.map((appt, i) => {
                        const color = getServiceColor(appt.service);
                        const duration = getServiceDuration(appt.service);
                        const status = STATUS_CONFIG[appt.status] || STATUS_CONFIG.pending;

                        return (
                          <motion.div
                            key={appt.id || i}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-start gap-3 p-3 rounded-sm border-l-[3px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                            style={{ borderLeftColor: color }}
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
                              </div>
                              <p className="font-body text-xs text-ec-text-muted mt-0.5">{appt.service}</p>
                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                <span className="font-ui text-[9px] tracking-wider text-[#F8C840]">
                                  {appt.priceDisplay || appt.price}
                                </span>
                                <span className="font-ui text-[9px] tracking-wider text-ec-text-muted">
                                  ~{duration}h · {appt.vehicleType || "Vehículo"}
                                </span>
                                {appt.clientPhone && (
                                  <span className="font-ui text-[9px] tracking-wider text-ec-text-muted">
                                    {appt.clientPhone}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Code */}
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              <span className="font-mono text-[9px] text-ec-text-muted/60">
                                {appt.confirmationCode}
                              </span>
                              {isAdmin && (
                                <select
                                  value={appt.status || 'pending'}
                                  onChange={(e) => onUpdateStatus && onUpdateStatus(appt.id, e.target.value)}
                                  className="font-ui text-[8px] tracking-wider border border-black/[0.06] rounded-sm px-1 py-0.5 bg-white text-ec-text-muted focus:outline-none focus:border-[#F8C840]"
                                  style={{ fontSize: '9px' }}
                                >
                                  <option value="pending">Pendiente</option>
                                  <option value="confirmed">Confirmada</option>
                                  <option value="completed">Completada</option>
                                  <option value="cancelled">Cancelada</option>
                                </select>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-full flex items-center">
                      {isAdmin && usedCount < totalSlots ? (
                        <button
                          onClick={() => onAddAppointment && onAddAppointment(day, hour)}
                          className="w-full h-10 border border-dashed border-black/[0.08] rounded-sm text-ec-text-muted/30 font-ui text-[9px] tracking-wider hover:border-[#F8C840]/40 hover:text-[#F8C840]/60 transition-all flex items-center justify-center gap-1"
                        >
                          <span>+</span>
                        </button>
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
function AddAppointmentModal({ day, defaultHour, onClose, onSave }) {
  const [form, setForm] = useState({
    clientName: "",
    clientPhone: "",
    service: "Lavada Esencial Carro",
    vehicleType: "Carro",
    hour: defaultHour || 9,
    status: "confirmed",
    priceDisplay: "",
  });

  const CAR_SERVICES = [
    "Lavada Esencial Carro", "Brillado a Máquina", "Lavado de Chasis",
    "Lavado de Techo", "Descontaminación de Vidrios", "Restauración de Farolas",
    "Lavado de Cojinería", "Mantenimiento Interior",
    "Tratamiento 3 en 1 Manual", "Tratamiento 3 en 1 a Máquina",
  ];
  const MOTO_SERVICES = [
    "Lavada Esencial Moto", "Brillado de Farolas", "Brillado de Tanque", "Descontaminación de Tubería",
  ];

  const allServices = form.vehicleType === "Carro" ? CAR_SERVICES : MOTO_SERVICES;
  const isSaturday = (getDay(day) + 6) % 7 === 5;
  const hourEnd = isSaturday ? HOUR_END_SATURDAY : HOUR_END_WEEKDAY;
  const hours = Array.from({ length: hourEnd - HOUR_START }, (_, i) => HOUR_START + i);

  const handleSubmit = () => {
    if (!form.clientName || !form.clientPhone) return;
    const dateStr = format(day, "EEEE, d 'de' MMMM", { locale: es });
    const fullDate = `${dateStr} a las ${form.hour}:00`;
    onSave({
      ...form,
      date: fullDate,
      time: `${form.hour}:00`,
      confirmationCode: `EST-M${Math.floor(Math.random() * 9000) + 1000}`,
      channel: "manual",
      id: Math.random().toString(36).substr(2, 9),
      created_date: new Date().toISOString(),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-md rounded-sm shadow-2xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-ui text-[9px] tracking-[0.3em] text-[#F8C840] uppercase">Nueva Cita Manual</p>
            <h3 className="font-heading text-xl text-ec-dark capitalize">
              {format(day, "d 'de' MMMM", { locale: es })}
            </h3>
          </div>
          <button onClick={onClose} className="text-ec-text-muted hover:text-ec-dark text-xl">✕</button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-ui text-[9px] tracking-[0.2em] text-ec-text-muted uppercase block mb-1.5">Nombre</label>
              <input
                value={form.clientName}
                onChange={e => setForm({ ...form, clientName: e.target.value })}
                placeholder="Nombre del cliente"
                className="w-full px-3 py-2.5 border border-black/[0.1] rounded-sm font-body text-sm text-ec-dark focus:outline-none focus:border-[#F8C840] transition-colors"
              />
            </div>
            <div>
              <label className="font-ui text-[9px] tracking-[0.2em] text-ec-text-muted uppercase block mb-1.5">Teléfono</label>
              <input
                value={form.clientPhone}
                onChange={e => setForm({ ...form, clientPhone: e.target.value })}
                placeholder="3XX XXX XXXX"
                className="w-full px-3 py-2.5 border border-black/[0.1] rounded-sm font-body text-sm text-ec-dark focus:outline-none focus:border-[#F8C840] transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-ui text-[9px] tracking-[0.2em] text-ec-text-muted uppercase block mb-1.5">Vehículo</label>
              <select
                value={form.vehicleType}
                onChange={e => setForm({ ...form, vehicleType: e.target.value, service: e.target.value === "Carro" ? CAR_SERVICES[0] : MOTO_SERVICES[0] })}
                className="w-full px-3 py-2.5 border border-black/[0.1] rounded-sm font-body text-sm text-ec-dark focus:outline-none focus:border-[#F8C840] transition-colors"
              >
                <option>Carro</option>
                <option>Moto</option>
              </select>
            </div>
            <div>
              <label className="font-ui text-[9px] tracking-[0.2em] text-ec-text-muted uppercase block mb-1.5">Hora</label>
              <select
                value={form.hour}
                onChange={e => setForm({ ...form, hour: parseInt(e.target.value) })}
                className="w-full px-3 py-2.5 border border-black/[0.1] rounded-sm font-body text-sm text-ec-dark focus:outline-none focus:border-[#F8C840] transition-colors"
              >
                {hours.map(h => <option key={h} value={h}>{h}:00</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="font-ui text-[9px] tracking-[0.2em] text-ec-text-muted uppercase block mb-1.5">Servicio</label>
            <select
              value={form.service}
              onChange={e => setForm({ ...form, service: e.target.value })}
              className="w-full px-3 py-2.5 border border-black/[0.1] rounded-sm font-body text-sm text-ec-dark focus:outline-none focus:border-[#F8C840] transition-colors"
            >
              {allServices.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-ui text-[9px] tracking-[0.2em] text-ec-text-muted uppercase block mb-1.5">Precio</label>
              <input
                value={form.priceDisplay}
                onChange={e => setForm({ ...form, priceDisplay: e.target.value })}
                placeholder="$49.000"
                className="w-full px-3 py-2.5 border border-black/[0.1] rounded-sm font-body text-sm text-ec-dark focus:outline-none focus:border-[#F8C840] transition-colors"
              />
            </div>
            <div>
              <label className="font-ui text-[9px] tracking-[0.2em] text-ec-text-muted uppercase block mb-1.5">Estado</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2.5 border border-black/[0.1] rounded-sm font-body text-sm text-ec-dark focus:outline-none focus:border-[#F8C840] transition-colors"
              >
                <option value="pending">Pendiente</option>
                <option value="confirmed">Confirmada</option>
                <option value="completed">Completada</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-black/[0.1] text-ec-text-muted font-ui text-[10px] tracking-[0.2em] uppercase rounded-sm hover:bg-ec-cream transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.clientName || !form.clientPhone}
            className="flex-1 py-3 bg-[#F8C840] text-white font-ui text-[10px] tracking-[0.2em] uppercase rounded-sm hover:bg-[#e6b800] disabled:opacity-30 transition-all"
          >
            Guardar Cita
          </button>
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
export default function CalendarSection({ isAdmin = false, onOpenChat }) {
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

  const todayAppts = appointments.filter(a => isSameDate(a, new Date()) && a.status !== 'cancelada');
  const pendingAppts = appointments.filter(a => a.status === 'pending');

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
          { value: todayAppts.length, max: MAX_BAYS, label: "Hoy", sublabel: `${MAX_BAYS - todayAppts.length} cupos libres` },
          { value: pendingAppts.length, label: "Pendientes", sublabel: "por confirmar" },
          { value: appointments.filter(a => a.status === 'confirmed').length, label: "Confirmadas", sublabel: "esta semana" },
          { value: appointments.filter(a => a.status === 'completed').length, label: "Completadas", sublabel: "histórico" },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-black/[0.06] p-4 rounded-sm">
            <p className="font-heading text-3xl text-ec-dark">{stat.value}</p>
            <p className="font-ui text-[10px] tracking-[0.2em] text-[#F8C840] uppercase mt-1">{stat.label}</p>
            <p className="font-ui text-[9px] text-ec-text-muted mt-0.5">{stat.sublabel}</p>
            {stat.max && (
              <div className="flex gap-1 mt-2">
                {Array.from({ length: stat.max }).map((_, j) => (
                  <div key={j} className={`h-1 flex-1 rounded-full ${j < stat.value ? "bg-[#F8C840]" : "bg-black/[0.06]"}`} />
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
            onClose={() => setShowAddModal(false)}
            onSave={handleSaveAppointment}
          />
        )}
      </AnimatePresence>
    </div>
  );
}