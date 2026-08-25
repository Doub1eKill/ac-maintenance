-- Profile pictures. Stores the /uploads/... path produced by saveUpload(),
-- not the image itself — the file lives on disk like every other upload in
-- this app. Nullable because "no picture set" is the normal state for every
-- existing account, and the UI renders initials in that case.
-- AlterTable
ALTER TABLE `users` ADD COLUMN `avatar_url` VARCHAR(255) NULL AFTER `password`;
