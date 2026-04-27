CREATE TABLE `cities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `neighborhoods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cityId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `neighborhoods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `phoneUsers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`name` varchar(255),
	`role` enum('customer','driver') NOT NULL DEFAULT 'customer',
	`addressText` text,
	`addressLat` decimal(10,7),
	`addressLng` decimal(10,7),
	`cityId` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `phoneUsers_id` PRIMARY KEY(`id`),
	CONSTRAINT `phoneUsers_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `restaurantHours` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`dayOfWeek` int NOT NULL,
	`isClosed` boolean NOT NULL DEFAULT false,
	`openTime` varchar(5),
	`closeTime` varchar(5),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `restaurantHours_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `orderNumber` varchar(20) NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `drivers` ADD `whatsappNumber` varchar(20);--> statement-breakpoint
ALTER TABLE `drivers` ADD `cityId` int;--> statement-breakpoint
ALTER TABLE `orders` ADD `fromCityId` int;--> statement-breakpoint
ALTER TABLE `orders` ADD `toNeighborhoodId` int;--> statement-breakpoint
ALTER TABLE `restaurants` ADD `logoUrl` text;--> statement-breakpoint
ALTER TABLE `restaurants` ADD `menuImageUrl` text;