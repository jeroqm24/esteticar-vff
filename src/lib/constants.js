// ═══════════════════════════════════════════
// ESTETICAR — CONSTANTS & DATA
// ═══════════════════════════════════════════

export const BRAND = {
  name: "Esteticar",
  tagline: "Custodia Vehicular Premium",
  location: "Calle 67 #9-26, La Sultana, Manizales",
  address: "Calle 67 #9-26, La Sultana, Manizales",
  whatsapp: "+57 315 607 1041",
  whatsappUrl: "https://wa.me/573156071041",
  instagram: "@esteticar_manizales",
  instagramUrl: "https://instagram.com/esteticar_manizales",
  facebook: "@esteticar.manizales",
  facebookUrl: "https://facebook.com/esteticar.manizales",
  email: "esteticar.manizales@gmail.com",
  logo: "https://media.base44.com/images/public/69d71feaff69c6491dc65ef1/daf49a66b_LOGOESTETICARNUEVO.png",
  hours: "Lunes a Viernes: 8:00 a.m. - 5:00 p.m. Sábados: 8:00 a.m. - 2:00 p.m.",
  heroLines: [
    "Cuidamos tu vehículo",
    "como si fuera nuestro.",
  ],
  heroSub: "Esto no es un lavado. Es custodia.",
  trustBreaker: "¿Nosotros? ¡Sí! Solo nosotros lo hacemos único.",
};

// Advisor names for the WhatsApp bot (random selection)
export const ADVISOR_NAMES = ["Camila", "Sofía", "Manuela", "Daniela"];

// Admin secret code to access admin from bot
export const ADMIN_SECRET = "ESTETICAR2026";

// Calendar / availability constants
export const MAX_BAYS = 3; // Max simultaneous vehicles per day
export const WORK_HOURS = { start: "08:00", end: "18:00" };
export const WORK_DAYS = [1, 2, 3, 4, 5, 6]; // Mon=1 ... Sat=6 (0=Sun, excluded)

export const NAV_ITEMS = [
  { label: "Servicios", href: "#servicios" },
  { label: "Protocolo", href: "#protocolo" },
  { label: "Transformación", href: "#transformacion" },
  { label: "Equipo", href: "#equipo" },
  { label: "VIP", href: "#vip" },
  { label: "Portafolio", href: "/portafolio" },
];

// ─── CAR SERVICES ────────────────────────────────
export const CAR_SERVICES = [
  {
    id: "lavada-esencial-carro",
    category: "car",
    name: "Lavada Esencial Carro",
    price: 49000,
    priceDisplay: "$49.000",
    time: "2 horas",
    durationHours: 2,
    description: "Lavado exterior meticuloso con protocolo de dos baldes, secado con microfibra premium y limpieza de rines.",
    why: "La base de todo tratamiento. Sin una limpieza profunda, cualquier protección es inútil.",
  },
  {
    id: "tratamiento-3en1-manual",
    category: "car",
    name: "Tratamiento 3 en 1 Manual",
    price: 290000,
    priceDisplay: "$290.000",
    time: "4-5 horas",
    durationHours: 5,
    description: "Descontaminación, corrección de brillo manual y sellado. Triple intervención en una sola sesión.",
    why: "Elimina micro-rayones, restaura profundidad y protege con un acabado que dura semanas.",
  },
  {
    id: "tratamiento-3en1-maquina",
    category: "car",
    name: "Tratamiento 3 en 1 a Máquina",
    price: 350000,
    priceDisplay: "$350.000",
    time: "5-6 horas",
    durationHours: 6,
    description: "Corrección profesional con pulidora orbital de doble acción. Máximo nivel de restauración de brillo.",
    why: "Para vehículos que necesitan corrección severa. Resultados de nivel concurso.",
  },
  {
    id: "brillado-maquina",
    category: "car",
    name: "Brillado a Máquina",
    price: 100000,
    priceDisplay: "$100.000",
    time: "2-3 horas",
    durationHours: 3,
    description: "Pulido profesional con máquina rotativa para obtener un reflejo perfecto tipo espejo.",
    why: "Cuando necesitas ese brillo imposible que solo consigue la máquina.",
  },
  {
    id: "mantenimiento-interior",
    category: "car",
    name: "Mantenimiento Interior",
    price: 280000,
    priceDisplay: "$280.000",
    time: "2 días",
    durationHours: 16, // 2 work days
    description: "Limpieza profunda de todo el interior: tablero, consolas, cielo, puertas, pisos y desinfección con ozono.",
    why: "Tu vehículo por dentro debe ser tan impecable como por fuera. Un interior limpio es salud.",
  },
  {
    id: "lavado-chasis",
    category: "car",
    name: "Lavado de Chasis",
    price: 59000,
    priceDisplay: "$59.000",
    time: "2 horas",
    durationHours: 2,
    description: "Desengrase y limpieza del chasis inferior, removiendo barro, grasa acumulada y residuos de carretera.",
    why: "Protege contra la corrosión y extiende la vida útil de los componentes mecánicos.",
  },
  {
    id: "lavado-techo",
    category: "car",
    name: "Lavado de Techo",
    price: 49000,
    priceDisplay: "$49.000",
    time: "1-2 horas",
    durationHours: 2,
    description: "Limpieza especializada del cielo raso del vehículo, eliminación de manchas y restauración de la tela.",
    why: "El techo acumula bacterias y olores. Un cielo limpio transforma el ambiente interior.",
  },
  {
    id: "lavado-cojineria",
    category: "car",
    name: "Lavado de Cojinería",
    price: 199000,
    priceDisplay: "$199.000",
    time: "1 día",
    durationHours: 8,
    description: "Lavado profundo de asientos con extractor, eliminación de manchas y neutralización de olores.",
    why: "Recupera la apariencia original de tus asientos. Ideal después de derrames o uso intensivo.",
  },
  {
    id: "descontaminacion-vidrios",
    category: "car",
    name: "Descontaminación de Vidrios",
    price: 60000,
    priceDisplay: "$60.000 – $250.000",
    time: "1-3 horas",
    durationHours: 3,
    description: "Remoción de contaminación férrica, cal y residuos adheridos a los vidrios para máxima visibilidad.",
    why: "Vidrios limpios no es solo estética. Es seguridad. Mejora la visibilidad nocturna hasta un 40%.",
  },
  {
    id: "restauracion-farolas",
    category: "car",
    name: "Restauración de Farolas",
    price: 180000,
    priceDisplay: "$180.000",
    time: "2-3 horas",
    durationHours: 3,
    description: "Pulido y sellado UV de farolas opacas. Restauración completa de transparencia y luminosidad.",
    why: "Farolas opacas reducen la iluminación hasta un 70%. Restaurarlas es proteger tu inversión.",
  },
  {
    id: "limpieza-motor",
    category: "car",
    name: "Limpieza Técnica de Motor",
    price: 49000,
    priceDisplay: "$49.000",
    time: "2 horas",
    durationHours: 2,
    description: "Limpieza especializada del motor con protocolo de seguridad riguroso que protege cada componente eléctrico y mecánico.",
    why: "No solo limpiamos, protegemos. Cada sensor y conector queda cubierto antes de aplicar cualquier producto.",
  },
  {
    id: "porcelanizado",
    category: "car",
    name: "Porcelanizado",
    price: 0,
    priceDisplay: "Bajo cotización",
    cotizacion: true,
    time: "2 días",
    durationHours: 16,
    description: "Acabado terso y brillo radiante que repele el polvo y el agua. Protección de 6 meses a 1 año que resalta el color original.",
    why: "Facilita el lavado diario y mantiene el color original radiante. Ideal para vehículos que quieren verse siempre recién salidos del concesionario.",
  },
  {
    id: "recubrimiento-ceramico",
    category: "car",
    name: "Recubrimiento Cerámico",
    price: 0,
    priceDisplay: "Bajo cotización",
    cotizacion: true,
    time: "2 días",
    durationHours: 16,
    description: "Protección de alta gama con tecnología avanzada. Brillo profundo y dureza superior contra químicos, rayos UV y micro-rayones hasta por 5 años.",
    why: "La inversión definitiva para mantener tu vehículo siempre como nuevo. Efecto hidrofóbico inigualable que ningún otro tratamiento logra.",
  },
];

// ─── MOTO SERVICES ────────────────────────────────
export const MOTO_SERVICES = [
  {
    id: "lavada-esencial-moto",
    category: "moto",
    name: "Lavada Esencial Moto",
    price: 49000,
    priceDisplay: "$49.000",
    time: "1-2 horas",
    durationHours: 2,
    description: "Lavado completo exterior con atención a motor, rines, guardabarros y todos los detalles de la moto.",
    why: "Mantener una moto limpia no es vanidad. Es prevenir corrosión y preservar su valor.",
  },
  {
    id: "tratamiento-3en1-manual-moto",
    category: "moto",
    name: "Tratamiento 3 en 1 Manual",
    price: 290000,
    priceDisplay: "$290.000",
    time: "3-4 horas",
    durationHours: 4,
    description: "Descontaminación, corrección de brillo manual y sellado en toda la carrocería de la moto. Triple intervención en una sola sesión.",
    why: "Devuelve la profundidad de color y protege la pintura de tu moto contra los elementos.",
  },
  {
    id: "tratamiento-3en1-maquina-moto",
    category: "moto",
    name: "Tratamiento 3 en 1 a Máquina",
    price: 350000,
    priceDisplay: "$350.000",
    time: "4-5 horas",
    durationHours: 5,
    description: "Corrección profesional con pulidora orbital de doble acción aplicada a la carrocería y tanque. Máxima restauración de brillo.",
    why: "Para motos que necesitan corrección severa. Resultados de concurso en tu motocicleta.",
  },
  {
    id: "brillado-tanque-moto",
    category: "moto",
    name: "Brillado de Tanque",
    price: 59000,
    priceDisplay: "$59.000",
    time: "1-2 horas",
    durationHours: 2,
    description: "Corrección y brillado del tanque de combustible, removiendo micro-rayones y restaurando el acabado.",
    why: "El tanque es la pieza más visible. Un tanque perfecto transforma la presencia de tu moto.",
  },
  {
    id: "brillado-farolas-moto",
    category: "moto",
    name: "Brillado de Farolas",
    price: 49000,
    priceDisplay: "$49.000",
    time: "1 hora",
    durationHours: 1,
    description: "Pulido profesional de la óptica de la farola para restaurar la transparencia y máxima luminosidad.",
    why: "Seguridad nocturna. Una farola transparente puede ser la diferencia entre ver y no ver.",
  },
  {
    id: "descontaminacion-tuberia",
    category: "moto",
    name: "Descontaminación de Tubería",
    price: 49000,
    priceDisplay: "$49.000",
    time: "1-2 horas",
    durationHours: 2,
    description: "Limpieza profunda del sistema de escape, remoción de residuos de combustión y restauración del brillo metálico.",
    why: "Tuberías limpias no solo lucen mejor; previenen la acumulación de depósitos corrosivos.",
  },
  {
    id: "porcelanizado-moto",
    category: "moto",
    name: "Porcelanizado",
    price: 0,
    priceDisplay: "Bajo cotización",
    cotizacion: true,
    time: "1-2 días",
    durationHours: 16,
    description: "Acabado terso y brillo radiante adaptado a la carrocería de la moto. Repele el polvo y el agua. Protección de 6 meses a 1 año.",
    why: "Facilita el lavado diario y mantiene el color de tu moto siempre radiante. Ideal para motos de alto valor.",
  },
  {
    id: "recubrimiento-ceramico-moto",
    category: "moto",
    name: "Recubrimiento Cerámico",
    price: 0,
    priceDisplay: "Bajo cotización",
    cotizacion: true,
    time: "1-2 días",
    durationHours: 16,
    description: "Protección cerámica de alta gama para motos. Dureza superior contra UV, químicos y micro-rayones hasta por 5 años.",
    why: "La inversión definitiva para preservar tu moto. El efecto hidrofóbico hace que el agua y el barro simplemente resbalen.",
  },
];

// Combined for easy access
export const SERVICES = [...CAR_SERVICES, ...MOTO_SERVICES];

// ─── PICKUP OPTIONS (Fixed pricing logic) ────────────────────────────────
// El cliente trae y recoge = GRATIS
// El cliente trae, nosotros entregamos = $7.000
// Nosotros recogemos y entregamos = $9.000
export const PICKUP_OPTIONS = [
  {
    id: "traer-recoger",
    label: "Traigo y recojo mi vehículo",
    price: 0,
    priceDisplay: "GRATIS",
    description: "Llevas tu vehículo a nuestro centro y lo recoges cuando esté listo.",
    confirmMsg: "llevarás tu vehículo y lo recogerás en nuestras instalaciones"
  },
  {
    id: "traer-entregar",
    label: "Yo lo llevo, ustedes lo entregan",
    price: 7000,
    priceDisplay: "$7.000",
    description: "Tú llevas tu vehículo a nuestro centro y te lo entregamos en tu casa.",
    confirmMsg: "llevarás tu vehículo y nosotros te lo entregaremos en tu domicilio"
  },
  {
    id: "recoger-entregar",
    label: "Recogida y entrega a domicilio",
    price: 9000,
    priceDisplay: "$9.000",
    description: "Recogemos tu vehículo en tu ubicación y te lo devolvemos cuando esté listo.",
    confirmMsg: "recogeremos tu vehículo en tu domicilio y te lo devolveremos allí"
  },
];

// ─── HERO TEXT ────────────────────────────────
export const HERO_LINES = [
  "No es solo un lavado.",
  "Es un protocolo de restauración y custodia.",
  "Diseñado para quienes exigen perfección en cada detalle.",
];

export const FINAL_CTA = {
  line1: "Tu vehículo ya no necesita",
  line2: "un lavado. Necesita un estándar.",
};

// ─── TEAM ────────────────────────────────
export const TEAM = [
  {
    name: "Sara Valencia",
    role: "Administradora",
    authority: "Gestión operativa y atención al cliente de primer nivel. Sara garantiza que cada proceso cumpla con los estándares Esteticar.",
    image: "/team-sara.webp",
  },
  {
    name: "Juan Quintero",
    role: "Experto Técnico",
    authority: "Especialista en corrección de pintura y restauración. Más de 5 años de experiencia en detailing profesional.",
    image: "/team-juan.webp",
  },
  {
    name: "Federico Cárdenas",
    role: "Experto Técnico",
    authority: "Maestro en protección cerámica e interiores. Formación continua en las últimas técnicas del sector.",
    image: "/team-federico.webp",
  },
  {
    name: "Jerónimo Quintero",
    role: "Estratega y desarrollador",
    authority: "Diseñador de la experiencia Esteticar. Responsable de elevar el estándar del detailing en Manizales.",
    image: "/team-jeronimo.webp",
  },
];

// ─── PROTOCOLS ────────────────────────────────
export const PROTOCOLS = [
  {
    id: "identidad-blindada",
    title: "Identidad Blindada",
    subtitle: "QR VALIDATION SYSTEM",
    description: "Cada vehículo recibe una identidad digital única al ingresar. Escaneo perimetral, registro fotográfico 360° y etiqueta de custodia inteligente.",
    details: [
      "Código QR único generado por vehículo",
      "Registro fotográfico en alta resolución",
      "Sistema de trazabilidad en tiempo real",
      "Vinculación digital propietario-vehículo",
    ],
  },
  {
    id: "protocolo-5m",
    title: "Protocolo 5M",
    subtitle: "GARANTÍA LEGAL",
    description: "Tu vehículo está protegido por nuestro sistema de garantía premium de hasta $5.000.000 COP durante toda su permanencia.",
    details: [
      "Póliza de responsabilidad civil activa",
      "Cobertura de hasta $5.000.000 COP",
      "Certificado digital de garantía",
      "Protección integral mientras esté en custodia",
    ],
  },
  {
    id: "transparencia-total",
    title: "Transparencia Total",
    subtitle: "MONITOREO EN TIEMPO REAL",
    description: "Sistema de vigilancia HD 24/7 con acceso remoto. Sabrás exactamente qué está pasando con tu vehículo en todo momento.",
    details: [
      "Cámaras HD de alta definición",
      "Acceso remoto vía WhatsApp",
      "Alertas de estado en tiempo real",
      "Zona de custodia climatizada",
    ],
  },
  {
    id: "salon-vip",
    title: "Salón VIP",
    subtitle: "EXPERIENCIA DE ESPERA",
    description: "Un espacio diseñado para quienes valoran su tiempo. Café premium, TV, biblioteca y ambiente de lounge exclusivo.",
    details: [
      "Café de especialidad gratuito",
      "Pantalla 4K con streaming",
      "Biblioteca y revistas premium",
      "WiFi de alta velocidad",
    ],
  },
];

// ─── TRANSFORMATIONS (BEFORE/AFTER) — Highest ticket services ────────────────
export const TRANSFORMATIONS = [
  {
    before: "/antes-1.webp",
    after: "/despues-1.webp",
    treatment: "Recubrimiento Cerámico",
    label: "BMW X7 — Recubrimiento Cerámico",
    tag: "RECUBRIMIENTO CERÁMICO",
    price: "$350.000",
    desc: "Sellado cerámico de alta resistencia que forma una capa de protección dura sobre la pintura. Brillo de espejo duradero, repelente al agua y resistente a rayones menores.",
    process: [
      "Prelavado con espuma activa para disolver contaminantes adheridos",
      "Descontaminación férrica y lavado de arcilla en toda la superficie",
      "Corrección de pintura en 3 pasos con pulidora orbital DA",
      "Sellado cerámico con protección UV de larga duración",
    ],
  },
  {
    before: "/motos/sucia.png?v=2",
    after: "/motos/limpia.png?v=2",
    treatment: "Porcelanizado",
    label: "Motocicletas — Porcelanizado",
    tag: "PORCELANIZADO DE MOTO",
    price: "$49.000 - $150.000",
    desc: "Tratamiento porcelanizado que devuelve y potencia el brillo original de la moto. Protección contra la oxidación, suciedad y rayos UV con acabado de exhibición.",
    process: [
      "Lavado profundo con énfasis en motor, cadena y guardabarros",
      "Descontaminación y restauración del brillo en el sistema de escape",
      "Corrección de micro-rayones y brillado en el tanque de combustible",
      "Aplicación de porcelanizado para sellado y protección duradera",
    ],
  },
  {
    before: "/antes-3.webp",
    after: "/despues-3.webp",
    treatment: "Tratamiento 3 en 1 a Máquina",
    label: "Camaro ZL1 — Tratamiento 3 en 1 a Máquina",
    tag: "TRATAMIENTO 3 EN 1 A MÁQUINA",
    price: "$280.000",
    desc: "Corrección profesional con pulidora orbital de doble acción en 3 pasos. De una pintura opaca con swirl marks a un acabado de showroom con brillo de espejo.",
    process: [
      "Prelavado y descontaminación completa de la superficie",
      "Corrección de pintura en 3 pasos con pulidora orbital DA",
      "Eliminación de swirl marks, micro-rayones y manchas de agua",
      "Sellado protector final para conservar el brillo conseguido",
    ],
  },
];

// Note: MAX_BAYS, WORK_HOURS, WORK_DAYS already exported above (lines 32-34)

// ─── WHATSAPP MESSAGE GENERATOR ────────────────────
export const generateWhatsAppMessage = (services, vehicleType, pickup) => {
  const servicesList = services.map(s => `• ${s.name} — ${s.priceDisplay}`).join('%0A');
  const total = services.reduce((sum, s) => sum + s.price, 0) + (pickup?.price || 0);
  return `Hola Esteticar, quiero reservar una cita para mi ${vehicleType === 'car' ? 'Carro' : 'Moto'}.%0A%0A*Servicios:*%0A${servicesList}%0A%0A*Entrega:* ${pickup?.label || 'No especificada'}%0A*Total estimado:* $${total.toLocaleString('es-CO')} COP%0A%0AQué fechas tienen disponibles?`;
};

// ─── VERIFICATION CODE GENERATOR ────────────────────
export const generateVerificationCode = (clientName) => {
  const base = clientName.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(" ")[0];
  const year = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 999) + 1;
  return `${base}${year}-${seq}`;
};
