CREATE TABLE `blocksChecked` (
	`endingBlock` integer NOT NULL,
	`query_type` text NOT NULL,
	`chainId` integer NOT NULL,
	PRIMARY KEY(`chainId`, `query_type`)
);
--> statement-breakpoint
CREATE TABLE `books` (
	`block` integer NOT NULL,
	`market` text NOT NULL,
	`book` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `markets` (
	`olKeyHash` text PRIMARY KEY NOT NULL,
	`outbound_tkn` text NOT NULL,
	`inbound_tkn` text NOT NULL,
	`tickSpacing` text NOT NULL,
	`value` text NOT NULL,
	`block` integer NOT NULL,
	`chainId` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `prices` (
	`block` integer NOT NULL,
	`market` text NOT NULL,
	`price` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `markets_olKeyHash_unique` ON `markets` (`olKeyHash`);