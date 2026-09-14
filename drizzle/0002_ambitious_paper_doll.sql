CREATE TABLE `catalog_cache` (
	`id` integer PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`synced_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
