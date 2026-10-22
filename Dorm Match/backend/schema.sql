-- Roomie MySQL schema (utf8mb4 / InnoDB)
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  avatar VARCHAR(32) DEFAULT NULL,
  line VARCHAR(64) NOT NULL DEFAULT '',
  phone VARCHAR(64) NOT NULL DEFAULT '',
  verification_status VARCHAR(32) NOT NULL DEFAULT 'none',
  member_since DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_member_since (member_since),
  KEY idx_users_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rooms (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id BIGINT UNSIGNED DEFAULT NULL,
  title VARCHAR(255) NOT NULL,
  type ENUM('studio', 'single', 'shared') NOT NULL,
  price INT NOT NULL,
  location TEXT NOT NULL,
  distance VARCHAR(255) NOT NULL,
  available DATE NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  rating_avg DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  review_count INT NOT NULL DEFAULT 0,
  poster_name VARCHAR(255) NOT NULL,
  line VARCHAR(64) NOT NULL,
  phone VARCHAR(64) NOT NULL,
  poster_avatar VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rooms_owner_id (owner_id),
  KEY idx_rooms_status (status),
  KEY idx_rooms_type (type),
  KEY idx_rooms_available (available),
  KEY idx_rooms_price (price),
  KEY idx_rooms_rating (rating_avg),
  CONSTRAINT fk_rooms_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE room_photos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_id BIGINT UNSIGNED NOT NULL,
  photo_url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_room_photos_room_id (room_id),
  KEY idx_room_photos_room_sort (room_id, sort_order),
  CONSTRAINT fk_room_photos_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE room_amenities (
  room_id BIGINT UNSIGNED NOT NULL,
  amenity_name VARCHAR(128) NOT NULL,
  PRIMARY KEY (room_id, amenity_name),
  CONSTRAINT fk_room_amenities_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reviews (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_id BIGINT UNSIGNED DEFAULT NULL,
  user_id BIGINT UNSIGNED DEFAULT NULL,
  author VARCHAR(255) NOT NULL,
  avatar VARCHAR(32) NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  comment TEXT NOT NULL,
  review_date DATE NOT NULL,
  review_type VARCHAR(64) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_reviews_room_id (room_id),
  KEY idx_reviews_user_id (user_id),
  KEY idx_reviews_review_date (review_date),
  KEY idx_reviews_rating (rating),
  CONSTRAINT fk_reviews_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE SET NULL,
  CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE contact_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  room_id BIGINT UNSIGNED NOT NULL,
  channel ENUM('call', 'line') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_contact_events_user_id (user_id),
  KEY idx_contact_events_room_id (room_id),
  KEY idx_contact_events_created_at (created_at),
  KEY idx_contact_events_user_room (user_id, room_id),
  CONSTRAINT fk_contact_events_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_contact_events_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
