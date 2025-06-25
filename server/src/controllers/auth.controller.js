const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../db/database');
const { validationResult } = require('express-validator');

/**
 * Register a new user
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.register = async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { email, password, firstName, lastName, phone } = req.body;

    // Check if user already exists
    const userExists = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await query(
      'INSERT INTO users (email, password_hash, first_name, last_name, phone, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, first_name, last_name, role, created_at',
      [email, hashedPassword, firstName, lastName, phone || null, 'member']
    );

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: {
          id: newUser.rows[0].id,
          email: newUser.rows[0].email,
          firstName: newUser.rows[0].first_name,
          lastName: newUser.rows[0].last_name,
          role: newUser.rows[0].role
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.login = async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Check if user exists
    const userResult = await query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    const user = userResult.rows[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user data
    const userResult = await query(
      'SELECT id, email, first_name, last_name, phone, role, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    return res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          role: user.role,
          createdAt: user.created_at
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.changePassword = async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Get user data
    const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, userId]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Forgot password - send reset link
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    // Check if user exists
    const userResult = await query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'If the email exists, a password reset link has been sent'
      });
    }

    const user = userResult.rows[0];

    // Generate reset token
    const resetToken = jwt.sign(
      { id: user.id, action: 'reset_password' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Store reset token in database
    await query(
      'UPDATE users SET reset_token = $1, reset_token_expires = NOW() + INTERVAL \'1 hour\' WHERE id = $2',
      [resetToken, user.id]
    );

    // In a real application, you would send an email here
    console.log(`Password reset link for ${email}: ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`);

    return res.status(200).json({
      status: 'success',
      message: 'If the email exists, a password reset link has been sent'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password with token
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.resetPassword = async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { token, newPassword } = req.body;

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired token'
      });
    }

    if (decoded.action !== 'reset_password') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid token type'
      });
    }

    // Find user with valid reset token
    const userResult = await query(
      'SELECT * FROM users WHERE id = $1 AND reset_token = $2 AND reset_token_expires > NOW()',
      [decoded.id, token]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired token'
      });
    }

    const user = userResult.rows[0];

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and clear reset token
    await query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW() WHERE id = $2',
      [hashedPassword, user.id]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    next(error);
  }
};