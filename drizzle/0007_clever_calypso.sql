CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`site_id` text NOT NULL,
	`actor_user_id` text NOT NULL,
	`actor_email` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text DEFAULT '' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_site_created` ON `audit_logs` (`site_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_actor_created` ON `audit_logs` (`actor_user_id`,`created_at`);--> statement-breakpoint
DROP INDEX `reservations_gift_id_unique`;--> statement-breakpoint
ALTER TABLE `reservations` ADD `site_id` text DEFAULT 'cha-casa-nova-homologacao' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reservations_site_gift` ON `reservations` (`site_id`,`gift_id`);--> statement-breakpoint
CREATE INDEX `idx_reservations_site_status` ON `reservations` (`site_id`,`status`);--> statement-breakpoint
ALTER TABLE `catalog_cache` ADD `site_id` text DEFAULT 'cha-casa-nova-homologacao' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_catalog_cache_site` ON `catalog_cache` (`site_id`);--> statement-breakpoint
ALTER TABLE `contributions` ADD `site_id` text DEFAULT 'cha-casa-nova-homologacao' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_contributions_site_status` ON `contributions` (`site_id`,`payment_status`,`created_at`);--> statement-breakpoint
ALTER TABLE `pix_config` ADD `site_id` text DEFAULT 'cha-casa-nova-homologacao' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_pix_config_site` ON `pix_config` (`site_id`);--> statement-breakpoint
ALTER TABLE `site_config` ADD `site_id` text DEFAULT 'cha-casa-nova-homologacao' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_site_config_site` ON `site_config` (`site_id`);