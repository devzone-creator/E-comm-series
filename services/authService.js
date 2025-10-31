import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import DatabaseUtils from '../config/db-utils.js';
import EmailService from './emailService.js';

class AuthService {
  static generateAccessToken(userId, email, role) {
    return jwt.sign({ userId, email, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
  }

  static generateRefreshToken(userId) {
    return jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN });
  }

  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  static validatePasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);

    const errors = [];

    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }
    if (!hasUpperCase) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!hasLowerCase) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!hasNumbers) {
      errors.push('Password must contain at least one number');
    }
    if (!hasSpecialChar) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength: this.calculatePasswordStrength(password)
    };
  }

  static calculatePasswordStrength(password) {
    let score = 0;
    
    // Length bonus
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    
    // Character variety bonus
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[@$!%*?&]/.test(password)) score += 1;
    
    // Additional complexity bonus
    if (/[^A-Za-z0-9@$!%*?&]/.test(password)) score += 1;
    
    if (score <= 3) return 'weak';
    if (score <= 5) return 'medium';
    if (score <= 7) return 'strong';
    return 'very-strong';
  }

  // Handle failed login attempts and account lockout
  static async handleFailedLogin(userId) {
    try {
      const user = await DatabaseUtils.findOne('users', { id: userId });
      if (!user) return;

      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      const maxAttempts = 5;
      const lockoutDuration = 30; // minutes

      let updateData = {
        failed_login_attempts: failedAttempts
      };

      // Lock account if max attempts reached
      if (failedAttempts >= maxAttempts) {
        const lockoutUntil = new Date(Date.now() + lockoutDuration * 60 * 1000);
        updateData.lockout_until = lockoutUntil;
        updateData.failed_login_attempts = 0; // Reset counter after lockout
      }

      await DatabaseUtils.update('users', updateData, { id: userId });
    } catch (error) {
      console.error('Failed to handle failed login:', error.message);
    }
  }

  // Register new user
  static async register(userData) {
    try {
      const { email, password, firstName, lastName, phone } = userData;

      // Check if user already exists
      const existingUser = await DatabaseUtils.findOne('users', { email });
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Validate password strength
      const passwordValidation = this.validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join('. '));
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationTokenExpires = new Date(Date.now() + 3600000); // 1 hour

      // Create user with retry logic
      const newUser = await DatabaseUtils.insert('users', {
        email: email.toLowerCase(),
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        role: 'customer',
        is_active: false, // User is inactive until email is verified
        email_verification_token: verificationToken,
        email_verification_token_expires: emailVerificationTokenExpires,
      });

      // Send verification email
      const emailResult = await EmailService.sendVerificationEmail(newUser.email, verificationToken);
      
      let message = 'Registration successful. Please check your email to verify your account.';
      if (!emailResult.success) {
        message = 'Registration successful, but we couldn\'t send the verification email. Please contact support.';
        console.log('📧 Email preview URL for manual verification:', emailResult.previewUrl);
      }

      return {
        success: true,
        message,
        emailPreviewUrl: emailResult.previewUrl // For development/testing
      };
    } catch (error) {
      console.error('Registration error:', error.message);
      
      // Provide more specific error messages for connection issues
      if (error.message.includes('Connection terminated') || error.message.includes('ECONNRESET')) {
        throw new Error('Database connection issue. Please try again in a moment.');
      }
      
      // Handle duplicate email error
      if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
        throw new Error('An account with this email already exists');
      }
      
      throw new Error(error.message || 'Registration failed');
    }
  }

  // Verify email address
  static async verifyEmail(token) {
    try {
      const user = await DatabaseUtils.findOne('users', { email_verification_token: token });

      if (!user) {
        throw new Error('Invalid verification token.');
      }

      if (new Date(user.email_verification_token_expires) < new Date()) {
        throw new Error('Verification token has expired.');
      }

      await DatabaseUtils.update('users', {
        is_active: true,
        email_verification_token: null,
        email_verification_token_expires: null,
      }, { id: user.id });

      return {
        success: true,
        message: 'Email verified successfully. You can now log in.',
      };
    } catch (error) {
      console.error('Email verification error:', error.message);
      throw new Error(error.message || 'Email verification failed');
    }
  }

  // Login user
  static async login(email, password) {
    try {
      // Find user by email with retry logic
      const user = await DatabaseUtils.findOne('users', { email: email.toLowerCase() });
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (!user.is_active) {
        throw new Error('Please verify your email address before logging in');
      }

      // Check if account is locked
      if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
        const lockoutTime = Math.ceil((new Date(user.lockout_until) - new Date()) / 60000);
        throw new Error(`Account is locked. Please try again in ${lockoutTime} minutes.`);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        // Increment failed login attempts
        await this.handleFailedLogin(user.id);
        throw new Error('Invalid email or password');
      }

      // Reset failed login attempts on successful login
      if (user.failed_login_attempts > 0) {
        await DatabaseUtils.update('users', {
          failed_login_attempts: 0,
          lockout_until: null
        }, { id: user.id });
      }

      // Generate tokens
      const accessToken = this.generateAccessToken(user.id, user.email, user.role);
      const refreshToken = this.generateRefreshToken(user.id);

      // Store refresh token in database with retry logic
      try {
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await DatabaseUtils.insert('refresh_tokens', {
          user_id: user.id,
          token: refreshToken,
          expires_at: expiresAt,
        });
      } catch (tokenError) {
        console.warn('Failed to store refresh token, continuing with login:', tokenError.message);
        // Continue with login even if refresh token storage fails
      }

      return {
        success: true,
        user,
        accessToken,
        refreshToken,
        message: 'Login successful'
      };
    } catch (error) {
      console.error('Login error:', error.message);
      
      // Provide more specific error messages for connection issues
      if (error.message.includes('Connection terminated') || error.message.includes('ECONNRESET')) {
        throw new Error('Database connection issue. Please try again in a moment.');
      }
      
      throw new Error(error.message || 'Login failed');
    }
  }

  // Refresh access token
  static async refreshAccessToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
      const userId = decoded.userId;

      // Check if refresh token exists in database
      const refreshToken = await DatabaseUtils.findOne('refresh_tokens', { token, user_id: userId });
      if (!refreshToken) {
        throw new Error('Invalid refresh token.');
      }

      // Check if refresh token has expired
      if (new Date(refreshToken.expires_at) < new Date()) {
        throw new Error('Refresh token has expired.');
      }

      // Generate new access token
      const user = await DatabaseUtils.findOne('users', { id: userId });
      const accessToken = this.generateAccessToken(user.id, user.email, user.role);

      return {
        success: true,
        accessToken,
      };
    } catch (error) {
      console.error('Refresh token error:', error.message);
      throw new Error(error.message || 'Failed to refresh access token');
    }
  }

  // Logout user
  static async logout(token) {
    try {
      await DatabaseUtils.delete('refresh_tokens', { token });
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      console.error('Logout error:', error.message);
      throw new Error(error.message || 'Logout failed');
    }
  }

  // Get user profile
  static async getProfile(userId) {
    try {
      const user = await DatabaseUtils.findOne('users', { id: userId });
      if (!user) {
        throw new Error('User not found');
      }

      // Remove sensitive information
      delete user.password_hash;
      delete user.email_verification_token;
      delete user.email_verification_token_expires;

      return {
        success: true,
        user
      };
    } catch (error) {
      console.error('Get profile error:', error.message);
      throw new Error(error.message || 'Failed to get profile');
    }
  }

  // Update user profile
  static async updateProfile(userId, updateData) {
    try {
      const { firstName, lastName, phone } = updateData;

      const user = await DatabaseUtils.findOne('users', { id: userId });
      if (!user) {
        throw new Error('User not found');
      }

      const updatedUser = await DatabaseUtils.update('users', {
        first_name: firstName,
        last_name: lastName,
        phone: phone || null
      }, { id: userId });

      // Remove sensitive information
      delete updatedUser.password_hash;
      delete updatedUser.email_verification_token;
      delete updatedUser.email_verification_token_expires;

      return {
        success: true,
        user: updatedUser,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      console.error('Update profile error:', error.message);
      throw new Error(error.message || 'Failed to update profile');
    }
  }

  // Change password
  static async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await DatabaseUtils.findOne('users', { id: userId });
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password strength
      const passwordValidation = this.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join('. '));
      }

      // Check if new password is different from current password
      const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
      if (isSamePassword) {
        throw new Error('New password must be different from current password');
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // Update password and reset any lockout status
      await DatabaseUtils.update('users', {
        password_hash: newPasswordHash,
        failed_login_attempts: 0,
        lockout_until: null
      }, { id: userId });

      return {
        success: true,
        message: 'Password changed successfully'
      };
    } catch (error) {
      console.error('Change password error:', error.message);
      throw new Error(error.message || 'Failed to change password');
    }
  }

  // Reset password request
  static async requestPasswordReset(email) {
    try {
      const user = await DatabaseUtils.findOne('users', { email: email.toLowerCase() });
      if (!user) {
        // Don't reveal if email exists or not
        return {
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.'
        };
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

      await DatabaseUtils.update('users', {
        password_reset_token: resetToken,
        password_reset_token_expires: resetTokenExpires
      }, { id: user.id });

      // Send reset email
      await EmailService.sendPasswordResetEmail(user.email, resetToken);

      return {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      };
    } catch (error) {
      console.error('Password reset request error:', error.message);
      throw new Error('Failed to process password reset request');
    }
  }

  // Reset password
  static async resetPassword(token, newPassword) {
    try {
      const user = await DatabaseUtils.findOne('users', { password_reset_token: token });
      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      if (new Date(user.password_reset_token_expires) < new Date()) {
        throw new Error('Reset token has expired');
      }

      // Validate new password strength
      const passwordValidation = this.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join('. '));
      }

      // Hash new password
      const passwordHash = await this.hashPassword(newPassword);

      // Update password and clear reset token, also reset failed login attempts
      await DatabaseUtils.update('users', {
        password_hash: passwordHash,
        password_reset_token: null,
        password_reset_token_expires: null,
        failed_login_attempts: 0,
        lockout_until: null
      }, { id: user.id });

      return {
        success: true,
        message: 'Password reset successfully'
      };
    } catch (error) {
      console.error('Password reset error:', error.message);
      throw new Error(error.message || 'Failed to reset password');
    }
  }
}

export default AuthService;
