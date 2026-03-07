ALTER TABLE public.observations ADD COLUMN IF NOT EXISTS project_name text NOT NULL DEFAULT '';
ALTER TABLE public.observations ADD COLUMN IF NOT EXISTS problematica text DEFAULT '';
ALTER TABLE public.observations ADD COLUMN IF NOT EXISTS producto_final text DEFAULT '';