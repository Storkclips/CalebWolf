/*
  # Extend site_identity with brand icon size and hero logo settings

  1. Changes to site_identity
    - `logo_size` (integer, default 22) — px size of the navbar/footer SVG mark
    - `hero_logo_enabled` (boolean, default false) — show/hide logo on hero
    - `hero_logo_svg_path` (text) — separate SVG path for the hero (defaults to brand SVG)
    - `hero_logo_viewbox` (text) — viewBox for the hero SVG
    - `hero_logo_color` (text) — CSS color string, default '#ffffff'
    - `hero_logo_position_x` (integer 0-100, default 50) — horizontal %, 50 = center
    - `hero_logo_position_y` (integer 0-100, default 50) — vertical %, 50 = center
    - `hero_logo_size` (integer, default 120) — px width of hero logo

  2. Notes
    - All new columns are nullable-safe with sensible defaults
    - Existing row gets defaults automatically
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_identity' AND column_name='logo_size') THEN
    ALTER TABLE site_identity ADD COLUMN logo_size integer NOT NULL DEFAULT 22;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_identity' AND column_name='hero_logo_enabled') THEN
    ALTER TABLE site_identity ADD COLUMN hero_logo_enabled boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_identity' AND column_name='hero_logo_svg_path') THEN
    ALTER TABLE site_identity ADD COLUMN hero_logo_svg_path text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_identity' AND column_name='hero_logo_viewbox') THEN
    ALTER TABLE site_identity ADD COLUMN hero_logo_viewbox text NOT NULL DEFAULT '0 0 24 24';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_identity' AND column_name='hero_logo_color') THEN
    ALTER TABLE site_identity ADD COLUMN hero_logo_color text NOT NULL DEFAULT '#ffffff';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_identity' AND column_name='hero_logo_position_x') THEN
    ALTER TABLE site_identity ADD COLUMN hero_logo_position_x integer NOT NULL DEFAULT 50;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_identity' AND column_name='hero_logo_position_y') THEN
    ALTER TABLE site_identity ADD COLUMN hero_logo_position_y integer NOT NULL DEFAULT 50;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='site_identity' AND column_name='hero_logo_size') THEN
    ALTER TABLE site_identity ADD COLUMN hero_logo_size integer NOT NULL DEFAULT 120;
  END IF;
END $$;
