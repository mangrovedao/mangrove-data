CREATE TABLE `books` (
	`block` integer NOT NULL,
	`market` text NOT NULL,
	`book` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `prices` (
	`block` integer NOT NULL,
	`market` text NOT NULL,
	`price` text NOT NULL
);
