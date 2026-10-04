CREATE TABLE `bank_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider` text DEFAULT 'inter' NOT NULL,
	`ext_key` text NOT NULL,
	`date` text NOT NULL,
	`type` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`description` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bank_entries_key_idx` ON `bank_entries` (`provider`,`ext_key`);--> statement-breakpoint
CREATE INDEX `bank_entries_date_idx` ON `bank_entries` (`date`);