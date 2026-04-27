CREATE TABLE `streets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cityId` int NOT NULL,
	`name` varchar(150) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `streets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `restaurants` ADD `cityId` int;--> statement-breakpoint
ALTER TABLE `restaurants` ADD `streetId` int;