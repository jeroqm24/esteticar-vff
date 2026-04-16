import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../lib/storage";
import { MAX_BAYS, WORK_HOURS, WORK_DAYS } from "../lib/constants";

import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  getDay,
  isBefore,
  startOfDay,
  addDays,
} from "date-fns";
import { es } from "date-fns/locale";

// ─── Time slot generation ────────────────────────────────────────────
// Lun–Vie: 08:00–17:00, citas cada hora
// Sábado:  08:00–14:00, citas cada hora
const WEEKDAY_SLOTS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
const SATURDAY_SLOTS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00"];

// Determine available bay count for a given day + time based on existing appointments
function getUsedBays(appointments, dateStr) {
  return appointments.filter(
    (a) =>
      a.date === dateStr &&
      a.status !== "cancelled"
  ).length;
}

function getAvailabilityColor(used, max = MAX_BAYS) {
  const free = max - used;
  if (free <= 0) return "full";
  if (free === 1) return "last";
  return "open";
}

// ─── Day cell ─────────────────────────────────────────────────────────
function DayCell({ day, isSelected, appointments, onSelect, pastDay, isSunday }) {
  const dateStr = format(day, "yyyy-MM-dd");
  const used = getUsedBays(appointments, dateStr);
  const avail = getAvailabilityColor(used);
  const today = isToday(day);

  if (isSunday || pastDay) {
    return (
      <div className="aspect-square flex items-center justify-center opacity-25 cursor-not-allowed select-none">
        <span className="text-xs font-heading text-ec-text-muted">{format(day, "d")}</span>
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(day)}
      className={`relative aspect-square flex flex-col items-center justify-center transition-all duration-400 border rounded-sm text-xs font-heading ${
        isSelected
          ? "bg-ec-gold border-ec-gold shadow-[0_4px_15px_rgba(184,134,11,0.25)] scale-105"
          : today
          ? "border-ec-gold/40 bg-ec-gold/[0.06]"
          : avail === "full"
          ? "border-red-200 bg-red-50/50 cursor-not-allowed"
          : "border-transparent hover:border-black/[0.08] hover:bg-ec-cream"
      }`}
    >
      <span className={`${isSelected ? "text-white font-bold" : today ? "text-ec-gold font-bold" : avail === "full" ? "text-red-400" : "text-ec-dark"}`}>
        {format(day, "d")}
      </span>
      {/* Availability dots */}
      {!isSelected && avail !== "full" && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
          {Array.from({ length: MAX_BAYS - used }).map((_, i) => (
            <div key={i} className={`w-1 h-1 rounded-full ${avail === "last" ? "bg-amber-400" : "bg-green-400"}`} />
          ))}
        </div>
      )}
      {avail === "full" && !isSelected && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
          <div className="w-1 h-1 rounded-full bg-red-400" />
        </div>
      )}
      {isSelected && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
          <div className="w-1 h-1 rounded-full bg-white/60" />
        </div>
      )}
    </button>
  );
}

// ─── Main CalendarSection ─────────────────────────────────────────────
export default function CalendarSection({ isAdmin = false, onOpenChat }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayAppointments, setDayAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingStep, setBookingStep] = useState(null); // null | 'time'
  const [selectedTime, setSelectedTime] = useState(null);

  useEffect(() => { loadAppointments(); }, [currentMonth]);

  useEffect(() => {
    if (selectedDay) {
      const ds = format(selectedDay, "yyyy-MM-dd");
      const appts = appointments.filter((a) => a.date === ds && a.status !== "cancelled");
      setDayAppointments(appts);
      setBookingStep(null);
      setSelectedTime(null);
    }
  }, [selectedDay, appointments]);

  const loadAppointments = async () => {
    setLoading(true);
    const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");
    const data = await db.appointments.filter({ date: { $gte: start, $lte: end } });
    setAppointments(data);
    setLoading(false);
  };

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOfWeek = (getDay(startOfMonth(currentMonth)) + 6) % 7;
  const WEEK_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  const today = startOfDay(new Date());

  // Available times based on day of week
  const isSaturday = selectedDay ? (getDay(selectedDay) === 6) : false;
  const SLOT_HOURS = isSaturday ? SATURDAY_SLOTS : WEEKDAY_SLOTS;

  // Occupied time slots for selected day
  const usedTimes = dayAppointments.map((a) => a.time).filter(Boolean);

  // Available times (not fully occupied)
  const availableTimes = SLOT_HOURS.filter((h) => !usedTimes.includes(h));

  const handleReserveDay = () => {
    if (!selectedDay) return;
    setBookingStep("time");
  };

  const handleConfirmTime = (time) => {
    if (!selectedDay || !time) return;
    // Open bot chat with pre-filled context
    if (onOpenChat) onOpenChat();
  };

  const selectedDateStr = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null;
  const usedBays = selectedDateStr ? getUsedBays(appointments, selectedDateStr) : 0;
  const freeBays = MAX_BAYS - usedBays;
  const isFull = freeBays <= 0;

  return (
    <section id="calendario" className="relative py-24 sm:py-32 px-4 sm:px-6 bg-ec-cream overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 sm:mb-24 gap-8">
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

        {/* Calendar + Panel grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
          {/* ── Calendar grid ─────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="lg:col-span-7 bg-white border border-black/[0.06] p-5 sm:p-8 rounded-sm shadow-[0_4px_30px_rgba(0,0,0,0.06)]"
          >
            {/* Month nav */}
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="w-10 h-10 flex items-center justify-center border border-black/[0.06] hover:bg-ec-cream hover:border-ec-gold/30 transition-all text-ec-gold rounded-sm"
              >
                ←
              </button>
              <h3 className="font-heading text-lg sm:text-xl text-ec-dark capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: es })}
              </h3>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="w-10 h-10 flex items-center justify-center border border-black/[0.06] hover:bg-ec-cream hover:border-ec-gold/30 transition-all text-ec-gold rounded-sm"
              >
                →
              </button>
            </div>

            {/* Week header */}
            <div className="grid grid-cols-7 mb-3">
              {WEEK_DAYS.map((d) => (
                <div key={d} className="text-center">
                  <span className={`font-ui text-[9px] tracking-[0.2em] uppercase ${d === "Dom" ? "text-red-300" : "text-ec-text-muted"}`}>{d}</span>
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {Array(firstDayOfWeek).fill(null).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {days.map((day) => {
                const dayIndex = (getDay(day) + 6) % 7; // Mon=0 ... Sun=6
                const isSunday = dayIndex === 6;
                const pastDay = isBefore(startOfDay(day), today);
                return (
                  <DayCell
                    key={day.toISOString()}
                    day={day}
                    isSelected={selectedDay && isSameDay(day, selectedDay)}
                    appointments={appointments}
                    onSelect={setSelectedDay}
                    pastDay={pastDay}
                    isSunday={isSunday}
                  />
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-5 border-t border-black/[0.04] flex flex-wrap gap-4">
              {[
                { color: "bg-green-400", label: "Disponible" },
                { color: "bg-amber-400", label: "Último cupo" },
                { color: "bg-red-400", label: "Sin cupos" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${item.color}`} />
                  <span className="font-ui text-[9px] tracking-[0.2em] text-ec-text-muted uppercase">{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Day detail panel ──────────────────────────────── */}
          <motion.div
            layout
            className="lg:col-span-5 bg-white border border-black/[0.06] p-5 sm:p-8 rounded-sm shadow-[0_4px_30px_rgba(0,0,0,0.06)] min-h-[300px] flex flex-col"
          >
            {!selectedDay ? (
              /* No day selected */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 mb-6 border border-ec-gold/20 flex items-center justify-center rounded-sm bg-ec-gold/[0.04]">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ec-gold/60">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <p className="font-heading text-lg text-ec-dark mb-2">Selecciona un día</p>
                <p className="font-body text-sm text-ec-text-muted font-light">
                  Toca cualquier día disponible para ver los cupos y reservar.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-6 pb-5 border-b border-black/[0.04]">
                  <span className="font-ui text-[9px] tracking-[0.3em] text-ec-gold uppercase">
                    {format(selectedDay, "EEEE", { locale: es })} · Disponibilidad
                  </span>
                  <h4 className="font-heading text-2xl sm:text-3xl text-ec-dark mt-1 capitalize">
                    {format(selectedDay, "d 'de' MMMM", { locale: es })}
                  </h4>

                  {/* Capacity bar */}
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex gap-1.5">
                      {Array.from({ length: MAX_BAYS }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-2 flex-1 w-8 rounded-full transition-all ${
                            i < usedBays ? "bg-ec-gold" : "bg-black/[0.06]"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-ui text-[10px] tracking-[0.2em] text-ec-text-muted uppercase">
                      {isFull ? "Sin cupos" : `${freeBays} cupo${freeBays !== 1 ? "s" : ""} libre${freeBays !== 1 ? "s" : ""}`}
                    </span>
                  </div>
                </div>

                {/* Time picker step */}
                <AnimatePresence mode="wait">
                  {bookingStep === "time" ? (
                    <motion.div
                      key="time"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 flex flex-col"
                    >
                      <p className="font-ui text-[10px] tracking-[0.3em] text-ec-gold uppercase mb-4">Elige tu hora</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 flex-1">
                        {SLOT_HOURS.map((h) => {
                          const taken = usedTimes.includes(h);
                          return (
                            <button
                              key={h}
                              disabled={taken}
                              onClick={() => setSelectedTime(h)}
                              className={`py-3 px-2 border font-ui text-[11px] tracking-wider rounded-sm transition-all duration-300 ${
                                taken
                                  ? "border-black/[0.04] bg-black/[0.03] text-ec-text-muted/40 cursor-not-allowed line-through"
                                  : selectedTime === h
                                  ? "bg-ec-gold text-white border-ec-gold font-bold"
                                  : "border-ec-gold/30 text-ec-gold bg-ec-gold/[0.04] hover:bg-ec-gold hover:text-white"
                              }`}
                            >
                              {h}
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-5 flex gap-3">
                        <button
                          onClick={() => setBookingStep(null)}
                          className="px-4 py-3 font-ui text-[10px] tracking-[0.2em] text-ec-text-muted border border-black/[0.06] uppercase hover:bg-ec-cream transition-all rounded-sm"
                        >
                          ← Atrás
                        </button>
                        <button
                          onClick={() => selectedTime && handleConfirmTime(selectedTime)}
                          disabled={!selectedTime}
                          className="flex-1 py-3 font-ui text-[10px] tracking-[0.2em] uppercase font-bold transition-all disabled:opacity-25 rounded-sm flex items-center justify-center gap-2"
                          style={{ background: selectedTime ? "#128C7E" : undefined, color: selectedTime ? "#fff" : undefined }}
                        >
                          CONFIRMAR CITA
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="detail" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
                      {/* Appointments list */}
                      <div className="flex-1 space-y-3 mb-5">
                        {dayAppointments.length === 0 ? (
                          <div className="flex flex-col items-center justify-center text-center p-6 border border-dashed border-black/[0.06] rounded-sm h-32">
                            <p className="font-body text-sm text-ec-text-muted italic font-light">
                              Disponibilidad completa este día. <br />¡Reserva ahora!
                            </p>
                          </div>
                        ) : (
                          dayAppointments.map((a, i) => (
                            <div key={a.id} className="p-4 bg-ec-cream border border-black/[0.06] rounded-sm flex items-center gap-3">
                              <div className="w-8 h-8 bg-ec-gold/10 rounded-sm flex items-center justify-center text-ec-gold shrink-0">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
                                </svg>
                              </div>
                              <div className="flex-1">
                                <p className="font-ui text-xs tracking-wider text-ec-dark">{a.time || "Hora por confirmar"}</p>
                                <p className="font-body text-xs text-ec-text-muted mt-0.5">
                                  {isAdmin ? a.client_name : "Slot Ocupado"}
                                </p>
                              </div>
                              <div className={`w-2 h-2 rounded-full ${a.status === "completed" ? "bg-green-400" : a.status === "cancelled" ? "bg-red-400" : "bg-ec-gold"}`} />
                            </div>
                          ))
                        )}
                      </div>

                      {/* CTA */}
                      {!isAdmin && !isFull && (
                        <button
                          onClick={handleReserveDay}
                          className="w-full py-4 bg-ec-gold text-white font-ui text-[11px] tracking-[0.3em] uppercase font-bold transition-all duration-300 hover:shadow-[0_4px_20px_rgba(184,134,11,0.3)] rounded-sm"
                        >
                          RESERVAR ESTE DÍA →
                        </button>
                      )}
                      {!isAdmin && isFull && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-sm text-center">
                          <p className="font-ui text-[10px] tracking-[0.2em] text-red-400 uppercase">Día completamente ocupado</p>
                          <p className="font-body text-xs text-red-300 mt-1 font-light">Selecciona otro día disponible</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>
        </div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 grid grid-cols-3 border border-black/[0.06] divide-x divide-black/[0.06] bg-white rounded-sm overflow-hidden"
        >
          {[
            { value: `${MAX_BAYS}`, label: "Máx. simultáneos" },
            { value: "Lun–Sáb", label: "Días hábiles" },
            { value: "8AM–5PM", label: "L–V · 8AM–2PM Sáb" },
          ].map((stat) => (
            <div key={stat.label} className="py-5 sm:py-6 text-center px-2">
              <p className="font-heading text-xl sm:text-2xl text-ec-gold">{stat.value}</p>
              <p className="font-ui text-[8px] sm:text-[9px] tracking-[0.2em] text-ec-text-muted uppercase mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
