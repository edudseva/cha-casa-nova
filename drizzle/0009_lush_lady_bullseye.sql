CREATE TABLE `platform_clients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platform_clients_email_unique` ON `platform_clients` (`email`);--> statement-breakpoint
CREATE TABLE `platform_data_exports` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`requested_by` text NOT NULL,
	`requested_by_email` text NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`record_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `event_sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`requested_by`) REFERENCES `platform_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_data_exports_site_created` ON `platform_data_exports` (`site_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `platform_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`price_cents` integer DEFAULT 0 NOT NULL,
	`max_sites` integer DEFAULT 1 NOT NULL,
	`max_members` integer DEFAULT 2 NOT NULL,
	`max_gifts` integer DEFAULT 100 NOT NULL,
	`max_gallery_images` integer DEFAULT 20 NOT NULL,
	`custom_domain_enabled` integer DEFAULT 0 NOT NULL,
	`exports_enabled` integer DEFAULT 1 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platform_plans_code_unique` ON `platform_plans` (`code`);--> statement-breakpoint
CREATE TABLE `platform_support_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`actor_user_id` text NOT NULL,
	`actor_email` text NOT NULL,
	`reason` text NOT NULL,
	`scope` text DEFAULT 'read_only' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`expires_at` text NOT NULL,
	`ended_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `event_sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `platform_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_support_sessions_site_status` ON `platform_support_sessions` (`site_id`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `site_commercial_settings` (
	`site_id` text PRIMARY KEY NOT NULL,
	`client_id` text,
	`plan_id` text,
	`template_id` text,
	`health_status` text DEFAULT 'pending' NOT NULL,
	`health_summary` text DEFAULT '{}' NOT NULL,
	`last_health_check_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `event_sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_id`) REFERENCES `platform_clients`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`plan_id`) REFERENCES `platform_plans`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`template_id`) REFERENCES `site_templates`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_site_commercial_client` ON `site_commercial_settings` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_site_commercial_plan` ON `site_commercial_settings` (`plan_id`);--> statement-breakpoint
CREATE TABLE `site_deletion_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`requested_by` text NOT NULL,
	`requested_by_email` text NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`scheduled_for` text NOT NULL,
	`cancelled_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `event_sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`requested_by`) REFERENCES `platform_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_deletion_requests_site_status` ON `site_deletion_requests` (`site_id`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `site_domains` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`site_id` text NOT NULL,
	`hostname` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`dns_target` text DEFAULT '' NOT NULL,
	`verified_at` text,
	`last_checked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `event_sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `site_domains_hostname_unique` ON `site_domains` (`hostname`);--> statement-breakpoint
CREATE INDEX `idx_site_domains_site_status` ON `site_domains` (`site_id`,`status`);--> statement-breakpoint
CREATE TABLE `site_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`preview_theme` text DEFAULT 'botanical' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `site_templates_code_unique` ON `site_templates` (`code`);