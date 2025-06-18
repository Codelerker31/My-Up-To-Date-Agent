const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

class AuthService {
  constructor(databaseService) {
    this.db = databaseService;
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.jwtExpiry = process.env.JWT_EXPIRY || '24h';
  }

  async register(userData) {
    try {
      const { email, password, name } = userData;

      // Check if user already exists
      const existingUser = await this.db.getUserByEmail(email);
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await this.db.createUser({
        email,
        passwordHash,
        name,
        preferences: {
          timezone: 'America/New_York',
          emailNotifications: true,
          theme: 'dark'
        }
      });

      // Generate JWT token
      const token = this.generateToken(user);

      // Return user data without password hash
      const { password_hash, ...userWithoutPassword } = user;
      
      return {
        user: userWithoutPassword,
        token
      };
    } catch (error) {
      logger.error('Error in user registration:', error);
      throw error;
    }
  }

  async login(credentials) {
    try {
      const { email, password } = credentials;

      // Get user by email
      const user = await this.db.getUserByEmail(email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Generate JWT token
      const token = this.generateToken(user);

      // Return user data without password hash
      const { password_hash, ...userWithoutPassword } = user;
      
      return {
        user: userWithoutPassword,
        token
      };
    } catch (error) {
      logger.error('Error in user login:', error);
      throw error;
    }
  }

  async verifyToken(token) {
    try {
      if (!token) {
        throw new Error('No token provided');
      }

      // Remove 'Bearer ' prefix if present
      const cleanToken = token.replace('Bearer ', '');

      // Verify JWT token
      const decoded = jwt.verify(cleanToken, this.jwtSecret);
      
      // Get user from database
      const user = await this.db.getUserById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Return user data without password hash
      const { password_hash, ...userWithoutPassword } = user;
      
      return userWithoutPassword;
    } catch (error) {
      logger.error('Error verifying token:', error);
      throw new Error('Invalid or expired token');
    }
  }

  async refreshToken(token) {
    try {
      const user = await this.verifyToken(token);
      const newToken = this.generateToken(user);
      
      return {
        user,
        token: newToken
      };
    } catch (error) {
      logger.error('Error refreshing token:', error);
      throw error;
    }
  }

  async updateUserProfile(userId, updates) {
    try {
      // Don't allow updating sensitive fields directly
      const { password, password_hash, email, ...safeUpdates } = updates;

      if (Object.keys(safeUpdates).length === 0) {
        throw new Error('No valid updates provided');
      }

      // Update user in database
      const updatedUser = await this.db.updateUser(userId, safeUpdates);
      
      // Return user data without password hash
      const { password_hash: _, ...userWithoutPassword } = updatedUser;
      
      return userWithoutPassword;
    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw error;
    }
  }

  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Get user
      const user = await this.db.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password in database
      await this.db.updateUser(userId, { password_hash: newPasswordHash });

      return { success: true, message: 'Password updated successfully' };
    } catch (error) {
      logger.error('Error changing password:', error);
      throw error;
    }
  }

  async resetPassword(email) {
    try {
      // Get user by email
      const user = await this.db.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists for security
        return { success: true, message: 'If the email exists, a reset link has been sent' };
      }

      // Generate reset token (in production, you'd implement proper password reset)
      const resetToken = jwt.sign(
        { userId: user.id, type: 'password_reset' },
        this.jwtSecret,
        { expiresIn: '1h' }
      );

      // In production, you'd send an email with the reset link
      logger.info(`Password reset requested for user ${user.id}. Reset token: ${resetToken}`);

      return { 
        success: true, 
        message: 'If the email exists, a reset link has been sent',
        // In production, don't return the token
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
      };
    } catch (error) {
      logger.error('Error in password reset:', error);
      throw error;
    }
  }

  async validateResetToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      
      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid reset token');
      }

      const user = await this.db.getUserById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      return { valid: true, userId: user.id };
    } catch (error) {
      logger.error('Error validating reset token:', error);
      return { valid: false };
    }
  }

  async resetPasswordWithToken(token, newPassword) {
    try {
      const validation = await this.validateResetToken(token);
      if (!validation.valid) {
        throw new Error('Invalid or expired reset token');
      }

      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await this.db.updateUser(validation.userId, { password_hash: passwordHash });

      return { success: true, message: 'Password reset successfully' };
    } catch (error) {
      logger.error('Error resetting password with token:', error);
      throw error;
    }
  }

  generateToken(user) {
    return jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        type: 'access_token'
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiry }
    );
  }

  // Middleware for protecting routes
  requireAuth() {
    return async (req, res, next) => {
      try {
        const token = req.headers.authorization;
        if (!token) {
          return res.status(401).json({ error: 'No token provided' });
        }

        const user = await this.verifyToken(token);
        req.user = user;
        next();
      } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    };
  }

  // Optional auth middleware (doesn't fail if no token)
  optionalAuth() {
    return async (req, res, next) => {
      try {
        const token = req.headers.authorization;
        if (token) {
          const user = await this.verifyToken(token);
          req.user = user;
        }
        next();
      } catch (error) {
        // Continue without user if token is invalid
        next();
      }
    };
  }
}

module.exports = AuthService; 