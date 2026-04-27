ALTER TABLE `orders` ADD `deliveryProofImageUrl` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `confirmedByCustomerAt` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `preparingAt` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `readyAt` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `driverAssignedAt` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `onTheWayAt` timestamp;