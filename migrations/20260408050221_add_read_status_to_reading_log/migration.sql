/*
  Warnings:

  - The values [READING,DONE,EXCLUDED] on the enum `books_status` will be removed. If these variants are still used in the database, this will fail.

*/
-- DropForeignKey (FK를 먼저 제거해야 인덱스 삭제 가능)
ALTER TABLE `reading_logs` DROP FOREIGN KEY `reading_logs_bookId_fkey`;

-- DropIndex
DROP INDEX `reading_logs_bookId_key` ON `reading_logs`;

-- AddForeignKey (FK 재등록)
ALTER TABLE `reading_logs` ADD CONSTRAINT `reading_logs_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `books` MODIFY `status` ENUM('OWNED', 'SOLD', 'DONATED') NOT NULL DEFAULT 'OWNED';

-- AlterTable
ALTER TABLE `reading_logs` ADD COLUMN `readStatus` ENUM('READ', 'EXCLUDED') NULL;
