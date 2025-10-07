import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import DatabaseUtils from '../config/db-utils.js';

class AuthService {
  // Generate JWT token
  static generateToken(userId, email, role) {
    return jwt.sign(
      { userId, email, role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  // Hash password
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Compare password
  static async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
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

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Create user
      const newUser = await DatabaseUtils.insert('users', {
        email: email.toLowerCase(),
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        role: 'customer',
        is_active: true
      });

      // Remove password hash from response
      delete newUser.password_hash;

      // Generate token
      const token = this.generateToken(newUser.id, newUser.email, newUser.role);

      return {
        success: true,
        user: newUser,
        token,
        message: 'Registration successful'
      };
    } catch (error) {
      console.error('Registration error:', error.message);
      throw new Error(error.message || 'Registration failed');
    }
  }

  // Login user
  static async login(email, password) {
    try {
      // Find user by email
      const user = await DatabaseUtils.findOne('users', { 
        email: email.toLowerCase() 
      });

      if (!user) {
        throw new Error('Invalid email or password');
      }

      if (!user.is_active) {
        throw new Error('Account is deactivated. Please contact support.');
      }

      // Check password
      const isValidPassword = await this.comparePassword(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Remove password hash from response
      delete user.password_hash;

      // Generate token
      const token = this.generateToken(user.id, user.email, user.role);

      return {
        success: true,
        user,
        token,
        message: 'Login successful'
      };
    } catch (error) {
      console.error('Login error:', error.message);
      throw new Error(error.message || 'Login failed');
    }
  }

  // Get user profile
  static async getProfile(userId) {
    try {
      const user = await DatabaseUtils.findOne('users', { id: userId });
      
      if (!user) {
        throw new Error('User not found');
      }

      // Remove password hash
      delete user.password_hash;

      return {
        success: true,
        user,
        message: 'Profile retrieved successfully'
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

      const updatedUser = await DatabaseUtils.update('users', {
        first_name: firstName,
        last_name: lastName,
        phone: phone || null
      }, { id: userId });

      if (!updatedUser) {
        throw new Error('User not found');
      }

      // Remove password hash
      delete updatedUser.password_hash;

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
      // Get user with password hash
      const user = await DatabaseUtils.findOne('users', { id: userId });
      
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await this.comparePassword(currentPassword, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // Update password
      await DatabaseUtils.update('users', {
        password_hash: newPasswordHash
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

  // Deactivate user account
  static async deactivateAccount(userId) {
    try {
      const updatedUser = await DatabaseUtils.update('users', {
        is_active: false
      }, { id: userId });

      if (!updatedUser) {
        throw new Error('User not found');
      }

      return {
        success: true,
        message: 'Account deactivated successfully'
      };
    } catch (error) {
      console.error('Deactivate account error:', error.message);
      throw new Error(error.message || 'Failed to deactivate account');
    }
  }
}

export default AuthService;