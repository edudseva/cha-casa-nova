CREATE TABLE `site_config_drafts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`site_id` text NOT NULL,
	`user_id` text NOT NULL,
	`payload` text NOT NULL,
	`pix_payload` text DEFAULT '{}' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `event_sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `platform_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_site_config_drafts_site_user` ON `site_config_drafts` (`site_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_site_config_drafts_site_updated` ON `site_config_drafts` (`site_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `site_config_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`site_id` text NOT NULL,
	`payload` text NOT NULL,
	`pix_payload` text DEFAULT '{}' NOT NULL,
	`created_by` text NOT NULL,
	`created_by_email` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `event_sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `platform_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_site_config_versions_site_created` ON `site_config_versions` (`site_id`,`created_at`);