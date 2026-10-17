-- Programa de Aliados · Fase 0: negocios, miembros, configuración y RLS.
-- Solo crea objetos nuevos; no modifica ninguna tabla existente.

create extension if not exists pgcrypto;

-- ─── negocios ────────────────────────────────────────────────
create table public.negocios (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  nombre      text not null check (length(trim(nombre)) > 0),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  logo_url    text,
  colores     jsonb not null default '{}'::jsonb,
  fuentes     jsonb not null default '{}'::jsonb,
  whatsapp    text check (whatsapp is null or whatsapp ~ '^[0-9]{10,15}$'),
  direccion   text,
  maps_url    text,
  servicios   jsonb not null default '[]'::jsonb check (jsonb_typeof(servicios) = 'array')
);

-- ─── negocio_miembros ────────────────────────────────────────
create table public.negocio_miembros (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  negocio_id  uuid not null references public.negocios(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  rol         text not null check (rol in ('owner', 'admin', 'staff')),
  unique (negocio_id, user_id)
);
create index negocio_miembros_user_id_idx on public.negocio_miembros (user_id);
create index negocio_miembros_negocio_id_idx on public.negocio_miembros (negocio_id);

-- ─── config_aliados ──────────────────────────────────────────
create table public.config_aliados (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  negocio_id            uuid not null unique references public.negocios(id) on delete cascade,
  comision_pct_default  numeric(5,2) not null default 10 check (comision_pct_default between 0 and 100),
  beneficio_texto       text not null default 'Traslado gratis en tu primer servicio',
  cupon_dias_validez    int not null default 15 check (cupon_dias_validez between 1 and 365),
  ventana_dias          int not null default 30 check (ventana_dias between 1 and 365),
  min_difusiones        int not null default 2 check (min_difusiones >= 0),
  min_referidos         int not null default 0 check (min_referidos >= 0),
  dias_gracia           int not null default 7 check (dias_gracia >= 0)
);

-- ─── Helper de membresía ─────────────────────────────────────
-- SECURITY DEFINER evita la recursión de RLS al consultar negocio_miembros.
create or replace function public.es_miembro(
  p_negocio_id uuid,
  p_roles text[] default array['owner', 'admin', 'staff']
) returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.negocio_miembros
    where negocio_id = p_negocio_id
      and user_id = auth.uid()
      and rol = any (p_roles)
  );
$$;
revoke all on function public.es_miembro(uuid, text[]) from public, anon;
grant execute on function public.es_miembro(uuid, text[]) to authenticated;

-- ─── RLS ─────────────────────────────────────────────────────
alter table public.negocios         enable row level security;
alter table public.negocio_miembros enable row level security;
alter table public.config_aliados   enable row level security;

create policy negocios_select on public.negocios
  for select to authenticated using (public.es_miembro(id));
create policy negocios_update on public.negocios
  for update to authenticated
  using (public.es_miembro(id, array['owner', 'admin']))
  with check (public.es_miembro(id, array['owner', 'admin']));

-- La gestión de miembros se hará por RPC; desde el cliente solo se lee.
create policy negocio_miembros_select on public.negocio_miembros
  for select to authenticated using (public.es_miembro(negocio_id));

create policy config_aliados_select on public.config_aliados
  for select to authenticated using (public.es_miembro(negocio_id));
create policy config_aliados_update on public.config_aliados
  for update to authenticated
  using (public.es_miembro(negocio_id, array['owner', 'admin']))
  with check (public.es_miembro(negocio_id, array['owner', 'admin']));

-- ─── Semilla: EstetiCar como negocio #1 ──────────────────────
insert into public.negocios (nombre, slug, logo_url, colores, fuentes, whatsapp, direccion, maps_url, servicios)
values (
  'EstetiCar',
  'esteticar',
  'https://esteticar-vff.vercel.app/logo.png',
  '{"fondo": "#000000", "acento": "#F8C840", "texto": "#FFFFFF"}',
  '{"titulos": "Cormorant Garamond", "condensada": "Barlow Condensed", "cuerpo": "Barlow"}',
  '573156071041',
  'Carrera 27 #48-26, Manizales',
  'https://www.google.com/maps/search/?api=1&query=Carrera+27+%2348-26+Manizales',
  '[
    {"nombre": "Recubrimiento Cerámico", "precio": null},
    {"nombre": "Porcelanizado", "precio": null},
    {"nombre": "Tratamiento 3 en 1 a Máquina", "precio": 350000},
    {"nombre": "Tratamiento 3 en 1 Manual", "precio": 290000},
    {"nombre": "Mantenimiento Interior Sólo Cojinería", "precio": 290000},
    {"nombre": "Mantenimiento Interior Levantamiento del Alfombrado", "precio": 350000},
    {"nombre": "Lavado de Cojinería", "precio": 199000},
    {"nombre": "Restauración de Farolas", "precio": 180000},
    {"nombre": "Descontaminación de Vidrios", "precio": 250000},
    {"nombre": "Brillado a Máquina", "precio": 100000},
    {"nombre": "Lavado de Chasis", "precio": 59000},
    {"nombre": "Lavado de Techo y Parasoles", "precio": 49000},
    {"nombre": "Limpieza Técnica de Motor", "precio": 49000},
    {"nombre": "Lavada Esencial Carro", "precio": 49000},
    {"nombre": "Brillado de Tanque", "precio": 59000},
    {"nombre": "Descontaminación de Tubería", "precio": 49000},
    {"nombre": "Brillado de Farolas", "precio": 49000},
    {"nombre": "Lavada Esencial Moto", "precio": 49000}
  ]'
);

insert into public.config_aliados (negocio_id)
select id from public.negocios where slug = 'esteticar';

-- La app no tiene registro de clientes: todo usuario de auth es del equipo admin.
insert into public.negocio_miembros (negocio_id, user_id, rol)
select n.id, u.id, 'owner'
from public.negocios n cross join auth.users u
where n.slug = 'esteticar'
on conflict (negocio_id, user_id) do nothing;
