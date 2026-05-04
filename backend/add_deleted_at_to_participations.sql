-- SQL для добавления soft delete в таблицу participations
ALTER TABLE participations ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at;
