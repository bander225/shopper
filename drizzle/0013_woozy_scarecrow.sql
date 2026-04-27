CREATE TABLE `deliveryRounds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driverUserId` int NOT NULL,
	`cityId` int NOT NULL,
	`streetId` int NOT NULL,
	`maxOrders` int NOT NULL,
	`currentCount` int NOT NULL DEFAULT 0,
	`roundStatus` enum('collecting','departed','returned','completed','cancelled') NOT NULL DEFAULT 'collecting',
	`scheduledDepartAt` timestamp,
	`departedAt` timestamp,
	`returnedAt` timestamp,
	`completedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deliveryRounds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `roundId` int;