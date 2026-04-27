CREATE TABLE `storePresence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `storePresence_id` PRIMARY KEY(`id`)
);
