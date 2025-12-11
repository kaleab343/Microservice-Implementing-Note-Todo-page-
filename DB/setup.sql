-- MySQL Database Setup Script for MicroNote
-- Run this script to create the database and user

-- Create database
CREATE DATABASE IF NOT EXISTS micronote 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Use the database
USE micronote;

-- Create a user for the application (optional)
-- CREATE USER IF NOT EXISTS 'micronote_user'@'localhost' IDENTIFIED BY 'micronote_password';
-- GRANT ALL PRIVILEGES ON micronote.* TO 'micronote_user'@'localhost';
-- FLUSH PRIVILEGES;

-- Note: Tables will be created automatically by Sequelize
-- This includes: users, notes, todos

-- Show database info
SELECT 'Database created successfully!' as message;
SHOW DATABASES LIKE 'micronote';

-- Show current database
SELECT DATABASE() as current_database;