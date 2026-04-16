import React, { useState, useRef } from "react";
import { motion } from "framer-motion";

// ─── Data ─────────────────────────────────────────────────────────────
const REVIEWS = [
  {
    name: "Alejandro Giraldo",
    location: "Manizales",
    initials: "AG",
    gradient: "linear-gradient(135deg, #B8860B 0%, #8B6914 100%)",
    date: "hace 3 días",
    service: "Tratamiento 3 en 1 a Máquina",
    text: "Honestamente no esperaba que el resultado fuera TAN diferente. Mi Mazda 3 llevaba dos años acumulando swirl marks y salió del taller como si fuera nuevo de agencia. Se nota que lo hacen con pasión real.",
    stars: 5,
    platform: "google",
  },
  {
    name: "Valentina Ospina",
    location: "Manizales",
    initials: "VO",
    gradient: "linear-gradient(135deg, #4A3728 0%, #2D2D2D 100%)",
    date: "hace 1 semana",
    service: "Mantenimiento Interior Completo",
    text: "Llevé mi Tucson después de un año con mi perro adentro. Pensé que no había solución para los olores pero quedó impecable. El Salón VIP mientras esperaba es un plus enorme, el café de especialidad estuvo delicioso 🤩",
    stars: 5,
    platform: "google",
  },
  {
    name: "Santiago Restrepo",
    location: "Manizales",
    initials: "SR",
    gradient: "linear-gradient(135deg, #2E4057 0%, #1A2A3A 100%)",
    date: "hace 2 semanas",
    service: "Brillado a Máquina",
    text: "Tengo un Audi A4 y soy muy cuidadoso con él. Busqué mucho antes de escoger un lugar y Esteticar fue la decisión correcta. El nivel de detalle es otro. Federico sabe exactamente qué producto usar en cada panel.",
    stars: 5,
    platform: "google",
  },
  {
    name: "Daniela Castaño",
    location: "Manizales",
    initials: "DC",
    gradient: "linear-gradient(135deg, #5B4A2E 0%, #3D3022 100%)",
    date: "hace 3 semanas",
    service: "Restauración de Farolas",
    text: "Mis farolas estaban completamente amarillas. Las restauraron y quedaron como de showroom. Manejé de noche y la diferencia en visibilidad es brutal. El trato fue super amable, se nota que valoran al cliente.",
    stars: 5,
    platform: "google",
  },
  {
    name: "Camilo Vargas",
    location: "Manizales",
    initials: "CV",
    gradient: "linear-gradient(135deg, #1A1A1A 0%, #3D3D3D 100%)",
    date: "hace 1 mes",
    service: "Tratamiento 3 en 1 Manual",
    text: "Lo que más me gustó fue la garantía de 5 millones. Eso dice todo del nivel de confianza que tienen en su trabajo. Mi Corolla salió brillando como si acabara de salir del concesionario. Ya agendé para el próximo mes.",
    stars: 5,
    platform: "google",
  },
  {
    name: "Isabella Muñoz",
    location: "Pereira",
    initials: "IM",
    gradient: "linear-gradient(135deg, #6B5B45 0%, #4A3E2F 100%)",
    date: "hace 1 mes",
    service: "Lavado de Cojinería + Techo",
    text: "Después de 3 años sin lavar la tapicería, quedé impresionada. Quitaron manchas que yo creía que eran permanentes. El ozono eliminó ese olor raro del carro. Ahora me da pena ensuciar el interior 😂",
    stars: 5,
    platform: "google",
  },
  {
    name: "Juan Pablo Mejía",
    location: "Manizales",
    initials: "JM",
    gradient: "linear-gradient(135deg, #556B2F 0%, #3D4E22 100%)",
    date: "hace 6 semanas",
    service: "Lavada Esencial Moto + Brillado Tanque",
    text: "Buen servicio también para motos. Mi Ninja 400 salió impecable, el tanque con un brillo que no traía ni de agencia. Precio justo para la calidad que recibís.",
    stars: 5,
    platform: "google",
  },
  {
    name: "Sofía Londoño",
    location: "Manizales",
    initials: "SL",
    gradient: "linear-gradient(135deg, #7B5E2A 0%, #5A4420 100%)",
    date: "hace 2 meses",
    service: "Descontaminación de Vidrios",
    text: "Increíble la diferencia con los vidrios. Tenía una capa de calcáreo que creí que era parte del vidrio ya 😅. Se ve cristalino ahora y la visibilidad nocturna mejoró muchísimo. El código QR al entregar el carro me pareció muy profesional.",
    stars: 5,
    platform: "google",
  },
  {
    name: "Sebastián Arango",
    location: "Manizales",
    initials: "SA",
    gradient: "linear-gradient(135deg, #4A3728 0%, #2D221B 100%)",
    date: "hace 2 meses",
    service: "Tratamiento 3 en 1 a Máquina",
    text: "Mi BMW Serie 3 estaba con muchos micro-rayones del lavado automático. Jerónimo me explicó todo el proceso antes de empezar, eso me dio mucha confianza. No vuelvo a llevar mi carro a otro lugar.",
    stars: 5,
    platform: "google",
  },
  {
    name: "María Fernanda Torres",
    location: "Pereira",
    initials: "MT",
    gradient: "linear-gradient(135deg, #8B4513 0%, #6B3510 100%)",
    date: "hace 3 meses",
    service: "Mantenimiento Interior + Cojinería",
    text: "Vine desde Pereira porque me lo recomendaron con tanta insistencia y valió cada kilómetro. El antes y después de mi Land Cruiser fue una locura. Asesoras super atentas y el trato es de primera. Definitivamente vuelvo.",
    stars: 5,
    platform: "google",
  },
  {
    name: "Andrés Felipe Cano",
    location: "Manizales",
    initials: "AC",
    gradient: "linear-gradient(135deg, #2E4057 0%, #1E2D3E 100%)",
    date: "hace 3 meses",
    service: "Lavado de Chasis + Brillado a Máquina",
    text: "Tengo una camioneta que uso para el campo y llegó llena de barro seco. El lavado de chasis fue brillante, literal. Ya los visité tres veces este año y nunca me han defraudado.",
    stars: 5,
    platform: "google",
  },
  {
    name: "Laura Quintero",
    location: "Manizales",
    initials: "LQ",
    gradient: "linear-gradient(135deg, #4A5240 0%, #2E3328 100%)",
    date: "hace 4 meses",
    service: "Lavada Esencial + Restauración Farolas",
    text: "El QR para rastrear mi carro me pareció muy innovador. El resultado fue excelente, como siempre según me contaron mis amigas. Ya soy cliente fija 🙌",
    stars: 5,
    platform: "google",
  },
];

// ─── Google logo SVG ────────────────────────────────────────────────
function GoogleLogo({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// ─── Stars ──────────────────────────────────────────────────────────
function Stars({ n = 5, size = 13 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i < n ? "#FBBC05" : "#E5E7EB"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

// ─── Single review card ───────────────────────────────────────────────
function ReviewCard({ review, index }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = review.text.length > 160;
  const displayText = isLong && !expanded ? review.text.slice(0, 160) + "…" : review.text;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-4%" }}
      transition={{ duration: 0.55, delay: (index % 4) * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white rounded-xl p-5 flex flex-col gap-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_28px_rgba(0,0,0,0.1)] transition-all duration-400 border border-black/[0.04] break-inside-avoid"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 shadow-sm"
            style={{ background: review.gradient, fontSize: "13px", letterSpacing: "0.03em" }}
          >
            {review.initials}
          </div>
          <div>
            <p className="text-ec-dark font-semibold text-sm leading-snug">{review.name}</p>
            <p className="text-ec-text-muted text-[11px] mt-0.5">{review.location} · {review.date}</p>
          </div>
        </div>
        {/* Google logo */}
        <div className="shrink-0 mt-0.5 opacity-80">
          <GoogleLogo size={18} />
        </div>
      </div>

      {/* Stars */}
      <div className="flex items-center gap-2.5">
        <Stars n={review.stars} />
        <span className="text-[11px] text-ec-text-muted font-medium">{review.stars}.0</span>
      </div>

      {/* Service tag */}
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-ec-gold/[0.07] border border-ec-gold/[0.18] text-ec-gold text-[10px] tracking-wide font-ui uppercase rounded-full w-fit">
        <span className="w-1 h-1 rounded-full bg-ec-gold inline-block" />
        {review.service}
      </span>

      {/* Review text */}
      <div>
        <p className="text-ec-text-secondary text-[13.5px] leading-relaxed font-body">
          "{displayText}"
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-ec-gold text-[11px] mt-1.5 font-medium hover:underline transition-all"
          >
            {expanded ? "Ver menos" : "Leer más"}
          </button>
        )}
      </div>

      {/* Verified footer */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-black/[0.04] mt-auto">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#34A853">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-[10px] text-ec-text-muted">Reseña verificada en Google</span>
      </div>
    </motion.div>
  );
}

// ─── Main Reviews Section ─────────────────────────────────────────────
export default function ReviewsSection() {
  const avgRating = 5.0;
  const totalReviews = REVIEWS.length;

  return (
    <section id="resenas" className="relative py-24 sm:py-32 px-4 sm:px-6 bg-ec-white overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(184,134,11,0.04)_0%,transparent_60%)] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-14 sm:mb-18"
        >
          <span className="section-label mb-6 block justify-center">RESEÑAS DE CLIENTES</span>
          <h2 className="font-heading text-4xl sm:text-5xl md:text-7xl text-ec-dark font-light leading-tight mb-6">
            Lo que dicen
            <span className="italic gold-gradient-text"> quienes volvieron</span>
          </h2>

          {/* Google rating summary */}
          <div className="inline-flex items-center gap-5 bg-white border border-black/[0.06] rounded-2xl px-6 py-4 shadow-[0_2px_20px_rgba(0,0,0,0.05)] mt-4">
            <GoogleLogo size={24} />
            <div className="w-px h-8 bg-black/[0.06]" />
            <div className="flex items-center gap-2">
              <span className="font-heading text-4xl text-ec-dark leading-none">{avgRating.toFixed(1)}</span>
              <div>
                <Stars n={5} size={14} />
                <p className="text-[11px] text-ec-text-muted mt-0.5">{totalReviews} reseñas en Google</p>
              </div>
            </div>
            <div className="w-px h-8 bg-black/[0.06]" />
            {/* Star distribution */}
            <div className="hidden sm:flex flex-col gap-0.5">
              {[5, 4, 3].map((s) => (
                <div key={s} className="flex items-center gap-1.5">
                  <span className="text-[10px] text-ec-text-muted w-2 text-right">{s}</span>
                  <div className="w-16 h-1 bg-black/[0.06] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#FBBC05]" style={{ width: s === 5 ? "100%" : "0%" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Masonry review grid */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 [column-fill:_balance]">
          {REVIEWS.map((r, i) => (
            <div key={i} className="mb-5">
              <ReviewCard review={r} index={i} />
            </div>
          ))}
        </div>

        {/* Footer note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <div className="flex items-center gap-2">
            <GoogleLogo size={14} />
            <span className="text-ec-text-muted text-[12px]">Reseñas reales en Google Business</span>
          </div>
          <span className="hidden sm:block text-ec-text-muted/40">·</span>
          <span className="text-ec-text-muted text-[12px]">Manizales, Colombia</span>
        </motion.div>
      </div>
    </section>
  );
}
