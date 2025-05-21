-- Drop tables in reverse dependency order to avoid foreign key conflicts
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS meeting_types;
DROP TABLE IF EXISTS availability_exceptions;
DROP TABLE IF EXISTS availability_recurring;
DROP TABLE IF EXISTS password_reset_requests;
DROP TABLE IF EXISTS users;

-- Create the "users" table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  default_timezone TEXT NOT NULL,
  contact_details JSON,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Create the "password_reset_requests" table
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  reset_token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create the "availability_recurring" table
CREATE TABLE IF NOT EXISTS availability_recurring (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,  -- 0 = Sunday, 1 = Monday, ... , 6 = Saturday
  start_time TEXT NOT NULL,      -- e.g., "09:00"
  end_time TEXT NOT NULL,        -- e.g., "17:00"
  buffer_before INTEGER NOT NULL, -- in minutes
  buffer_after INTEGER NOT NULL,  -- in minutes
  meeting_duration INTEGER NOT NULL, -- in minutes (e.g., 15, 30, 60)
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create the "availability_exceptions" table
CREATE TABLE IF NOT EXISTS availability_exceptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  exception_date TEXT NOT NULL, -- Specific date in YYYY-MM-DD format
  start_time TEXT,              -- Can be null if marking an unavailability
  end_time TEXT,                -- Can be null if marking an unavailability
  note TEXT,                    -- Optional explanation (e.g., "Holiday")
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create the "meeting_types" table
CREATE TABLE IF NOT EXISTS meeting_types (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,           -- Meeting type title
  description TEXT NOT NULL,    -- Details/instructions for the meeting type
  duration INTEGER NOT NULL,    -- Duration in minutes (e.g., 15, 30, 60)
  is_default BOOLEAN NOT NULL,  -- Indicates if this is the default meeting type
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create the "appointments" table
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  organizer_id TEXT NOT NULL,   -- References the service provider (users.id)
  meeting_type_id TEXT NOT NULL, -- References the meeting_types.id
  slot_start TEXT NOT NULL,      -- Start date and time in ISO (e.g., "2023-10-15T09:00:00Z")
  slot_end TEXT NOT NULL,        -- End date and time computed based on duration
  status TEXT NOT NULL,          -- E.g., "booked", "canceled", "rescheduled"
  invitee_name TEXT NOT NULL,
  invitee_email TEXT NOT NULL,
  invitee_phone TEXT,
  invitee_notes TEXT,
  cancellation_token TEXT NOT NULL, -- Token for secure cancellation/rescheduling
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organizer_id) REFERENCES users(id),
  FOREIGN KEY (meeting_type_id) REFERENCES meeting_types(id)
);

-- ================================================================
-- SEED DATA
-- Insert sample data for production-ready testing
-- ================================================================

-- Seed Users (Organizers)
INSERT INTO users (id, email, password_hash, username, name, default_timezone, contact_details, created_at, updated_at) VALUES
('user1', 'alice@simplecal.com', 'hashedpassword1', 'alice', 'Alice Anderson', 'America/New_York',
 '{"phone": "123-456-7890", "image": "https://picsum.photos/seed/alice/200"}', '2023-10-01T10:00:00Z', '2023-10-01T10:00:00Z'),
('user2', 'bob@simplecal.com', 'hashedpassword2', 'bob', 'Bob Brown', 'Europe/London',
 '{"phone": "234-567-8901", "image": "https://picsum.photos/seed/bob/200"}', '2023-10-02T11:00:00Z', '2023-10-02T11:00:00Z'),
('user3', 'carol@simplecal.com', 'hashedpassword3', 'carol', 'Carol Clark', 'Asia/Tokyo',
 '{"phone": "345-678-9012", "image": "https://picsum.photos/seed/carol/200"}', '2023-10-03T12:00:00Z', '2023-10-03T12:00:00Z');

-- Seed Password Reset Requests
INSERT INTO password_reset_requests (id, user_id, reset_token, created_at, expires_at) VALUES
('reset1', 'user1', 'token123', '2023-10-05T10:00:00Z', '2023-10-05T11:00:00Z');

-- Seed Recurring Availability for Organizers
INSERT INTO availability_recurring (id, user_id, day_of_week, start_time, end_time, buffer_before, buffer_after, meeting_duration, created_at, updated_at) VALUES
('avail1', 'user1', 1, '09:00', '17:00', 15, 15, 30, '2023-10-01T10:00:00Z', '2023-10-01T10:00:00Z'),
('avail2', 'user1', 3, '10:00', '18:00', 10, 10, 30, '2023-10-01T10:05:00Z', '2023-10-01T10:05:00Z'),
('avail3', 'user2', 2, '08:00', '16:00', 15, 15, 60, '2023-10-02T12:00:00Z', '2023-10-02T12:00:00Z'),
('avail4', 'user3', 4, '09:30', '17:30', 5, 5, 45, '2023-10-03T13:00:00Z', '2023-10-03T13:00:00Z');

-- Seed Availability Exceptions (e.g., holidays or special events)
INSERT INTO availability_exceptions (id, user_id, exception_date, start_time, end_time, note, created_at, updated_at) VALUES
('availexc1', 'user1', '2023-10-31', NULL, NULL, 'Halloween - closed', '2023-10-10T09:00:00Z', '2023-10-10T09:00:00Z'),
('availexc2', 'user2', '2023-11-01', '10:00', '14:00', 'Special event availability', '2023-10-15T08:00:00Z', '2023-10-15T08:00:00Z');

-- Seed Meeting Types for Organizers
INSERT INTO meeting_types (id, user_id, name, description, duration, is_default, created_at, updated_at) VALUES
('mt1', 'user1', 'Initial Consultation', '30-minute introductory meeting', 30, true, '2023-10-01T10:10:00Z', '2023-10-01T10:10:00Z'),
('mt2', 'user1', 'Follow-up', '15-minute follow-up meeting', 15, false, '2023-10-01T10:15:00Z', '2023-10-01T10:15:00Z'),
('mt3', 'user2', 'Standard Appointment', '60-minute standard appointment', 60, true, '2023-10-02T12:10:00Z', '2023-10-02T12:10:00Z'),
('mt4', 'user3', 'Consultation', '45-minute consultation session', 45, true, '2023-10-03T13:10:00Z', '2023-10-03T13:10:00Z');

-- Seed Appointments (Booking records)
INSERT INTO appointments (id, organizer_id, meeting_type_id, slot_start, slot_end, status, invitee_name, invitee_email, invitee_phone, invitee_notes, cancellation_token, created_at, updated_at) VALUES
('appt1', 'user1', 'mt1', '2023-10-10T10:00:00Z', '2023-10-10T10:30:00Z', 'booked', 'David', 'david@example.com', '555-1234', 'Looking forward to it', 'canceltoken1', '2023-10-05T09:00:00Z', '2023-10-05T09:00:00Z'),
('appt2', 'user1', 'mt2', '2023-10-11T11:00:00Z', '2023-10-11T11:15:00Z', 'booked', 'Eva', 'eva@example.com', '555-5678', 'Discuss project details', 'canceltoken2', '2023-10-05T10:00:00Z', '2023-10-05T10:00:00Z'),
('appt3', 'user2', 'mt3', '2023-10-12T14:00:00Z', '2023-10-12T15:00:00Z', 'booked', 'Frank', 'frank@example.com', NULL, 'Regular checkup', 'canceltoken3', '2023-10-06T11:00:00Z', '2023-10-06T11:00:00Z'),
('appt4', 'user3', 'mt4', '2023-10-13T09:00:00Z', '2023-10-13T09:45:00Z', 'booked', 'Grace', 'grace@example.com', '555-6789', 'Consultation session', 'canceltoken4', '2023-10-07T12:00:00Z', '2023-10-07T12:00:00Z');