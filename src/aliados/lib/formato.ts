export const ZONA_HORARIA = "America/Bogota";

export function formatCOP(valor: number): string {
  const entero = Math.round(valor);
  const miles = Math.abs(entero).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${entero < 0 ? "-" : ""}$${miles}`;
}

/** Mes "YYYY-MM" al que pertenece un instante, en hora de Bogotá. */
export function mesBogota(fecha: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(fecha);
  const anio = partes.find((p) => p.type === "year")?.value;
  const mes = partes.find((p) => p.type === "month")?.value;
  return `${anio}-${mes}`;
}

/** Rango [desde, hasta) en ISO para filtrar columnas timestamptz por un mes de Bogotá (UTC-5 fijo, sin horario de verano). */
export function rangoMesBogota(mes: string): { desde: string; hasta: string } {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(mes);
  if (!m) throw new Error(`Mes inválido: ${mes}`);
  const anio = Number(m[1]);
  const numMes = Number(m[2]);
  const sig = numMes === 12 ? `${anio + 1}-01` : `${anio}-${String(numMes + 1).padStart(2, "0")}`;
  return {
    desde: new Date(`${mes}-01T00:00:00-05:00`).toISOString(),
    hasta: new Date(`${sig}-01T00:00:00-05:00`).toISOString(),
  };
}
