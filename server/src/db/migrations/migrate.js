const { pool } = require('../database');
const { config } = require('dotenv');

// Load environment variables
config();

// Database schema tables
const createTables = async () => {
  try {
    console.log('Starting database migration...');
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(50) DEFAULT 'member',
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('Users table created');
    
    // Create groups table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('Groups table created');
    
    // Create group_members table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS group_members (
        id UUID PRIMARY KEY,
        group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member',
        instrument VARCHAR(100),
        joined_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(group_id, user_id)
      )
    `);
    
    console.log('Group members table created');
    
    // Create rehearsals table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rehearsals (
        id UUID PRIMARY KEY,
        group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        location VARCHAR(255),
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        is_recurring BOOLEAN DEFAULT FALSE,
        recurrence_pattern VARCHAR(50),
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('Rehearsals table created');
    
    // Create attendance table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id UUID PRIMARY KEY,
        rehearsal_id UUID REFERENCES rehearsals(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        response_time TIMESTAMP,
        notes TEXT,
        UNIQUE(rehearsal_id, user_id)
      )
    `);
    
    console.log('Attendance table created');
    
    // Create availability table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS availability (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        day_of_week INTEGER,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_recurring BOOLEAN DEFAULT TRUE
      )
    `);
    
    console.log('Availability table created');
    
    // Create availability_exceptions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS availability_exceptions (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        is_available BOOLEAN DEFAULT FALSE,
        start_time TIME,
        end_time TIME,
        notes TEXT
      )
    `);
    
    console.log('Availability exceptions table created');
    
    // Create resources table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS resources (
        id UUID PRIMARY KEY,
        rehearsal_id UUID REFERENCES rehearsals(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        file_url VARCHAR(255),
        file_type VARCHAR(50),
        uploaded_by UUID REFERENCES users(id),
        uploaded_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('Resources table created');
    
    // Create notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        rehearsal_id UUID REFERENCES rehearsals(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('Notifications table created');
    
    console.log('Database migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
};

// Run migrations
const runMigrations = async () => {
  try {
    await createTables();
    console.log('All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

// Execute migrations
runMigrations();