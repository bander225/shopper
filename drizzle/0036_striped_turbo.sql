CREATE TABLE `shopperRatings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`tripId` int NOT NULL,
	`driverUserId` int NOT NULL,
	`customerUserId` int NOT NULL,
	`accuracyRating` int NOT NULL,
	`speedRating` int NOT NULL,
	`cooperationRating` int NOT NULL,
	`overallRating` decimal(3,2) NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shopperRatings_id` PRIMARY KEY(`id`),
	CONSTRAINT `shopperRatings_bookingId_unique` UNIQUE(`bookingId`)
);
