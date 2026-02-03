-- Add color theme preference to user table
ALTER TABLE "user" ADD COLUMN color_theme VARCHAR(50) DEFAULT 'lavender';

-- Create index for efficient lookups
CREATE INDEX idx_user_color_theme ON "user"(color_theme);
