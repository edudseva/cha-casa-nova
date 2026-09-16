PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_commercial_requests` (
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
	FOREIGN KEY (`plan_id`) REFERENCES `platform_plans`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "commercial_request_kind" CHECK("__new_commercial_requests"."kind" IN ('trial','order','support')),
	CONSTRAINT "commercial_request_amount" CHECK("__new_commercial_requests"."amount_cents" IS NULL OR "__new_commercial_requests"."amount_cents" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_commercial_requests`("id", "user_id", "email", "kind", "status", "plan_id", "coupon_code", "amount_cents", "note", "created_at", "updated_at") SELECT "id", "user_id", "email", "kind", "status", "plan_id", "coupon_code", "amount_cents", "note", "created_at", "updated_at" FROM `commercial_requests`;--> statement-breakpoint
DROP TABLE `commercial_requests`;--> statement-breakpoint
ALTER TABLE `__new_commercial_requests` RENAME TO `commercial_requests`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_commercial_requests_user_created` ON `commercial_requests` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_commercial_requests_status_created` ON `commercial_requests` (`status`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_commercial_one_pending_kind` ON `commercial_requests` (`user_id`,`email`,`kind`) WHERE "commercial_requests"."kind" IN ('trial','order') AND "commercial_requests"."status" IN ('trial_requested','awaiting_payment_setup');--> statement-breakpoint
CREATE TABLE `__new_commercial_coupons` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`discount_percent` integer NOT NULL,
	`expires_at` text,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "coupon_percent_range" CHECK("__new_commercial_coupons"."discount_percent" BETWEEN 1 AND 100)
);
--> statement-breakpoint
INSERT INTO `__new_commercial_coupons`("id", "code", "discount_percent", "expires_at", "active", "created_at") SELECT "id", "code", "discount_percent", "expires_at", "active", "created_at" FROM `commercial_coupons`;--> statement-breakpoint
DROP TABLE `commercial_coupons`;--> statement-breakpoint
ALTER TABLE `__new_commercial_coupons` RENAME TO `commercial_coupons`;--> statement-breakpoint
CREATE UNIQUE INDEX `commercial_coupons_code_unique` ON `commercial_coupons` (`code`);--> statement-breakpoint
CREATE INDEX `idx_coupons_active_expiry` ON `commercial_coupons` (`active`,`expires_at`);