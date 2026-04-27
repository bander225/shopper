ALTER TABLE `cities` ADD `isCovered` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `cities` ADD `centerLat` decimal(10,7);--> statement-breakpoint
ALTER TABLE `cities` ADD `centerLng` decimal(10,7);--> statement-breakpoint
ALTER TABLE `cities` ADD `radiusKm` decimal(6,2) DEFAULT '10';