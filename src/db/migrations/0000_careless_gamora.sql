CREATE TABLE `places` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
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
