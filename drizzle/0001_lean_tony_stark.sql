PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_contributions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guest_name` text NOT NULL,
	`guest_contact` text DEFAULT '' NOT NULL,
	`amount_cents` integer NOT NULL,
	`transaction_reference` text DEFAULT '' NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`payment_status` text DEFAULT 'declared' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_contributions` (`id`, `guest_name`, `guest_contact`, `amount_cents`, `transaction_reference`, `message`, `payment_status`, `created_at`)
SELECT `id`, `guest_name`, '', `amount_cents`, '', `message`, `payment_status`, `created_at` FROM `contributions`;
--> statement-breakpoint
DROP TABLE `contributions`;
--> statement-breakpoint
ALTER TABLE `__new_contributions` RENAME TO `contributions`;
--> statement-breakpoint
CREATE TABLE `__new_reservations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`gift_id` text NOT NULL,
	`guest_name` text NOT NULL,
	`guest_contact` text DEFAULT '' NOT NULL,
	`delivery_choice` text DEFAULT '' NOT NULL,
	`order_reference` text DEFAULT '' NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'purchased' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_reservations` (`id`, `gift_id`, `guest_name`, `guest_contact`, `delivery_choice`, `order_reference`, `message`, `status`, `created_at`)
SELECT `id`, `gift_id`, `guest_name`, `guest_contact`, '', '', `message`, `status`, `created_at` FROM `reservations`;
--> statement-breakpoint
DROP TABLE `reservations`;
--> statement-breakpoint
ALTER TABLE `__new_reservations` RENAME TO `reservations`;
--> statement-breakpoint
CREATE UNIQUE INDEX `reservations_gift_id_unique` ON `reservations` (`gift_id`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
