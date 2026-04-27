ALTER TABLE `restaurants` ADD `discountEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `restaurants` ADD `discountPercent` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `restaurants` ADD `discountLabel` varchar(100);--> statement-breakpoint
ALTER TABLE `restaurants` ADD `discountExpiresAt` timestamp;