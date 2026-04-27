CREATE TABLE `driverOrderRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`driverUserId` int NOT NULL,
	`status` enum('pending','accepted','rejected','expired','cancelled') NOT NULL DEFAULT 'pending',
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`respondedAt` timestamp,
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `driverOrderRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `phoneUsers` ADD `streetId` int;--> statement-breakpoint
ALTER TABLE `phoneUsers` ADD `isOnline` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `phoneUsers` ADD `lastOnlineAt` timestamp;