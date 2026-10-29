ALTER TABLE apps ADD COLUMN IF NOT EXISTS widget_brand JSONB NOT NULL DEFAULT '{"kind":"initials"}'::jsonb
  CHECK (widget_brand->>'kind' IN ('initials', 'none', 'icon', 'logo') AND octet_length(widget_brand::text) <= 180000);
