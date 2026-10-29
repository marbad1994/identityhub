-- Preserve existing choices and allow named presets or strictly validated RGB hex.
ALTER TABLE apps DROP CONSTRAINT IF EXISTS apps_widget_accent_check;
ALTER TABLE apps ADD CONSTRAINT apps_widget_accent_check CHECK (
  widget_accent IN ('sage','blue','violet','emerald','teal','sky','indigo','rose','coral','amber','slate','charcoal')
  OR widget_accent ~ '^#[0-9a-fA-F]{6}$'
);
