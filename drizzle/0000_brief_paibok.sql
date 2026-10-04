CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`opening_balance_cents` integer DEFAULT 0 NOT NULL,
	`archived` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_name_unique` ON `accounts` (`name`);--> statement-breakpoint
CREATE TABLE `bill_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category_id` integer,
	`expected_amount_cents` integer,
	`due_day` integer,
	`responsible` text,
	`notes` text,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bill_templates_name_unique` ON `bill_templates` (`name`);--> statement-breakpoint
CREATE TABLE `bills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`template_id` integer,
	`name` text NOT NULL,
	`category_id` integer,
	`competence` text NOT NULL,
	`due_date` text,
	`amount_cents` integer,
	`paid_at` text,
	`paid_by_user_id` integer,
	`transaction_id` integer,
	`notes` text,
	FOREIGN KEY (`template_id`) REFERENCES `bill_templates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`paid_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bills_template_competence_idx` ON `bills` (`template_id`,`competence`);--> statement-breakpoint
CREATE INDEX `bills_due_idx` ON `bills` (`due_date`);--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_id` integer NOT NULL,
	`month` text NOT NULL,
	`limit_cents` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `budgets_category_month_idx` ON `budgets` (`category_id`,`month`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`archived` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `debt_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`debt_id` integer NOT NULL,
	`date` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`paid_by_user_id` integer,
	`transaction_id` integer,
	FOREIGN KEY (`debt_id`) REFERENCES `debts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`paid_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `debts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`creditor` text NOT NULL,
	`description` text,
	`original_cents` integer NOT NULL,
	`owner` text DEFAULT 'casal' NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`category_id` integer,
	`user_id` integer,
	`type` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`date` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `transactions_date_idx` ON `transactions` (`date`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);