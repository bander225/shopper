CREATE TABLE `driverRatings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`driverId` int NOT NULL,
	`customerId` int NOT NULL,
	`serviceRating` int NOT NULL,
	`speedRating` int NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `driverRatings_id` PRIMARY KEY(`id`)
);
