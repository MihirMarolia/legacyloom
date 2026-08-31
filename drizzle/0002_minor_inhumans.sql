CREATE TABLE `educationalContent` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`slug` varchar(180) NOT NULL,
	`locale` varchar(10) NOT NULL DEFAULT 'en',
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`body` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `educationalContent_id` PRIMARY KEY(`id`),
	CONSTRAINT `educationalContent_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `legalTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`kind` enum('will','prenup') NOT NULL,
	`status` enum('draft','review','approved','archived') NOT NULL DEFAULT 'draft',
	`version` int NOT NULL DEFAULT 1,
	`body` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `legalTemplates_id` PRIMARY KEY(`id`)
);
