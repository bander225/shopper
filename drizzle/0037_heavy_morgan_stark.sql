ALTER TABLE `shopperBookings` ADD `shopperDeliveryMethod` enum('person','door') DEFAULT 'person' NOT NULL;--> statement-breakpoint
ALTER TABLE `shopperBookings` ADD `recipientName` varchar(255);--> statement-breakpoint
ALTER TABLE `shopperBookings` ADD `recipientPhone` varchar(30);