CREATE TABLE `guardiao_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`emailVerifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `guardiao_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `guardiao_accounts_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `guardiao_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`tokenHash` char(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `guardiao_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `guardiao_sessions_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
ALTER TABLE `guardiao_sessions` ADD CONSTRAINT `guardiao_sessions_accountId_guardiao_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `guardiao_accounts`(`id`) ON DELETE cascade ON UPDATE no action;