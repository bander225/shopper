CREATE TABLE `driverCoverageZones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driverUserId` int NOT NULL,
	`name` varchar(255) NOT NULL DEFAULT 'منطقة التغطية',
	`polygon` text NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `driverCoverageZones_id` PRIMARY KEY(`id`)
);
