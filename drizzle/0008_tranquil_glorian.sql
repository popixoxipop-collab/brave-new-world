CREATE TABLE `risk_events` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`source_ref` text NOT NULL,
	`event_class` text DEFAULT 'other' NOT NULL,
	`geography` text,
	`severity` text DEFAULT 'L1' NOT NULL,
	`summary` text NOT NULL,
	`lat` real,
	`lon` real,
	`corroboration_count` integer DEFAULT 1 NOT NULL,
	`first_seen_at` text NOT NULL,
	`status` text DEFAULT 'detected' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_re_first_seen` ON `risk_events` (`first_seen_at`);--> statement-breakpoint
CREATE INDEX `idx_re_status` ON `risk_events` (`status`);--> statement-breakpoint
CREATE INDEX `idx_re_class` ON `risk_events` (`event_class`);--> statement-breakpoint
CREATE TABLE `risk_analyses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` text NOT NULL,
	`exposures_json` text NOT NULL,
	`portfolio_delta` real,
	`verified` integer DEFAULT 0 NOT NULL,
	`model` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ra_event` ON `risk_analyses` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_ra_created` ON `risk_analyses` (`created_at`);
