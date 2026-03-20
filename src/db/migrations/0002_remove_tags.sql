CREATE TABLE `places_new` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`category_id` text DEFAULT 'cat-other' NOT NULL REFERENCES `categories`(`id`),
	`notes` text DEFAULT '' NOT NULL,
	`source_type` text DEFAULT 'manual' NOT NULL,
	`source_url` text,
	`image_url` text,
	`radius` integer DEFAULT 150 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`notified_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `places_new` (`id`, `name`, `address`, `latitude`, `longitude`, `category_id`, `notes`, `source_type`, `source_url`, `image_url`, `radius`, `is_active`, `notified_at`, `created_at`, `updated_at`)
SELECT `id`, `name`, `address`, `latitude`, `longitude`, `category_id`, `notes`, `source_type`, `source_url`, `image_url`, `radius`, `is_active`, `notified_at`, `created_at`, `updated_at`
FROM `places`;
--> statement-breakpoint
DROP TABLE `places`;
--> statement-breakpoint
ALTER TABLE `places_new` RENAME TO `places`;
--> statement-breakpoint
CREATE INDEX `idx_places_is_active` ON `places` (`is_active`);
--> statement-breakpoint
CREATE INDEX `idx_places_category` ON `places` (`category_id`);
--> statement-breakpoint
CREATE INDEX `idx_places_location` ON `places` (`latitude`, `longitude`);
