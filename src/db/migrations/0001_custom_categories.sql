CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`icon` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);

INSERT INTO `categories` (`id`, `name`, `color`, `icon`, `sort_order`, `created_at`) VALUES
	('cat-restaurant', 'Restaurant', '#E53935', 'silverware-fork-knife', 0, strftime('%s', 'now') * 1000),
	('cat-bar', 'Bar', '#8E24AA', 'glass-cocktail', 1, strftime('%s', 'now') * 1000),
	('cat-cafe', 'Café', '#795548', 'coffee', 2, strftime('%s', 'now') * 1000),
	('cat-shop', 'Boutique', '#1E88E5', 'shopping', 3, strftime('%s', 'now') * 1000),
	('cat-culture', 'Culture', '#FB8C00', 'palette', 4, strftime('%s', 'now') * 1000),
	('cat-sport', 'Sport', '#43A047', 'run', 5, strftime('%s', 'now') * 1000),
	('cat-other', 'Autre', '#757575', 'map-marker', 6, strftime('%s', 'now') * 1000);

CREATE TABLE `places_new` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`category_id` text DEFAULT 'cat-other' NOT NULL REFERENCES `categories`(`id`),
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

INSERT INTO `places_new` (`id`, `name`, `address`, `latitude`, `longitude`, `category_id`, `tags`, `notes`, `source_type`, `source_url`, `image_url`, `radius`, `is_active`, `notified_at`, `created_at`, `updated_at`)
SELECT `id`, `name`, `address`, `latitude`, `longitude`,
	CASE `category`
		WHEN 'restaurant' THEN 'cat-restaurant'
		WHEN 'bar' THEN 'cat-bar'
		WHEN 'cafe' THEN 'cat-cafe'
		WHEN 'shop' THEN 'cat-shop'
		WHEN 'culture' THEN 'cat-culture'
		WHEN 'sport' THEN 'cat-sport'
		ELSE 'cat-other'
	END,
	`tags`, `notes`, `source_type`, `source_url`, `image_url`, `radius`, `is_active`, `notified_at`, `created_at`, `updated_at`
FROM `places`;

DROP TABLE `places`;

ALTER TABLE `places_new` RENAME TO `places`;

CREATE INDEX `idx_places_is_active` ON `places` (`is_active`);
CREATE INDEX `idx_places_category` ON `places` (`category_id`);
CREATE INDEX `idx_places_location` ON `places` (`latitude`, `longitude`);
