CREATE TABLE `googlePlaceHours` (
	`id` int AUTO_INCREMENT NOT NULL,
	`placeDbId` int NOT NULL,
	`dayOfWeek` int NOT NULL,
	`isClosed` boolean NOT NULL DEFAULT false,
	`openTime` varchar(5),
	`closeTime` varchar(5),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `googlePlaceHours_id` PRIMARY KEY(`id`)
);
