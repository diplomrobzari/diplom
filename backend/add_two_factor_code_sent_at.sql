-- Миграция для добавления поля two_factor_code_sent_at в таблицу users
-- Выполните этот SQL запрос в phpMyAdmin или через консоль MySQL

ALTER TABLE users ADD COLUMN two_factor_code_sent_at TIMESTAMP NULL AFTER two_factor_code;
