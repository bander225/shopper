CREATE TABLE `driverBatches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driverUserId` int NOT NULL,
	`maxOrders` int NOT NULL,
	`currentCount` int NOT NULL DEFAULT 0,
	`status` enum('collecting','full','dispatched','completed','cancelled') NOT NULL DEFAULT 'collecting',
	`cityId` int NOT NULL,
	`streetId` int NOT NULL,
	`dispatchedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `driverBatches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `batchId` int;