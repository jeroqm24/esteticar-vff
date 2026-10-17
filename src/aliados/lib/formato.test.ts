import { describe, expect, it } from "vitest";
import { formatCOP, mesBogota, rangoMesBogota } from "./formato";

describe("formatCOP", () => {
  it("usa punto de miles y sin decimales", () => {
    expect(formatCOP(49000)).toBe("$49.000");
    expect(formatCOP(1250000)).toBe("$1.250.000");
    expect(formatCOP(0)).toBe("$0");
    expect(formatCOP(999)).toBe("$999");
  });
  it("redondea y maneja negativos", () => {
    expect(formatCOP(4899.6)).toBe("$4.900");
    expect(formatCOP(-35000)).toBe("-$35.000");
  });
});

describe("mesBogota", () => {
  it("corta el mes en hora de Bogotá, no en UTC", () => {
    // 1 de noviembre 03:00 UTC = 31 de octubre 22:00 en Bogotá
    expect(mesBogota(new Date("2026-11-01T03:00:00Z"))).toBe("2026-10");
    expect(mesBogota(new Date("2026-11-01T05:00:00Z"))).toBe("2026-11");
  });
});

describe("rangoMesBogota", () => {
  it("devuelve medianoche de Bogotá en UTC", () => {
    expect(rangoMesBogota("2026-10")).toEqual({
      desde: "2026-10-01T05:00:00.000Z",
      hasta: "2026-11-01T05:00:00.000Z",
    });
  });
  it("cruza el año en diciembre", () => {
    expect(rangoMesBogota("2026-12").hasta).toBe("2027-01-01T05:00:00.000Z");
  });
  it("rechaza meses inválidos", () => {
    expect(() => rangoMesBogota("2026-13")).toThrow();
    expect(() => rangoMesBogota("26-1")).toThrow();
  });
});
