-- Add logo_url to tenants for organization branding
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;
