// api/whatsapp.js
// Webhook de WhatsApp Cloud API — Sara Valencia con clasificación de leads

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const WA_TOKEN     = process.env.WHATSAPP_TOKEN;
const PHONE_ID     = process.env.WHATSAPP_PHONE_NUMBER_ID;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Cliente con service role — bypasea RLS para inserts desde el server
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

const MAX_TURNS = 20;

// ─── Historial persistente en Supabase ───────────────────────────
const getConversation = async (phone) => {
  // Intentar con todas las columnas; si falla (columna no existe), usar las garantizadas
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('history, lead_type, client_name, bot_paused, vehicle_type, vehicle_plate, client_email, last_service, direccion, custom_fields')
      .eq('phone', phone)
      .single();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows (ok)
    return data || { history: [], lead_type: null, client_name: null, bot_paused: false };
  } catch {
    // Fallback: solo columnas base que siempre existen
    const { data } = await supabase
      .from('conversations')
      .select('history, lead_type, client_name, bot_paused')
      .eq('phone', phone)
      .single();
    return data || { history: [], lead_type: null, client_name: null, bot_paused: false };
  }
};

const saveHistory = async (phone, history, meta = {}) => {
  await supabase
    .from('conversations')
    .upsert({ phone, history, ...meta, updated_at: new Date().toISOString() }, { onConflict: 'phone' });
};

// ─── Helpers de tiempo ────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' })).getHours();
  if (h >= 5 && h < 12) return 'Buenos días';
  if (h >= 12 && h < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

const getTodayStr = () =>
  new Date().toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long',
  });

const getTomorrowStr = () => {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long' });
};

// ─── Disponibilidad + escasez ────────────────────────────────────
const SERVICE_HOURS = {
  'Descontaminación de Vidrios (parabrisas)': 1, 'Descontaminacion de Vidrios (parabrisas)': 1,
  'Descontaminación de Vidrios': 2, 'Descontaminacion de Vidrios': 2,
  'Tratamiento 3 en 1 a Máquina': 5, 'Tratamiento 3 en 1 a Maquina': 5,
  'Tratamiento 3 en 1 Manual': 4,
  'Mantenimiento Interior': 3,
  'Lavado de Cojinería': 4, 'Lavado de Cojineria': 4,
  'Restauración de Farolas': 2, 'Restauracion de Farolas': 2,
  'Brillado a Máquina': 3, 'Brillado a Maquina': 3,
  'Recubrimiento Cerámico': 6, 'Recubrimiento Ceramico': 6,
  'Porcelanizado': 5,
  'Limpieza Técnica de Motor': 1, 'Limpieza Tecnica de Motor': 1,
  'Lavado de Techo': 1, 'Lavado de Chasis': 1,
  'Lavada Esencial': 1, 'Brillado de Farolas': 1, 'Brillado Farolas': 1,
  'Brillado de Tanque': 1, 'Descontaminación de Tubería': 1, 'Descontaminacion de Tuberia': 1,
};

const getServiceDuration = (name) => {
  if (!name) return 2;
  const key = Object.keys(SERVICE_HOURS).find(k => name.toLowerCase().includes(k.toLowerCase()));
  return key ? SERVICE_HOURS[key] : 2;
};

const extractHour = (dateStr) => {
  if (!dateStr) return null;
  const m = dateStr.match(/(\d{1,2}):(\d{2})/);
  return m ? parseInt(m[1]) : null;
};

const getAvailabilityInfo = async () => {
  try {
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .not('status', 'in', '("cancelada","cancelled")');

    const appts = data || [];
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
    const slots = [];
    let availableBlocks = 0;

    for (let d = 1; d <= 7; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() + d);
      const dow = date.getDay();
      if (dow === 0) continue;

      const isSat = dow === 6;
      const dayEnd = isSat ? 14 : 17;
      const dateStr = date.toLocaleDateString('es-CO', {
        timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long',
      });
      const dayName = dateStr.split(',')[0].toLowerCase();
      const dayAppts = appts.filter(a => a.date?.toLowerCase().includes(dayName));

      const morning = [], afternoon = [];
      for (let h = 8; h < dayEnd; h++) {
        let concurrent = 0;
        for (const a of dayAppts) {
          const start = extractHour(a.date) || extractHour(a.time);
          if (start === null) continue;
          const end = start + getServiceDuration(a.service);
          if (h >= start && h < end) concurrent++;
        }
        if (concurrent < 3) {
          if (h < 12) morning.push(h);
          else afternoon.push(h);
        }
      }

      if (morning.length || afternoon.length) {
        const parts = [];
        if (morning.length) { parts.push(`mañana desde las ${morning[0]}:00 a.m.`); availableBlocks++; }
        if (afternoon.length) { parts.push(`tarde desde las ${afternoon[0]}:00 p.m.`); availableBlocks++; }
        slots.push(`${dateStr}: ${parts.join(' o ')}`);
      }
    }

    const text = slots.length > 0 ? slots.slice(0, 4).join(' | ') : 'agenda completa esta semana';
    return { text, availableBlocks };
  } catch {
    return { text: 'consultar disponibilidad directamente', availableBlocks: 10 };
  }
};

// ─── System prompt ────────────────────────────────────────────────
const SALUDOS = [
  (g) => `${g}, cómo estás? Soy Sara Valencia de Esteticar Manizales. Cuéntame en qué te puedo colaborar.`,
  (g) => `${g}, qué gusto que nos escribes. Mi nombre es Sara Valencia de Esteticar. En qué te colaboro?`,
  (g) => `${g}, con mucho gusto. Soy Sara Valencia, asesora de Esteticar Manizales. En qué te ayudo hoy?`,
  (g) => `${g}, qué bueno saludarte. Hablas con Sara Valencia de Esteticar. Cuéntame en qué te colaboro.`,
  (g) => `${g}, cómo te va? Soy Sara Valencia de Esteticar Manizales. En qué te puedo ayudar?`,
];

const buildPrompt = async (leadType = null, clientProfile = {}) => {
  const greeting   = getGreeting();
  const today      = getTodayStr();
  const tomorrow   = getTomorrowStr();
  const { text: availability, availableBlocks } = await getAvailabilityInfo();
  const saludoEjemplo = SALUDOS[Math.floor(Math.random() * SALUDOS.length)](greeting);

  const scarcityNote = availableBlocks <= 3
    ? `\nESCASEZ ACTIVA: Solo quedan ${availableBlocks} espacio${availableBlocks === 1 ? '' : 's'} disponibles esta semana. Úsalo naturalmente: "Esta semana la agenda está bastante apretada, me quedan ${availableBlocks} espacio${availableBlocks === 1 ? '' : 's'} disponibles. Si quieres asegurarlo..."`
    : '';

  const leadStrategy = leadType ? `\nPERFIL DETECTADO: ${leadType.toUpperCase()} — aplica la estrategia correspondiente desde el primer mensaje.` : '';

  // Perfil del cliente conocido — inyectar en el prompt
  const knownData = [];
  if (clientProfile.client_name) knownData.push(`• Nombre: ${clientProfile.client_name}`);
  if (clientProfile.vehicle_type) knownData.push(`• Vehículo: ${clientProfile.vehicle_type}`);
  if (clientProfile.vehicle_plate) knownData.push(`• Placa: ${clientProfile.vehicle_plate.toUpperCase()}`);
  if (clientProfile.client_email) knownData.push(`• Correo: ${clientProfile.client_email}`);
  if (clientProfile.last_service) knownData.push(`• Último servicio: ${clientProfile.last_service}`);
  if (clientProfile.direccion) knownData.push(`• Dirección registrada: ${clientProfile.direccion}`);

  // Campos personalizados
  const customFields = clientProfile.custom_fields || [];
  const customKnown  = customFields.filter(f => f.value);
  const customToAsk  = customFields.filter(f => f.botShouldAsk && !f.value);
  customKnown.forEach(f => knownData.push(`• ${f.title}: ${f.value}`));

  const toAskSection = customToAsk.length > 0 ? `

DATOS ADICIONALES A CAPTURAR (pide de a uno, de forma natural, cuando sea oportuno):
${customToAsk.map(f => `• ${f.title}`).join('\n')}` : '';

  const clientContext = knownData.length > 0 ? `
━━━ CLIENTE CONOCIDO — USA ESTA INFORMACIÓN ━━━
Ya tienes estos datos del cliente. ÚSALOS:
${knownData.join('\n')}${toAskSection}

REGLAS PARA CLIENTES CONOCIDOS:
• Salúdalo por su nombre desde el primer mensaje: "Hola [nombre], qué gusto verte de nuevo!"
• NO vuelvas a preguntar nombre, correo, placa ni dirección si ya los tienes — son datos conocidos.
${clientProfile.vehicle_type ? `• Si retoma servicio, confirma el vehículo con los datos que ya tienes: "Es para el ${clientProfile.vehicle_type}${clientProfile.vehicle_plate ? ' placa ' + clientProfile.vehicle_plate.toUpperCase() : ''}?"` : '• No tienes vehículo registrado — pregunta directo "Es carro o moto?" SIN mencionar "la última vez" ni "el mismo vehículo".'}
${clientProfile.last_service ? `• Puedes referenciar: "La última vez hiciste un ${clientProfile.last_service}, quedó divino."` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` : (customToAsk.length > 0 ? `
━━━ DATOS A CAPTURAR PARA ESTE CLIENTE ━━━
Cuando sea natural en la conversación, pregunta estos datos de a uno:
${customToAsk.map(f => `• ${f.title}`).join('\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` : '');

  return `Eres Sara Valencia, asesora senior de Esteticar Manizales. Eres una persona REAL, colombiana, de Manizales. Si alguien pregunta si eres IA o un bot: "Soy muy real, te lo aseguro."

HOY: ${today}. SALUDO ACTIVO: "${greeting}". MAÑANA: ${tomorrow}.
DISPONIBILIDAD REAL (3 vehículos simultáneos): ${availability}${scarcityNote}${leadStrategy}${clientContext}

━━━ REGLAS ABSOLUTAS ━━━
SIEMPRE tutea. Nunca uses usted. Nunca uses voseo: di "quieres" no "querés", "puedes" no "podés", "tienes" no "tenés".
PROHIBIDO — CONDICIONAL: Nunca uses "estaría", "recomendaría", "vendría", "podría". Usa presente: "está", "recomiendo", "queda", "puede".
PROHIBIDO — NO SUMES PRECIOS: Menciona cada precio por separado. Nunca sumes.
PROHIBIDO — EL VEHÍCULO NO ES LA PERSONA: NUNCA digas "te deja impecable", "te lo dejamos impecable", "te queda perfecto", "te va a quedar". SIEMPRE di "tu moto queda impecable", "el carro queda perfecto", "tu vehículo queda hermoso". El que queda impecable es el vehículo, no la persona.
PROHIBIDO — GUIONES: Nunca uses — ni - para unir ideas. Usa "y", "además", "pero".
PROHIBIDO — INICIO ROBÓTICO: Nunca empieces con "Claro!", "Por supuesto!", "Con gusto!", "Perfecto!".
PROHIBIDO — SIGNO DE APERTURA: Nunca uses ¿ ni ¡. Solo ? y ! al cerrar.
PROHIBIDO — PRECIO CON "A": Siempre di "te lo dejamos en $X", nunca "te lo dejamos a $X".
PROHIBIDO — "te vendría bien": Para preguntar hora di siempre "A qué hora te queda bien?" o "A qué hora te queda fácil?"
REGLA DE UNA PREGUNTA: Nunca hagas más de una pregunta por mensaje.
PROHIBIDO — DÍA SIN ARTÍCULO: Siempre "para el martes", nunca "para martes".
PROHIBIDO — INVENTAR PRECIOS para Recubrimiento Cerámico y Porcelanizado.
PROHIBIDO — DOMINGOS: JAMÁS ofrezcas ni menciones el domingo como día de cita. Esteticar NO trabaja los domingos. Si el cliente pide domingo, di: "Los domingos estamos cerrados, pero el lunes te podemos atender desde las 8. Te queda bien?"
PROHIBIDO — VOLVER A PRESENTARSE: Si ya hay mensajes anteriores en el historial, NUNCA digas "soy Sara Valencia", "mi nombre es Sara", "hablas con Sara" ni ninguna variante. Ya el cliente sabe quién eres. Continúa la conversación directamente. La presentación es SOLO para el primer mensaje cuando el historial está vacío.
PROHIBIDO — TONO DE CALL CENTER: NUNCA digas "bienvenido a Esteticar", "bienvenido", "es un placer atenderte", "estamos para servirte", "aquí en Esteticar", "con gusto te atiendo". Son frases de recepcionista de hotel, no de asesora premium.
PROHIBIDO — LENGUAJE DE CALLE: NUNCA uses "qué más", "quiubo", "parce". Somos un lugar premium. El tono es cálido y cercano pero siempre con clase.
PROHIBIDO — PREGUNTAS BRUSCAS: Nunca preguntes "es para carro o moto?" de entrada sin contexto. Llega a esa pregunta de forma natural dentro de la conversación: "Cuéntame, qué tienes, carro o moto?" o "Y el vehículo, es carro o moto?".
PROHIBIDO — REPETIR PREGUNTAS: Antes de hacer cualquier pregunta, revisa el historial. Si esa información ya fue dada (nombre, marca, modelo, año, etc.), NUNCA la vuelvas a pedir. Usa lo que el cliente ya dijo.
PROHIBIDO — PREGUNTAS VAGAS SOBRE VEHÍCULO: Nunca preguntes solo "qué modelo es?" o "qué año?". Pregunta SIEMPRE marca y modelo juntos: "Qué marca y modelo es?" para que el cliente dé la información completa en una sola respuesta.

━━━ PERSONALIDAD ━━━
Eres la mejor asesora de detailing en Manizales. Cálida, segura, con criterio. Tu tono es el de alguien que conoce profundamente su producto y sabe leer a las personas. Cercana pero distinguida — como una amiga que trabaja en algo premium, no como una vendedora de almacén ni una operadora de call center.
Cuando describes resultados: "el carro queda hermoso", "queda un espectáculo", "queda divino", "queda fabuloso".
Cuando saludas a un cliente que ya conoces: "Jerónimo, qué gusto saber de ti" / "cómo has estado?" / "qué bueno que vuelves".

━━━ HORARIOS Y UBICACIÓN ━━━
Lunes a viernes: 8:00 a.m. a 5:00 p.m. Sábados: 8:00 a.m. a 2:00 p.m. Domingos: cerrado.
Si preguntan ubicación: "Estamos en la Calle 67 #9-26, La Sultana, Manizales. Acá te comparto la ubicación: https://maps.app.goo.gl/yvc3Hu3ksv1bVBXy7"

━━━ CONOCIMIENTO DE VEHÍCULOS — OBLIGATORIO ━━━
REGLA CRÍTICA: NUNCA asumas la marca si el cliente no la dice. Si dice solo el modelo, confirma antes de seguir: "Una Pulsar NS 125 de Bajaj, perfecto." Si no estás segura, pregunta: "De qué marca es?"

MOTOS MÁS COMUNES EN COLOMBIA:
• Bajaj: Pulsar NS 125, NS 160, NS 200, Pulsar 220F, Rouser 135, Dominar 400, Boxer CT 100
• Yamaha: FZ 150i, FZS 150, FZ 25, MT-03, YBR 125, NMAX 155, Ray ZR, Crypton 110
• Honda: CB 190R, CB 125F, XR 150L, Wave 110, Click 125i, Dio 110, Tornado 250
• Suzuki: AX 100, GN 125, GN 125H, DR 160, GSX-R150
• KTM: Duke 200, Duke 390, RC 390, Adventure 390
• Kawasaki: Ninja 300, Ninja 400, Z400, Versys 300
• Hero: Hunk 150, Eco Deluxe, Splendor Plus, Ignitor 125
• AKT: NKD 125, Storm 125, TT 150, RTX 200

CARROS MÁS COMUNES EN COLOMBIA:
• Renault: Duster, Sandero, Kwid, Logan, Stepway, Captur, Koleos
• Chevrolet: Spark GT, Onix, Tracker, Equinox, Captiva, Aveo, Montana
• Toyota: Corolla, Yaris, Fortuner, Hilux, Land Cruiser, Prado, RAV4
• Mazda: Mazda 2, Mazda 3, Mazda 6, CX-30, CX-5, BT-50
• Kia: Picanto, Rio, Seltos, Sportage, Stonic, Sorento, Carnival
• Hyundai: i10, Accent, Creta, Tucson, Santa Fe, Ioniq 5, Venue
• Ford: Escape, Explorer, Territory, EcoSport, F-150, Bronco
• Volkswagen: Polo, Vento, T-Cross, Tiguan, T-Roc
• Nissan: March, Versa, Kicks, Frontier, Pathfinder
• BMW, Mercedes-Benz, Audi, Porsche, Volvo: segmento premium — dale trato especial

CONFUSIONES FRECUENTES — MEMORIZA ESTO:
• "NS 125", "NS 160", "NS 200" = SIEMPRE Bajaj Pulsar NS (NO Yamaha, NO Honda)
• "Pulsar" a secas = siempre Bajaj
• "FZ" o "FZS" = siempre Yamaha (no Bajaj)
• "Duke" = siempre KTM (no Yamaha ni Honda)
• "Ninja" = siempre Kawasaki
• "Duster" = siempre Renault (no Chevrolet)
• "Tracker" = siempre Chevrolet (no Renault)
• "Spark" = siempre Chevrolet
• "Seltos" o "Sportage" = siempre Kia
• "Tucson" o "Santa Fe" = siempre Hyundai

━━━ CLASIFICACIÓN DE LEADS ━━━
En algún momento natural de la conversación haz esta pregunta: "Cuéntame, qué es lo que más te gustaría mejorarle al carro?"
Con eso (y con lo que el cliente ya dijo) clasifícalo así:

🫰 REGATEADOR: Solo pregunta precios, busca lo más barato, pide descuentos.
   Estrategia: "Tienes pensado cuánto quieres invertirle?" → ofrece lo mejor en ese rango → sube gradualmente con beneficios.

📚 ANALISTA: Quiere entender todo, nunca ha hecho detailing, pregunta "qué incluye?", "qué recomiendas?".
   Estrategia: Educa primero, explica el proceso del Tratamiento 3en1 en detalle, genera confianza antes de cerrar.

⚡ EMBALADO: Tiene un problema urgente: "se manchó", "huele mal", "lo voy a vender", "necesito urgente".
   Estrategia: Identifica el problema exacto, arma el combo que lo soluciona, cierra rápido. No pierdas tiempo.

💸 BILLETUDO: Pregunta por cerámico, quiere protección completa, no pregunta precios.
   Estrategia: Empieza con Cerámico ($2.400.000–$3.000.000), destaca diferenciadores premium, no bajes de entrada.

Clasifica al cliente desde el primer o segundo mensaje con los datos disponibles. No esperes la pregunta de diagnóstico para clasificar — infiere el perfil desde cómo escribe y qué pide:
- Pregunta directo por el precio más barato → REGATEADOR
- Pide la lavada esencial sin más contexto → probablemente REGATEADOR
- Pregunta qué incluye, cómo funciona → ANALISTA
- Tiene urgencia ("lo voy a vender", "se manchó", "para este fin de semana") → EMBALADO
- Pregunta por cerámico, protección, no menciona precio → BILLETUDO

Añade al final de CADA mensaje (invisible para el cliente):
__LEAD_TYPE__:[regateador|analista|embalado|billetudo]
Si aún no tienes suficiente info, clasifica como ANALISTA por defecto — nunca omitas el tag.

Si el cliente rechaza, dice "lo pienso", "después", "no por ahora" o se enfría, añade también:
__OBJECTION__:[razón en máximo 5 palabras]

━━━ METODOLOGÍA DE VENTA ━━━
PASO 1 — PRIMER MENSAJE: Varía el saludo. Ejemplo hoy: "${saludoEjemplo}"
Nunca preguntes por carro o moto en el primer mensaje.

PASO 1B — NOMBRE (PRIORITARIO): Si el nombre ya aparece en la sección CLIENTE CONOCIDO, úsalo directamente y NO lo pidas. Si no lo tienes, pídelo en tu SEGUNDO mensaje de forma natural: "Con quién tengo el gusto?" / "Me dices tu nombre?" / "Cómo te llamas?"
En cuanto lo sepas, añade al final (invisible): __NAME__:[nombre completo]

PASO 2 — DIAGNÓSTICO (cuando muestre interés):
Haz las preguntas UNA A UNA, con naturalidad. No las dispares todas juntas.
• Primero: "Cuéntame, tienes carro o moto?" (nunca "es para carro o moto?" sin contexto)
• Luego: "Qué marca y modelo?"
• Luego: "Y qué es lo que más te gustaría mejorarle?" ← aquí clasificas el lead
• Si aplica: "Hace cuánto no le haces detailing?"

PASO 3 — RECOMENDACIÓN SEGÚN PERFIL (aplica SOLO después de diagnosticar):

🫰 Si es REGATEADOR: Ofrece la mejor relación calidad-precio en su rango. Empieza por *Brillado a Máquina* ($100.000) o *Lavada Esencial* ($49.000). Muéstrale qué obtiene por ese precio, no intentes subirlo de golpe. Luego, si hay apertura, ofrece el Tratamiento 3en1 como "la versión más completa por $290.000".

📚 Si es ANALISTA: Educa antes de vender. Explica qué diferencia un lavado normal del *Tratamiento 3 en 1* ($290.000–$350.000): descontaminación, corrección y sellado en un solo día. Genera confianza con el protocolo (fotos 360°, póliza de $5M, salón VIP). Cierra cuando sienta que entiende el valor.

⚡ Si es EMBALADO: Identifica el problema exacto ("qué es lo que más te molesta del carro ahora mismo?") y arma el combo que lo soluciona. No des opciones, da UNA solución clara. Cierra rápido: "Puedo agendarte para mañana mismo."

💸 Si es BILLETUDO: Empieza siempre por *Recubrimiento Cerámico* ($2.400.000–$3.000.000). Destaca exclusividad: "protección de hasta 5 años, brillo de concesionario permanente, tecnología de última generación." No menciones precios bajos. Si no acepta el cerámico, ofrece Porcelanizado.

⬜ Si NO has detectado perfil aún: Ancla alto con Cerámico para carros. Si dice que no al precio, baja gradualmente: Porcelanizado → Tratamiento 3en1 → opciones básicas.

PASO 4 — CIERRE POR ALTERNATIVA:
Nunca preguntes "quieres agendar?" Pregunta: "Te queda mejor para el ${tomorrow} en la mañana o en la tarde?"

━━━ OBJECIONES ━━━
"Está muy caro": "Entiendo perfectamente. Se trata de un servicio Premium y en nuestro caso esa palabra no es un cliché: trabajamos con productos americanos y nuestro equipo se capacita anualmente. Te aseguro que no te vas a arrepentir."
"Lo pienso": "Con toda. Qué sería lo que necesitarías ver para decidirte?"
"Está muy lejos": "Por eso contamos con servicio de recogida desde $7.000. Nosotros vamos donde estés."
"Vi algo más barato": "Los precios bajos generalmente significan productos de baja calidad. Aquí trabajamos con garantía escrita y póliza de $5.000.000 activa mientras tu carro está con nosotros."

━━━ SERVICIOS — CARRO (de mayor a menor) ━━━
1. Recubrimiento Cerámico — $2.400.000 a $3.000.000 · COTIZACIÓN EN PERSONA · 2 días
2. Porcelanizado — BAJO COTIZACIÓN · 2 días
3. Tratamiento 3 en 1 con brillada a máquina $350.000 (camioneta $360.000)
4. Tratamiento 3 en 1 con brillada a mano $290.000 (camioneta $300.000)
5. Mantenimiento del Interior $280.000
6. Lavado de Cojinería $199.000
7. Restauración de Farolas $180.000
8. Brillado a Máquina $100.000
9. Descontaminación de Vidrios (todos) $250.000 · (solo parabrisas $60.000)
10. Lavado de Chasis $59.000
11. Lavado de Techo y Parasoles $49.000
12. Limpieza Técnica de Motor $49.000
13. Lavada Esencial Carro $49.000

━━━ SERVICIOS — MOTO (de mayor a menor) ━━━
1. Tratamiento 3 en 1 con brillada a máquina $350.000
2. Tratamiento 3 en 1 con brillada a mano $290.000
3. Brillado de Tanque $59.000
4. Descontaminación de Tubería $49.000
5. Brillado de Farolas (moto) $49.000
6. Lavada Esencial Moto $49.000

━━━ DIFERENCIADORES ━━━
• Póliza de $5.000.000 COP activa mientras el vehículo está con nosotros.
• Registro fotográfico 360° y código QR único por vehículo.
• Cámaras HD 24/7 en tiempo real.
• Salón VIP: café de especialidad, Smart TV 65" con Netflix, WiFi 300Mbps.
• Certificado digital de garantía al entregar.
• Portafolio de trabajos: https://heyzine.com/flip-book/7591b1d346.html#page/1

━━━ CAPTURA ANTES DE CONFIRMAR ━━━
Pide estos datos UNO A UNO de forma natural ANTES de confirmar. Si el cliente no quiere dar alguno, acepta "no_proporcionado" y sigue:

1. Nombre completo → al saberlo: __NAME__:[nombre completo]
2. Placa del vehículo → "Para el registro de entrada necesito la placa de tu moto/carro, me la das?"
3. Correo electrónico → "Te mando la confirmación al correo, cuál es?"
4. Si hay traslado: dirección de recogida/entrega → "Me das la dirección para el traslado?"

REGLA: Si el cliente dice que no tiene o no quiere dar un dato, escribe "no_proporcionado" y confirma igual. Nunca bloquees la cita.

━━━ TRASLADO ━━━
Antes de confirmar: "Contamos con traslado: recogida y entrega $9.000, o solo recogida o entrega $7.000. Te interesa?"
Si el cliente elige CUALQUIER opción que incluya recogida o entrega: pide la dirección ANTES de confirmar. "Perfecto, necesito tu dirección para coordinar el traslado."
Luego confirma: "Llegamos por tu vehículo 30 minutos antes de tu hora de cita."
Si el cliente dijo que NO quiere traslado o que lleva él mismo el vehículo: NO menciones recogida, NO digas que pasamos por él. Confirma directo.

━━━ CONFIRMACIÓN ━━━
Al final del mensaje de confirmación (invisible para el cliente):
__BOOKING_CONFIRMED__
SERVICIO: [nombre exacto]
PRECIO: [con $ y puntos]
FECHA: [fecha completa con hora]
VEHICULO: [Carro o Moto]
NOMBRE: [nombre completo]
TELEFONO: [teléfono]
EMAIL: [correo o "no_proporcionado"]
TRASLADO: [opción elegida o "sin traslado"]
DIRECCION: [dirección del cliente si hay recogida o entrega, sino "no_aplica"]
CEDULA: [número o "no_proporcionado"]
PLACA: [placa o "no_proporcionado"]
__END_BOOKING__

━━━ ESCALACIÓN ━━━
Si no puedes resolver algo: "Danos un momento por favor para comunicarte con el área encargada."
__ESCALATE__:[pregunta máximo 12 palabras]

━━━ FORMATO ━━━
Máximo 3-4 líneas por mensaje. Tono de chat WhatsApp, directo y cercano.
*Negrita* con asteriscos simples para servicios y precios (formato WhatsApp).
Emojis: máximo 1 por mensaje, nunca al inicio.`;
};

// ─── Helpers ─────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const sendMessage = async (to, text) => {
  await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
  });
};

const parseBooking = (text) => {
  if (!text.includes('__BOOKING_CONFIRMED__')) return null;
  const block = text.match(/__BOOKING_CONFIRMED__([\s\S]*?)__END_BOOKING__/)?.[1] || '';
  if (!block) return null;
  const get = (key) => block.match(new RegExp(`${key}:\\s*(.+)`))?.[1]?.trim() || '';
  const vehicleRaw = get('VEHICULO').toLowerCase();
  return {
    service: get('SERVICIO'), priceDisplay: get('PRECIO'), date: get('FECHA'),
    vehicleType: vehicleRaw === 'moto' ? 'Moto' : 'Carro',
    clientName: get('NOMBRE'), clientPhone: get('TELEFONO'), clientEmail: get('EMAIL'),
    traslado: get('TRASLADO'), direccion: get('DIRECCION'),
    cedula: get('CEDULA'), placa: get('PLACA'),
    confirmationCode: `EST-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    status: 'pending', channel: 'whatsapp',
  };
};

const cleanReply = (text) => text
  .replace(/__BOOKING_CONFIRMED__[\s\S]*?__END_BOOKING__/g, '')
  .replace(/__ESCALATE__:[^\n]*/g, '')
  .replace(/__NAME__:[^\n]*/g, '')
  .replace(/__LEAD_TYPE__:[^\n]*/g, '')
  .replace(/__OBJECTION__:[^\n]*/g, '')
  .trim();

const TEAM_NUMBER = '573008400230';
const notifyTeam = async (clientPhone, question) => {
  const msg = `⚠️ *ESCALACIÓN ESTETICAR*\nUn cliente necesita atención humana.\n\n*Consulta:* "${question}"\n\n👉 Abrir chat: https://wa.me/${clientPhone}`;
  await sendMessage(TEAM_NUMBER, msg);
};

// ─── Handler principal ────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'], token = req.query['hub.verify_token'], challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === VERIFY_TOKEN) return res.status(200).send(challenge);
    return res.status(403).send('Forbidden');
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;
      if (body.object !== 'whatsapp_business_account') return res.status(200).send('OK');

      const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      if (!message || message.type !== 'text') return res.status(200).send('OK');

      const from  = message.from;
      const text  = message.text.body?.trim();
      const msgId = message.id;
      if (!text) return res.status(200).send('OK');

      // ── Deduplicación: ignorar si este message.id ya fue procesado ──
      const { data: dedupRow } = await supabase
        .from('conversations')
        .select('last_message_id')
        .eq('phone', from)
        .single();

      if (dedupRow?.last_message_id === msgId) return res.status(200).send('OK');

      // Marcar mensaje como en proceso antes de llamar a Claude
      await supabase.from('conversations').upsert(
        { phone: from, last_message_id: msgId, updated_at: new Date().toISOString() },
        { onConflict: 'phone' }
      );

      // Historial + perfil del cliente
      const conv = await getConversation(from);

      // Si el bot está pausado, una persona está atendiendo — solo guardar el mensaje, no responder
      if (conv.bot_paused) {
        const history = conv.history || [];

        // Historial vacío = cliente eliminado y reingresó → limpiar pausa y dejar que el bot responda
        if (history.length === 0) {
          await supabase.from('conversations')
            .update({ bot_paused: false })
            .eq('phone', from);
          // Continúa al flujo normal sin return
        } else {
          history.push({ role: 'user', content: text });
          if (history.length > MAX_TURNS) history.splice(0, history.length - MAX_TURNS);
          await saveHistory(from, history, {});
          return res.status(200).send('OK');
        }
      }

      const history = conv.history || [];
      history.push({ role: 'user', content: text });
      if (history.length > MAX_TURNS) history.splice(0, history.length - MAX_TURNS);

      // Llamar a Claude pasando lead_type y perfil completo del cliente
      const systemPrompt = await buildPrompt(conv.lead_type, conv);
      const aiResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages: history,
      });

      const rawReply = aiResponse.content[0]?.text || 'Disculpa, en este momento no puedo responder. Intenta de nuevo.';

      // Extraer marcadores
      const nameMatch     = rawReply.match(/__NAME__:([^\n]+)/);
      const leadMatch     = rawReply.match(/__LEAD_TYPE__:([^\n]+)/);
      const objMatch      = rawReply.match(/__OBJECTION__:([^\n]+)/);
      const escalateMatch = rawReply.match(/__ESCALATE__:([^\n]*)/);

      // Procesar cita confirmada
      const booking = parseBooking(rawReply);

      // Construir meta para Supabase
      const meta = { last_visit_date: new Date().toISOString() };
      if (nameMatch) {
        meta.client_name = nameMatch[1].trim();
        // Guardar nombre en tabla clients en cuanto se conoce
        (async () => {
          try {
            await supabase.from('clients').upsert(
              { phone: from, name: nameMatch[1].trim(), updated: new Date().toISOString() },
              { onConflict: 'phone' }
            );
          } catch (_) {}
        })();
      }
      if (leadMatch)  meta.lead_type   = leadMatch[1].trim();
      if (objMatch)   meta.objection   = objMatch[1].trim();
      if (booking) {
        if (booking.clientName)  meta.client_name  = booking.clientName;
        if (booking.service)     meta.last_service  = booking.service;
        if (booking.vehicleType) meta.vehicle_type  = booking.vehicleType;
        if (booking.placa && booking.placa !== 'no_proporcionado') meta.vehicle_plate = booking.placa;
        if (booking.clientEmail && booking.clientEmail !== 'no_proporcionado') meta.client_email = booking.clientEmail;
        if (booking.cedula && booking.cedula !== 'no_proporcionado') meta.cedula = booking.cedula;
        if (booking.direccion && booking.direccion !== 'no_aplica' && booking.direccion !== 'no_proporcionado') meta.direccion = booking.direccion;
        meta.last_visit_date = new Date().toISOString();
        meta.remarketing_status = 'converted';
      }

      // Pausar bot automáticamente cuando escala a Sara
      if (escalateMatch) meta.bot_paused = true;

      history.push({ role: 'assistant', content: rawReply });
      await saveHistory(from, history, meta);

      // Guardar cita en appointments
      console.log('BOOKING PARSED:', booking ? JSON.stringify({ service: booking.service, date: booking.date, client: booking.clientName }) : 'null');
      if (booking) {
        // Extraer hora del campo FECHA (ej: "miércoles, 7 de mayo de 2026 a las 9:00")
        const timeMatch = booking.date?.match(/(\d{1,2}):(\d{2})/);
        const bookingTime = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : null;

        // Construir traslado con dirección incluida si aplica
        let trasladoFinal = null;
        if (booking.traslado && booking.traslado !== 'sin traslado' && booking.traslado !== 'no_proporcionado') {
          trasladoFinal = booking.traslado;
          if (booking.direccion && booking.direccion !== 'no_aplica' && booking.direccion !== 'no_proporcionado') {
            trasladoFinal += ` · Dir: ${booking.direccion}`;
          }
        }

        const insertPayload = {
          service: booking.service,
          vehicle_type: booking.vehicleType,
          date: booking.date,
          time: bookingTime,
          price_display: booking.priceDisplay,
          confirmation_code: booking.confirmationCode,
          client_name: booking.clientName,
          client_phone: from,
          client_email: booking.clientEmail && booking.clientEmail !== 'no_proporcionado' ? booking.clientEmail : null,
          traslado: trasladoFinal,
          cedula: booking.cedula && booking.cedula !== 'no_proporcionado' ? booking.cedula : null,
          placa: booking.placa && booking.placa !== 'no_proporcionado' ? booking.placa : null,
          status: 'pending',
          channel: 'whatsapp',
          created_date: new Date().toISOString(),
        };

        const { error: insertError } = await supabaseAdmin.from('appointments').insert(insertPayload);
        if (insertError) console.error('APPT INSERT ERROR:', JSON.stringify(insertError), 'PAYLOAD:', JSON.stringify(insertPayload));

        // Sincronizar cliente en tabla clients — siempre usar 'from' (número WhatsApp real)
        const { error: clientUpsertError } = await supabaseAdmin.from('clients').upsert({
          phone: from,
          name: booking.clientName,
          last_service: booking.service,
          last_date: new Date().toISOString(),
          updated: new Date().toISOString(),
        }, { onConflict: 'phone' });
        if (clientUpsertError) console.error('Client upsert error:', clientUpsertError);

        const emailHtml = `<div style="font-family:sans-serif;max-width:520px;margin:auto">
          <h2 style="color:#B8860B">Tu cita en Esteticar está confirmada!</h2>
          <p>Hola <strong>${booking.clientName || 'cliente'}</strong>, aquí están los detalles:</p>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px;color:#555">Servicio</td><td style="padding:8px"><strong>${booking.service}</strong></td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;color:#555">Fecha</td><td style="padding:8px"><strong>${booking.date}</strong></td></tr>
            <tr><td style="padding:8px;color:#555">Precio</td><td style="padding:8px"><strong>${booking.priceDisplay}</strong></td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;color:#555">Código</td><td style="padding:8px"><strong>${booking.confirmationCode}</strong></td></tr>
          </table>
        </div>`;

        await fetch(`${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'email', subject: `Cita confirmada — ${booking.confirmationCode}`, html: emailHtml,
            to: booking.clientEmail && booking.clientEmail !== 'no_proporcionado' ? booking.clientEmail : undefined }),
        }).catch(() => {});
      }

      // Escalación al equipo — notificar y confirmar pausa
      if (escalateMatch) {
        await notifyTeam(from, escalateMatch[1].trim());
        // Mensaje adicional a Sara informando que el bot ya está pausado
        await sendMessage(TEAM_NUMBER,
          `⏸️ *Bot pausado* para este cliente.\nPuedes responderle directamente desde la app.\nCuando termines, reactiva el bot desde el dashboard de Esteticar.`
        );
      }

      // Delay humanizador (corto para no exceder timeout de WhatsApp)
      await sleep(600 + Math.random() * 600);

      const reply = cleanReply(rawReply);
      if (reply) await sendMessage(from, reply);

    } catch (err) {
      console.error('WhatsApp webhook error:', err);
    }
    return res.status(200).send('OK');
  }

  res.status(405).send('Method not allowed');
}
