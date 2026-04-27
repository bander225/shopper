CREATE TABLE `driverCoverage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driverId` int NOT NULL,
	`cityId` int NOT NULL,
	`streetId` int,
	`isCurrentLocation` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `driverCoverage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `deliveryRounds` ADD `minOrders` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `deliveryRounds` ADD `waitMinutes` int DEFAULT 60 NOT NULL;