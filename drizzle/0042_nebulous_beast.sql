ALTER TABLE `phoneUsers` ADD `currentCityName` varchar(150);--> statement-breakpoint
ALTER TABLE `phoneUsers` ADD `currentLat` varchar(30);--> statement-breakpoint
ALTER TABLE `phoneUsers` ADD `currentLng` varchar(30);--> statement-breakpoint
ALTER TABLE `shopperDriverSettings` ADD `maxDeliveryKm` int DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `shopperTrips` ADD `toCityLat` decimal(10,7);--> statement-breakpoint
ALTER TABLE `shopperTrips` ADD `toCityLng` decimal(10,7);--> statement-breakpoint
ALTER TABLE `shopperTrips` ADD `toCityRadiusKm` decimal(6,2) DEFAULT '10';--> statement-breakpoint
ALTER TABLE `shopperTrips` ADD `fromLat` decimal(10,7);--> statement-breakpoint
ALTER TABLE `shopperTrips` ADD `fromLng` decimal(10,7);