-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'SUPERVISOR', 'SCAN_AGENT', 'REPORT_AGENT') NOT NULL DEFAULT 'SCAN_AGENT',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `mustChangePassword` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Participant` (
    `id` VARCHAR(191) NOT NULL,
    `participantType` ENUM('PARTICIPANT', 'COACH', 'ORGANIZER', 'GUEST') NOT NULL DEFAULT 'PARTICIPANT',
    `sourceCategory` VARCHAR(191) NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `school` VARCHAR(191) NULL,
    `organization` VARCHAR(191) NULL,
    `groupName` VARCHAR(191) NULL,
    `teamName` VARCHAR(191) NULL,
    `roleLabel` VARCHAR(191) NULL,
    `competitionMode` VARCHAR(191) NULL,
    `memberCount` INTEGER NULL,
    `competitionLevel` VARCHAR(191) NULL,
    `competitionCategories` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `gender` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `statusLabel` VARCHAR(191) NULL,
    `badgeCode` VARCHAR(191) NOT NULL,
    `qrToken` VARCHAR(191) NOT NULL,
    `photoPath` VARCHAR(191) NULL,
    `hasSmartphone` BOOLEAN NULL,
    `expectedPresence` ENUM('MONDAY', 'TUESDAY', 'BOTH_DAYS', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
    `isLastMinute` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sourceReference` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Participant_badgeCode_key`(`badgeCode`),
    UNIQUE INDEX `Participant_qrToken_key`(`qrToken`),
    INDEX `Participant_fullName_idx`(`fullName`),
    INDEX `Participant_phone_idx`(`phone`),
    INDEX `Participant_email_idx`(`email`),
    INDEX `Participant_groupName_idx`(`groupName`),
    INDEX `Participant_teamName_idx`(`teamName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Passage` (
    `id` VARCHAR(191) NOT NULL,
    `participantId` VARCHAR(191) NOT NULL,
    `movementType` ENUM('ENTRY', 'EXIT') NOT NULL,
    `scannedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `scannedByUserId` VARCHAR(191) NOT NULL,
    `scanMethod` ENUM('QR_SCAN', 'MANUAL_BADGE_CODE', 'MANUAL_SEARCH', 'ADMIN_CORRECTION') NOT NULL,
    `gateName` VARCHAR(191) NULL,
    `deviceName` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `isCancelled` BOOLEAN NOT NULL DEFAULT false,
    `cancelledAt` DATETIME(3) NULL,
    `cancelledByUserId` VARCHAR(191) NULL,
    `cancelReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Passage_participantId_scannedAt_idx`(`participantId`, `scannedAt`),
    INDEX `Passage_scannedAt_idx`(`scannedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AlertAction` (
    `id` VARCHAR(191) NOT NULL,
    `participantId` VARCHAR(191) NOT NULL,
    `actionType` ENUM('CONTACTED', 'AUTHORIZED_EXIT', 'RETURN_CONFIRMED', 'ESCALATED') NOT NULL,
    `note` TEXT NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BadgeTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `templatePath` VARCHAR(191) NULL,
    `logoPrimaryPath` VARCHAR(191) NULL,
    `logoSecondaryPath` VARCHAR(191) NULL,
    `logoPartnerPath` VARCHAR(191) NULL,
    `backgroundPath` VARCHAR(191) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Setting` (
    `id` VARCHAR(191) NOT NULL,
    `eventName` VARCHAR(191) NOT NULL,
    `publicBaseUrl` VARCHAR(191) NOT NULL,
    `exitWarningMinutes` INTEGER NOT NULL DEFAULT 30,
    `exitCriticalMinutes` INTEGER NOT NULL DEFAULT 60,
    `duplicateScanWindowSeconds` INTEGER NOT NULL DEFAULT 30,
    `allowSelfPhotoUpload` BOOLEAN NOT NULL DEFAULT true,
    `requirePhotoValidation` BOOLEAN NOT NULL DEFAULT false,
    `bootstrapCompleted` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImportBatch` (
    `id` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `sourceCategory` VARCHAR(191) NOT NULL,
    `importedByUserId` VARCHAR(191) NOT NULL,
    `totalRows` INTEGER NOT NULL,
    `importedRows` INTEGER NOT NULL,
    `skippedRows` INTEGER NOT NULL,
    `errorRows` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `detailsJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Passage` ADD CONSTRAINT `Passage_participantId_fkey` FOREIGN KEY (`participantId`) REFERENCES `Participant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Passage` ADD CONSTRAINT `Passage_scannedByUserId_fkey` FOREIGN KEY (`scannedByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Passage` ADD CONSTRAINT `Passage_cancelledByUserId_fkey` FOREIGN KEY (`cancelledByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AlertAction` ADD CONSTRAINT `AlertAction_participantId_fkey` FOREIGN KEY (`participantId`) REFERENCES `Participant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AlertAction` ADD CONSTRAINT `AlertAction_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImportBatch` ADD CONSTRAINT `ImportBatch_importedByUserId_fkey` FOREIGN KEY (`importedByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
