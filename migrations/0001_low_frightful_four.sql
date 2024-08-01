CREATE TABLE `marketEvents` (
	`block` integer NOT NULL,
	`market` text NOT NULL,
	`chainId` integer NOT NULL,
	`event` text NOT NULL,
	PRIMARY KEY(`block`, `market`)
);
--> statement-breakpoint
ALTER TABLE `books` ADD `chainId` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `prices` ADD `chainId` integer NOT NULL;