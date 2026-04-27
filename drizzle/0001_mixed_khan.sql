CREATE TABLE `drivers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`deliveryFee` decimal(8,2) DEFAULT '0',
	`maxOrders` int NOT NULL DEFAULT 5,
	`currentOrders` int NOT NULL DEFAULT 0,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`isOnline` boolean NOT NULL DEFAULT false,
	`currentLat` decimal(10,7),
	`currentLng` decimal(10,7),
	`lastLocationUpdate` timestamp,
	`rating` decimal(3,2) DEFAULT '5.00',
	`totalDeliveries` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drivers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menuCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `menuCategories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menuItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`categoryId` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`price` decimal(8,2) NOT NULL,
	`imageUrl` text,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `menuItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`type` enum('order_update','new_order','driver_assigned','delivery_update','system') NOT NULL DEFAULT 'system',
	`orderId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`menuItemId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`price` decimal(8,2) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orderItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(20) NOT NULL,
	`userId` int NOT NULL,
	`restaurantId` int NOT NULL,
	`driverId` int,
	`status` enum('pending','confirmed','preparing','ready','driver_assigned','picked_up','on_the_way','delivered','cancelled') NOT NULL DEFAULT 'pending',
	`subtotal` decimal(8,2) NOT NULL,
	`deliveryFee` decimal(8,2) DEFAULT '0',
	`total` decimal(8,2) NOT NULL,
	`paymentMethod` enum('cash','card','stripe') NOT NULL DEFAULT 'cash',
	`paymentStatus` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
	`stripePaymentIntentId` varchar(255),
	`deliveryAddressText` text NOT NULL,
	`deliveryLat` decimal(10,7),
	`deliveryLng` decimal(10,7),
	`customerNotes` text,
	`estimatedDeliveryTime` timestamp,
	`acceptedAt` timestamp,
	`pickedUpAt` timestamp,
	`deliveredAt` timestamp,
	`cancelledAt` timestamp,
	`cancellationReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `otpVerifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`otp` varchar(6) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`isUsed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `otpVerifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `restaurants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`imageUrl` text,
	`coverImageUrl` text,
	`phone` varchar(20),
	`addressText` text,
	`lat` decimal(10,7),
	`lng` decimal(10,7),
	`cuisine` varchar(100),
	`openingHours` varchar(100),
	`isOpen` boolean NOT NULL DEFAULT true,
	`isAcceptingOrders` boolean NOT NULL DEFAULT true,
	`rating` decimal(3,2) DEFAULT '5.00',
	`totalOrders` int NOT NULL DEFAULT 0,
	`minOrderAmount` decimal(8,2) DEFAULT '0',
	`estimatedDeliveryTime` int DEFAULT 30,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `restaurants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','driver') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `addressText` text;--> statement-breakpoint
ALTER TABLE `users` ADD `addressLat` decimal(10,7);--> statement-breakpoint
ALTER TABLE `users` ADD `addressLng` decimal(10,7);