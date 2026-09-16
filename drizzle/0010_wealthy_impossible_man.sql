CREATE TABLE `commercial_coupons` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`discount_percent` integer NOT NULL,
	`expires_at` text,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `commercial_coupons_code_unique` ON `commercial_coupons` (`code`);--> statement-breakpoint
CREATE INDEX `idx_coupons_active_expiry` ON `commercial_coupons` (`active`,`expires_at`);--> statement-breakpoint
CREATE TABLE `commercial_launch` (
	`id` integer PRIMARY KEY NOT NULL,
	`headline` text DEFAULT 'Seu evento, do seu jeito' NOT NULL,
	`description` text DEFAULT 'Crie um espaço para celebrar e organizar seu evento.' NOT NULL,
	`trial_days` integer DEFAULT 14 NOT NULL,
	`sales_email` text DEFAULT '' NOT NULL,
	`terms_draft` text DEFAULT '' NOT NULL,
	`privacy_draft` text DEFAULT '' NOT NULL,
	`billing_status` text DEFAULT 'unconfigured' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `commercial_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`plan_id` text,
	`coupon_code` text DEFAULT '' NOT NULL,
	`amount_cents` integer,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `platform_plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_commercial_requests_user_created` ON `commercial_requests` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_commercial_requests_status_created` ON `commercial_requests` (`status`,`created_at`);