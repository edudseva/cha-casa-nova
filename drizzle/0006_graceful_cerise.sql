ALTER TABLE `event_sites` ADD `couple_names` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `event_sites` ADD `event_type` text DEFAULT 'cha-de-panela' NOT NULL;--> statement-breakpoint
ALTER TABLE `event_sites` ADD `event_date` text;--> statement-breakpoint
ALTER TABLE `event_sites` ADD `onboarding_status` text DEFAULT 'draft' NOT NULL;