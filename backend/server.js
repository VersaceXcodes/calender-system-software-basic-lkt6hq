// server.mjs
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import axios from 'axios';

// Load environment variables from .env file
dotenv.config();

// Set up Postgres connection as per provided snippet
const { DATABASE_URL, PGHOST, PGDATABASE, PGUSER, PGPASSWORD, PGPORT = 5432 } = process.env;
const pool = new Pool(
  DATABASE_URL
    ? {
        connectionString: DATABASE_URL,
        ssl: { require: true }
      }
    : {
        host: PGHOST,
        database: PGDATABASE,
        user: PGUSER,
        password: PGPASSWORD,
        port: Number(PGPORT),
        ssl: { require: true }
      }
);

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Utility function for current ISO timestamp
function currentTimestamp() {
  return new Date().toISOString();
}

// JWT authentication middleware for REST endpoints
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: "No token provided" });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
}

// Function to send password reset email using SendGrid's API
async function sendPasswordResetEmail(userEmail, resetToken) {
  const resetUrl = `${process.env.RESET_PASSWORD_URL || 'https://yourdomain.com/reset-password?token='}${resetToken}`;
  const payload = {
    personalizations: [{
      to: [{ email: userEmail }],
      subject: "Password Reset Request"
    }],
    from: { email: process.env.SENDER_EMAIL || 'noreply@yourdomain.com' },
    content: [{
      type: "text/plain",
      value: `Please use the following link to reset your password: ${resetUrl}`
    }]
  };

  try {
    const response = await axios.post(
      'https://api.sendgrid.com/v3/mail/send',
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.status === 202;
  } catch (error) {
    console.error("Email sending failed:", error.response?.data || error);
    throw error;
  }
}

/*
  Endpoint: POST /auth/signup
  - Registers a new organizer account.
  - Inserts a new record into the "users" table with hashed password.
*/
app.post('/auth/signup', async (req, res) => {
  const { email, password, username, name, default_timezone, contact_details } = req.body;
  try {
    const hashed_password = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const timestamp = currentTimestamp();
    const query = `
      INSERT INTO users (id, email, password_hash, username, name, default_timezone, contact_details, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, email, username, name, default_timezone, created_at, updated_at;
    `;
    const values = [id, email, hashed_password, username, name, default_timezone, contact_details || {}, timestamp, timestamp];
    const { rows } = await pool.query(query, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error in signup:", err);
    res.status(500).json({ error: "Signup failed" });
  }
});

/*
  Endpoint: POST /auth/login
  - Authenticates a user by email and password.
  - Returns a JWT token on successful login.
*/
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const query = `SELECT * FROM users WHERE email = $1`;
    const { rows } = await pool.query(query, [email]);
    if (rows.length === 0) return res.status(400).json({ error: "User not found" });
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });
    // Create JWT token with user id and email as payload
    const auth_token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    // Exclude the password_hash from response
    const response_user = {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      default_timezone: user.default_timezone,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
    res.json({ auth_token, user: response_user });
  } catch (err) {
    console.error("Error in login:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

/*
  Endpoint: POST /auth/logout
  - Logs the user out. Since JWT is stateless, simply returns a success message.
*/
app.post('/auth/logout', (req, res) => {
  // In a complete implementation, JWT invalidation (blacklisting) might be performed here.
  res.json({ message: "Logout successful" });
});

/*
  Endpoint: POST /auth/password-reset-request
  - Creates a password reset request record.
  - Uses SendGrid API in production to send a reset email.
*/
app.post('/auth/password-reset-request', async (req, res) => {
  const { email } = req.body;
  try {
    // Find the user with the given email
    const userQuery = `SELECT * FROM users WHERE email = $1`;
    const { rows } = await pool.query(userQuery, [email]);
    if (rows.length === 0) return res.status(400).json({ error: "User not found" });
    const user = rows[0];
    const reset_token = uuidv4();
    const id = uuidv4();
    const created_at = currentTimestamp();
    // Set expiration 1 hour later
    const expires_at = new Date(Date.now() + 3600000).toISOString();
    const insertQuery = `
      INSERT INTO password_reset_requests (id, user_id, reset_token, created_at, expires_at)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await pool.query(insertQuery, [id, user.id, reset_token, created_at, expires_at]);
    // Send password reset email using SendGrid
    await sendPasswordResetEmail(email, reset_token);
    res.json({ message: "Reset token sent" });
  } catch (err) {
    console.error("Error in password reset request:", err);
    res.status(500).json({ error: "Password reset request failed" });
  }
});

/*
  Endpoint: POST /auth/password-reset
  - Verifies the reset token and updates the user's password.
*/
app.post('/auth/password-reset', async (req, res) => {
  const { reset_token, new_password } = req.body;
  try {
    // Find the reset request by token
    const query = `SELECT * FROM password_reset_requests WHERE reset_token = $1`;
    const { rows } = await pool.query(query, [reset_token]);
    if (rows.length === 0) return res.status(400).json({ error: "Invalid reset token" });
    const reset_request = rows[0];
    if (new Date(reset_request.expires_at) < new Date()) {
      return res.status(400).json({ error: "Reset token expired" });
    }
    // Hash new password and update user record
    const hashed_new_password = await bcrypt.hash(new_password, 10);
    const updateQuery = `
      UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3
    `;
    await pool.query(updateQuery, [hashed_new_password, currentTimestamp(), reset_request.user_id]);
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Error in password reset:", err);
    res.status(500).json({ error: "Password reset failed" });
  }
});

/*
  Endpoint: GET /users/profile
  - Retrieves the authenticated user's profile.
*/
app.get('/users/profile', authenticateToken, async (req, res) => {
  try {
    const query = `SELECT id, email, username, name, default_timezone, contact_details, created_at, updated_at FROM users WHERE id = $1`;
    const { rows } = await pool.query(query, [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Error in get profile:", err);
    res.status(500).json({ error: "Failed to retrieve profile" });
  }
});

/*
  Endpoint: PUT /users/profile
  - Updates profile details of the authenticated user.
*/
app.put('/users/profile', authenticateToken, async (req, res) => {
  const { email, name, default_timezone, contact_details } = req.body;
  try {
    const query = `
      UPDATE users SET email = $1, name = $2, default_timezone = $3, contact_details = $4, updated_at = $5
      WHERE id = $6
      RETURNING id, email, username, name, default_timezone, contact_details, created_at, updated_at
    `;
    const values = [email, name, default_timezone, contact_details || {}, currentTimestamp(), req.user.id];
    const { rows } = await pool.query(query, values);
    res.json(rows[0]);
  } catch (err) {
    console.error("Error in update profile:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

/*
  Recurring Availability Endpoints
*/

/*
  Endpoint: GET /availability/recurring
  - Retrieves recurring availability settings for the current user.
*/
app.get('/availability/recurring', authenticateToken, async (req, res) => {
  try {
    const query = `SELECT * FROM availability_recurring WHERE user_id = $1`;
    const { rows } = await pool.query(query, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error("Error in get recurring availability:", err);
    res.status(500).json({ error: "Failed to retrieve recurring availability" });
  }
});

/*
  Endpoint: POST /availability/recurring
  - Creates a new recurring availability entry.
*/
app.post('/availability/recurring', authenticateToken, async (req, res) => {
  const { day_of_week, start_time, end_time, buffer_before, buffer_after, meeting_duration } = req.body;
  try {
    const id = uuidv4();
    const timestamp = currentTimestamp();
    const query = `
      INSERT INTO availability_recurring (id, user_id, day_of_week, start_time, end_time, buffer_before, buffer_after, meeting_duration, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const values = [id, req.user.id, day_of_week, start_time, end_time, buffer_before, buffer_after, meeting_duration, timestamp, timestamp];
    const { rows } = await pool.query(query, values);
    req.app.get('io').emit('availability_updated', { user_id: req.user.id, type: 'recurring', updated_entry: rows[0], timestamp: timestamp });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error in create recurring availability:", err);
    res.status(500).json({ error: "Failed to create recurring availability" });
  }
});

/*
  Endpoint: PUT /availability/recurring/:id
  - Updates an existing recurring availability entry.
*/
app.put('/availability/recurring/:id', authenticateToken, async (req, res) => {
  const { day_of_week, start_time, end_time, buffer_before, buffer_after, meeting_duration } = req.body;
  const { id } = req.params;
  try {
    const timestamp = currentTimestamp();
    const query = `
      UPDATE availability_recurring 
      SET day_of_week = $1, start_time = $2, end_time = $3, buffer_before = $4, buffer_after = $5, meeting_duration = $6, updated_at = $7
      WHERE id = $8 AND user_id = $9
      RETURNING *
    `;
    const values = [day_of_week, start_time, end_time, buffer_before, buffer_after, meeting_duration, timestamp, id, req.user.id];
    const { rows } = await pool.query(query, values);
    if (rows.length === 0) return res.status(404).json({ error: "Recurring availability not found" });
    req.app.get('io').emit('availability_updated', { user_id: req.user.id, type: 'recurring', updated_entry: rows[0], timestamp: timestamp });
    res.json(rows[0]);
  } catch (err) {
    console.error("Error in update recurring availability:", err);
    res.status(500).json({ error: "Failed to update recurring availability" });
  }
});

/*
  Endpoint: DELETE /availability/recurring/:id
  - Deletes a recurring availability entry.
*/
app.delete('/availability/recurring/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const query = `DELETE FROM availability_recurring WHERE id = $1 AND user_id = $2`;
    await pool.query(query, [id, req.user.id]);
    res.status(204).send();
  } catch (err) {
    console.error("Error in delete recurring availability:", err);
    res.status(500).json({ error: "Failed to delete recurring availability" });
  }
});

/*
  Availability Exceptions Endpoints
*/

/*
  Endpoint: GET /availability/exceptions
  - Retrieves availability exceptions for the current user.
*/
app.get('/availability/exceptions', authenticateToken, async (req, res) => {
  try {
    const query = `SELECT * FROM availability_exceptions WHERE user_id = $1`;
    const { rows } = await pool.query(query, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error("Error in get availability exceptions:", err);
    res.status(500).json({ error: "Failed to retrieve availability exceptions" });
  }
});

/*
  Endpoint: POST /availability/exceptions
  - Creates a new availability exception.
*/
app.post('/availability/exceptions', authenticateToken, async (req, res) => {
  const { exception_date, start_time, end_time, note } = req.body;
  try {
    const id = uuidv4();
    const timestamp = currentTimestamp();
    const query = `
      INSERT INTO availability_exceptions (id, user_id, exception_date, start_time, end_time, note, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [id, req.user.id, exception_date, start_time, end_time, note, timestamp, timestamp];
    const { rows } = await pool.query(query, values);
    req.app.get('io').emit('availability_updated', { user_id: req.user.id, type: 'exception', updated_entry: rows[0], timestamp: timestamp });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error in create availability exception:", err);
    res.status(500).json({ error: "Failed to create availability exception" });
  }
});

/*
  Endpoint: PUT /availability/exceptions/:id
  - Updates an availability exception.
*/
app.put('/availability/exceptions/:id', authenticateToken, async (req, res) => {
  const { exception_date, start_time, end_time, note } = req.body;
  const { id } = req.params;
  try {
    const timestamp = currentTimestamp();
    const query = `
      UPDATE availability_exceptions
      SET exception_date = $1, start_time = $2, end_time = $3, note = $4, updated_at = $5
      WHERE id = $6 AND user_id = $7
      RETURNING *
    `;
    const values = [exception_date, start_time, end_time, note, timestamp, id, req.user.id];
    const { rows } = await pool.query(query, values);
    if (rows.length === 0) return res.status(404).json({ error: "Availability exception not found" });
    req.app.get('io').emit('availability_updated', { user_id: req.user.id, type: 'exception', updated_entry: rows[0], timestamp: timestamp });
    res.json(rows[0]);
  } catch (err) {
    console.error("Error in update availability exception:", err);
    res.status(500).json({ error: "Failed to update availability exception" });
  }
});

/*
  Endpoint: DELETE /availability/exceptions/:id
  - Deletes an availability exception.
*/
app.delete('/availability/exceptions/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const query = `DELETE FROM availability_exceptions WHERE id = $1 AND user_id = $2`;
    await pool.query(query, [id, req.user.id]);
    res.status(204).send();
  } catch (err) {
    console.error("Error in delete availability exception:", err);
    res.status(500).json({ error: "Failed to delete availability exception" });
  }
});

/*
  Meeting Types Endpoints
*/

/*
  Endpoint: GET /meeting-types
  - Lists all meeting types for the authenticated user.
*/
app.get('/meeting-types', authenticateToken, async (req, res) => {
  try {
    const query = `SELECT * FROM meeting_types WHERE user_id = $1`;
    const { rows } = await pool.query(query, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error("Error in get meeting types:", err);
    res.status(500).json({ error: "Failed to retrieve meeting types" });
  }
});

/*
  Endpoint: POST /meeting-types
  - Creates a new meeting type.
*/
app.post('/meeting-types', authenticateToken, async (req, res) => {
  const { name, description, duration, is_default } = req.body;
  try {
    const id = uuidv4();
    const timestamp = currentTimestamp();
    const query = `
      INSERT INTO meeting_types (id, user_id, name, description, duration, is_default, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [id, req.user.id, name, description, duration, is_default, timestamp, timestamp];
    const { rows } = await pool.query(query, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error in create meeting type:", err);
    res.status(500).json({ error: "Failed to create meeting type" });
  }
});

/*
  Endpoint: PUT /meeting-types/:id
  - Updates an existing meeting type.
*/
app.put('/meeting-types/:id', authenticateToken, async (req, res) => {
  const { name, description, duration, is_default } = req.body;
  const { id } = req.params;
  try {
    const timestamp = currentTimestamp();
    const query = `
      UPDATE meeting_types
      SET name = $1, description = $2, duration = $3, is_default = $4, updated_at = $5
      WHERE id = $6 AND user_id = $7
      RETURNING *
    `;
    const values = [name, description, duration, is_default, timestamp, id, req.user.id];
    const { rows } = await pool.query(query, values);
    if (rows.length === 0) return res.status(404).json({ error: "Meeting type not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Error in update meeting type:", err);
    res.status(500).json({ error: "Failed to update meeting type" });
  }
});

/*
  Endpoint: DELETE /meeting-types/:id
  - Deletes a meeting type.
*/
app.delete('/meeting-types/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const query = `DELETE FROM meeting_types WHERE id = $1 AND user_id = $2`;
    await pool.query(query, [id, req.user.id]);
    res.status(204).send();
  } catch (err) {
    console.error("Error in delete meeting type:", err);
    res.status(500).json({ error: "Failed to delete meeting type" });
  }
});

/*
  Appointments Endpoints
*/

/*
  Endpoint: GET /appointments
  - Retrieves appointments for the authenticated organizer.
  - Optional query filter (e.g., 'upcoming') can be applied.
*/
app.get('/appointments', authenticateToken, async (req, res) => {
  const { filter } = req.query;
  try {
    let query = `SELECT * FROM appointments WHERE organizer_id = $1`;
    const values = [req.user.id];
    if (filter === 'upcoming') {
      query += ` AND slot_start > $2`;
      values.push(currentTimestamp());
    }
    const { rows } = await pool.query(query, values);
    res.json(rows);
  } catch (err) {
    console.error("Error in get appointments:", err);
    res.status(500).json({ error: "Failed to retrieve appointments" });
  }
});

/*
  Endpoint: POST /appointments
  - Creates a new appointment (booking) using data provided by an invitee.
  - Calculates slot_end based on the meeting type’s duration.
  - Checks for overlapping appointments to prevent double-booking.
*/
app.post('/appointments', async (req, res) => {
  const { meeting_type_id, slot_start, invitee_name, invitee_email, invitee_phone, invitee_notes } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const mtQuery = `SELECT * FROM meeting_types WHERE id = $1`;
    const { rows: mtRows } = await client.query(mtQuery, [meeting_type_id]);
    if (mtRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid meeting type' });
    }
    const meeting_type = mtRows[0];
    const organizer_id = meeting_type.user_id;
    const startDate = new Date(slot_start);
    const slot_end = new Date(startDate.getTime() + meeting_type.duration * 60000).toISOString();

    const conflictQuery = `
      SELECT * FROM appointments
      WHERE organizer_id = $1 AND status = 'booked'
      AND NOT ($3 <= slot_start OR $2 >= slot_end)
    `;
    const conflictValues = [organizer_id, slot_start, slot_end];
    const { rows: conflictRows } = await client.query(conflictQuery, conflictValues);
    if (conflictRows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Time slot is already booked' });
    }

    const id = uuidv4();
    const cancellation_token = uuidv4();
    const timestamp = currentTimestamp();
    const insertQuery = `
      INSERT INTO appointments (id, organizer_id, meeting_type_id, slot_start, slot_end, status, invitee_name, invitee_email, invitee_phone, invitee_notes, cancellation_token, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, 'booked', $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    const valuesArr = [id, organizer_id, meeting_type_id, slot_start, slot_end, invitee_name, invitee_email, invitee_phone || null, invitee_notes || null, cancellation_token, timestamp, timestamp];
    const { rows } = await client.query(insertQuery, valuesArr);
    await client.query('COMMIT');
    const appointment = rows[0];
    req.app.get('io').emit('appointment_created', {
      appointment_id: appointment.id,
      organizer_id: appointment.organizer_id,
      meeting_type_id: appointment.meeting_type_id,
      slot_start: appointment.slot_start,
      slot_end: appointment.slot_end,
      status: appointment.status,
      invitee: {
        name: appointment.invitee_name,
        email: appointment.invitee_email,
        phone: appointment.invitee_phone
      }
    });
    res.status(201).json(appointment);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in create appointment:', err);
    res.status(500).json({ error: 'Failed to create appointment' });
  } finally {
    client.release();
  }
});

/*
  Endpoint: PUT /appointments/:id
  - Updates an appointment (reschedule or cancel) for authenticated organizers.
*/
app.put('/appointments/:id', authenticateToken, async (req, res) => {
  const { status, slot_start, slot_end } = req.body;
  const { id } = req.params;
  try {
    const timestamp = currentTimestamp();
    const query = `
      UPDATE appointments
      SET status = COALESCE($1, status), slot_start = COALESCE($2, slot_start), slot_end = COALESCE($3, slot_end), updated_at = $4
      WHERE id = $5 AND organizer_id = $6
      RETURNING *
    `;
    const values = [status, slot_start, slot_end, timestamp, id, req.user.id];
    const { rows } = await pool.query(query, values);
    if (rows.length === 0) return res.status(404).json({ error: 'Appointment not found or unauthorized' });
    const updatedAppointment = rows[0];
    req.app.get('io').emit('appointment_updated', {
      appointment_id: updatedAppointment.id,
      updated_fields: { status: updatedAppointment.status, slot_start: updatedAppointment.slot_start, slot_end: updatedAppointment.slot_end },
      timestamp: timestamp
    });
    res.json(updatedAppointment);
  } catch (err) {
    console.error('Error in update appointment:', err);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

/*
  Endpoint: GET /slots
  - Returns available time slots for a public scheduling page based on the organizer's username.
  - For simplicity, this implementation returns a mock list of slots.
*/
app.get('/slots', async (req, res) => {
  const { organizer } = req.query;
  if (!organizer) return res.status(400).json({ error: "Organizer username is required" });
  try {
    // Find organizer by username to get their ID and default timezone
    const userQuery = `SELECT * FROM users WHERE username = $1`;
    const { rows } = await pool.query(userQuery, [organizer]);
    if (rows.length === 0) return res.status(404).json({ error: "Organizer not found" });
    const user = rows[0];
    // This is a simplified mock implementation.
    // In a full implementation, this would combine recurring availability, exceptions, and existing appointments.
    const slots = [
      { start_time: new Date(Date.now() + 3600000).toISOString(), end_time: new Date(Date.now() + 5400000).toISOString(), available: true },
      { start_time: new Date(Date.now() + 7200000).toISOString(), end_time: new Date(Date.now() + 9000000).toISOString(), available: true },
      { start_time: new Date(Date.now() + 10800000).toISOString(), end_time: new Date(Date.now() + 12600000).toISOString(), available: false }
    ];
    res.json(slots);
  } catch (err) {
    console.error("Error in get slots:", err);
    res.status(500).json({ error: "Failed to retrieve slots" });
  }
});

// ESM workaround for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create HTTP Server and initialize Socket.IO
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, { cors: { origin: '*' } });
app.set('io', io);

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return next(new Error('Authentication error'));
      socket.user = user;
      next();
    });
  } else {
    next();
  }
});

// Handle realtime connection and events
io.on('connection', (socket) => {
  console.log('New WebSocket connection:', socket.id);

  // Listen for "lock_slot" event from clients
  socket.on("lock_slot", async (data) => {
    // Expected data: { organizer_id, slot_start, slot_end }
    const { organizer_id, slot_start, slot_end } = data;
    try {
      const lock_expires_at = new Date(Date.now() + 30000).toISOString();
      const payload = { ...data, lock_expires_at };
      // Emit the "slot_locked" event to all connected clients
      io.emit("slot_locked", payload);
    } catch (error) {
      console.error("Error processing slot lock:", error);
      socket.emit("error", { message: "Error processing slot lock" });
    }
  });

  socket.on("disconnect", () => {
    console.log('WebSocket disconnected:', socket.id);
    // Optionally: Clean up any locks associated with this disconnected client if applicable.
  });
});

// Start the server on port from environment or default 3000
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});