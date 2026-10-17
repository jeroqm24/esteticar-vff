import { z } from "zod";
import { supabase } from "../../lib/supabase";

export const RolSchema = z.enum(["owner", "admin", "staff"]);
export type Rol = z.infer<typeof RolSchema>;

export const ServicioSchema = z.object({
  nombre: z.string().min(1),
  precio: z.number().int().nonnegative().nullable(),
});
export type Servicio = z.infer<typeof ServicioSchema>;

export const NegocioSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string(),
  slug: z.string(),
  logo_url: z.string().nullable(),
  colores: z.record(z.string(), z.string()),
  fuentes: z.record(z.string(), z.string()),
  whatsapp: z.string().nullable(),
  direccion: z.string().nullable(),
  maps_url: z.string().nullable(),
  servicios: z.array(ServicioSchema),
});
export type Negocio = z.infer<typeof NegocioSchema>;

export const ConfigAliadosSchema = z.object({
  negocio_id: z.string().uuid(),
  comision_pct_default: z.coerce.number().min(0).max(100),
  beneficio_texto: z.string().min(1),
  cupon_dias_validez: z.number().int().min(1),
  ventana_dias: z.number().int().min(1),
  min_difusiones: z.number().int().min(0),
  min_referidos: z.number().int().min(0),
  dias_gracia: z.number().int().min(0),
});
export type ConfigAliados = z.infer<typeof ConfigAliadosSchema>;

const MembresiaSchema = z.object({ rol: RolSchema, negocio: NegocioSchema });
export type Membresia = z.infer<typeof MembresiaSchema>;

/** Negocios a los que pertenece el usuario autenticado. RLS ya filtra por membresía. */
export async function misMembresias(): Promise<Membresia[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from("negocio_miembros")
    .select("rol, negocio:negocios(id, nombre, slug, logo_url, colores, fuentes, whatsapp, direccion, maps_url, servicios)")
    .eq("user_id", auth.user.id);
  if (error) throw new Error(`No se pudo cargar tu negocio: ${error.message}`);
  return z.array(MembresiaSchema).parse(data);
}

export async function configAliados(negocioId: string): Promise<ConfigAliados> {
  const { data, error } = await supabase
    .from("config_aliados")
    .select("negocio_id, comision_pct_default, beneficio_texto, cupon_dias_validez, ventana_dias, min_difusiones, min_referidos, dias_gracia")
    .eq("negocio_id", negocioId)
    .single();
  if (error) throw new Error(`No se pudo cargar la configuración: ${error.message}`);
  return ConfigAliadosSchema.parse(data);
}
