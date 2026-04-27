CREATE TABLE `complaints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`userPhone` varchar(20),
	`userName` varchar(255),
	`orderId` int,
	`orderNumber` varchar(50),
	`category` enum('delivery','driver','restaurant','payment','other') NOT NULL DEFAULT 'other',
	`subject` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`adminReply` text,
	`repliedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `complaints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `drivers` ADD `nationalId` varchar(20);--> statement-breakpoint
ALTER TABLE `drivers` ADD `licenseNumber` varchar(50);--> statement-breakpoint
ALTER TABLE `drivers` ADD `licenseExpiry` varchar(20);--> statement-breakpoint
ALTER TABLE `drivers` ADD `vehiclePlate` varchar(20);--> statement-breakpoint
ALTER TABLE `drivers` ADD `vehicleModel` varchar(100);--> statement-breakpoint
ALTER TABLE `drivers` ADD `vehicleYear` varchar(10);--> statement-breakpoint
ALTER TABLE `drivers` ADD `vehicleColor` varchar(50);--> statement-breakpoint
ALTER TABLE `drivers` ADD `verificationStatus` varchar(20) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `phoneUsers` ADD `termsAccepted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `phoneUsers` ADD `termsAcceptedAt` timestamp;