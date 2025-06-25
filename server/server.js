const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const { config } = require('dotenv');
const { pool } = require('./src/db/database');
const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');
const groupRoutes = require('./src/routes/group.routes');
const rehearsalRoutes = require('./src/routes/rehearsal.routes');
const attendanceRoutes = require('./src/routes/attendance.routes');
const { errorHandler } = require('./src/middleware/errorHandler');
const { authenticateJWT } = require('./src/middleware/auth');

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection test
app.get('/api/health', async (req, res) => {
  try {
    const dbCheck = await pool.query('SELECT NOW()');
    return res.status(200).json({
      status: 'success',
      message: 'Server is healthy',
      database: 'connected',
      timestamp: dbCheck.rows[0].now
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Server is running but database connection failed',
      error: error.message
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateJWT, userRoutes);
app.use('/api/groups', authenticateJWT, groupRoutes);
app.use('/api/rehearsals', authenticateJWT, rehearsalRoutes);
app.use('/api/attendance', authenticateJWT, attendanceRoutes);

// 404 route
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
  // Close server & exit process
  process.exit(1);
});

module.exports = app;