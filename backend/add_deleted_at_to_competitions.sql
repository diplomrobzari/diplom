-- SQL для добавления soft delete в таблицу competitions
ALTER TABLE competitions ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at;
