CREATE TABLE `documentVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`label` varchar(120) NOT NULL,
	`storageKey` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documentVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `donations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`stripePaymentIntentId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `donations_id` PRIMARY KEY(`id`),
	CONSTRAINT `donations_stripePaymentIntentId_unique` UNIQUE(`stripePaymentIntentId`)
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`kind` enum('will','prenup') NOT NULL,
	`status` enum('draft','review','complete','archived') NOT NULL DEFAULT 'draft',
	`progress` int NOT NULL DEFAULT 0,
	`suitabilityAcknowledged` int NOT NULL DEFAULT 0,
	`answersJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reminderPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`unfinishedDocuments` int NOT NULL DEFAULT 0,
	`signingSteps` int NOT NULL DEFAULT 0,
	`periodicReviews` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reminderPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `reminderPreferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `reviewRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`userId` int NOT NULL,
	`reason` text,
	`status` enum('queued','assigned','completed','closed') NOT NULL DEFAULT 'queued',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviewRequests_id` PRIMARY KEY(`id`)
);
