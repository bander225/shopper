ALTER TABLE `menuItems` ADD `stockEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `menuItems` ADD `stockCount` int DEFAULT 0 NOT NULL;