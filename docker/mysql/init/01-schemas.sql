CREATE DATABASE IF NOT EXISTS hermes_meta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS hermes_chat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS hermes_eval CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON hermes_meta.* TO 'hermes'@'%';
GRANT ALL PRIVILEGES ON hermes_chat.* TO 'hermes'@'%';
GRANT ALL PRIVILEGES ON hermes_eval.* TO 'hermes'@'%';
FLUSH PRIVILEGES;
