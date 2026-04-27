ALTER TABLE `googlePlaceRestaurants` ADD `hasHotBag` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `googlePlaceRestaurants` ADD `hasColdBag` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `restaurants` ADD `hasHotBag` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `restaurants` ADD `hasColdBag` boolean DEFAULT false NOT NULL;