-- Additive: existing applications keep their theme and receive the sage accent.
ALTER TABLE apps ADD COLUMN IF NOT EXISTS widget_accent TEXT NOT NULL DEFAULT 'sage'
  CHECK (widget_accent IN ('sage', 'blue', 'violet'));
