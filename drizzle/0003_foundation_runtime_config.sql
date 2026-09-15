CREATE TABLE IF NOT EXISTS `site_config` (
  `id` integer PRIMARY KEY NOT NULL,
  `payload` text NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `pix_config` (
  `id` integer PRIMARY KEY NOT NULL,
  `pix_key` text NOT NULL,
  `receiver` text NOT NULL,
  `city` text NOT NULL,
  `enabled` integer DEFAULT 1 NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
