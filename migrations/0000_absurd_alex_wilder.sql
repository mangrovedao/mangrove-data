CREATE TABLE IF NOT EXISTS `blocksChecked` (
	`endingBlock` integer NOT NULL,
	`query_type` text NOT NULL,
	`chainId` integer NOT NULL,
	PRIMARY KEY(`chainId`, `query_type`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `books` (
	`block` integer NOT NULL,
	`market` text NOT NULL,
	`book` text NOT NULL,
	`chainId` integer NOT NULL,
	PRIMARY KEY(`block`, `chainId`, `market`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `marketEvents` (
	`block` integer NOT NULL,
	`market` text NOT NULL,
	`chainId` integer NOT NULL,
	PRIMARY KEY(`block`, `market`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `marketPairs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`olKeyHash1` text,
	`olKeyHash2` text,
	`token1` text NOT NULL,
	`token2` text NOT NULL,
	`chainId` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `markets` (
	`olKeyHash` text PRIMARY KEY NOT NULL,
	`outbound_tkn` text NOT NULL,
	`inbound_tkn` text NOT NULL,
	`tickSpacing` text NOT NULL,
	`value` text NOT NULL,
	`block` integer NOT NULL,
	`chainId` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `prices` (
	`block` integer NOT NULL,
	`market` text NOT NULL,
	`price` text NOT NULL,
	`chainId` integer NOT NULL,
	PRIMARY KEY(`block`, `chainId`, `market`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `marketPairs_olKeyHash1_unique` ON `marketPairs` (`olKeyHash1`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `marketPairs_olKeyHash2_unique` ON `marketPairs` (`olKeyHash2`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `markets_olKeyHash_unique` ON `markets` (`olKeyHash`);
DROP TABLE `old_prices`;