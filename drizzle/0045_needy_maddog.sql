CREATE TABLE `cityPolygons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cityName` varchar(100) NOT NULL,
	`polygon` json NOT NULL,
	`createdByUserId` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cityPolygons_id` PRIMARY KEY(`id`)
);
