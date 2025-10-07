import express from 'express';
import AuthService from '../services/authService.js';
import { 
  validateRegistration, 
  validateLogin, 
  validateProfileUpdate, 
  validatePasswordChange
} from '../utils/validation.js';
import { 
  authenticateToken, 
  authenticateSession, 
  redirectIfAuthenticated 
} from '../middleware/auth.js';

const router = express.Router();

// API Routes (JSON responses)

// POST /api/auth/register
router.post('/api/auth/register', async (req, res) => {
  try {
    const validation = validateRegistration(req.body);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    const result = await AuthService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/auth/login
router.post('/api/auth/login', async (req, res) => {
  try {
    const validation = validateLogin(req.body);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/auth/profile
router.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const result = await AuthService.getProfile(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// PUT /api/auth/profile
router.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const validation = validateProfileUpdate(req.body);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    const result = await AuthService.updateProfile(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/auth/change-password
router.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const validation = validatePasswordChange(req.body);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    const { currentPassword, newPassword } = req.body;
    const result = await AuthService.changePassword(req.user.id, currentPassword, newPassword);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/auth/logout
router.post('/api/auth/logout', (req, res) => {
  // For JWT, logout is handled client-side by removing the token
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Web Routes (HTML responses)

// GET /login
router.get('/login', redirectIfAuthenticated, (req, res) => {
  res.render('auth/login', { 
    title: 'Login - AfriGlam',
    error: null,
    errors: {},
    formData: {}
  });
});

// POST /login
router.post('/login', redirectIfAuthenticated, async (req, res) => {
  try {
    const validation = validateLogin(req.body);
    
    if (!validation.isValid) {
      return res.render('auth/login', {
        title: 'Login - AfriGlam',
        error: 'Please fix the errors below',
        errors: validation.errors,
        formData: req.body
      });
    }

    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    
    // Set session
    req.session.userId = result.user.id;
    req.session.userRole = result.user.role;
    
    // Redirect based on role
    if (result.user.role === 'admin') {
      res.redirect('/admin/dashboard');
    } else {
      res.redirect('/dashboard');
    }
  } catch (error) {
    res.render('auth/login', {
      title: 'Login - AfriGlam',
      error: error.message,
      errors: {},
      formData: req.body
    });
  }
});

// GET /register
router.get('/register', redirectIfAuthenticated, (req, res) => {
  res.render('auth/register', { 
    title: 'Register - AfriGlam',
    error: null,
    errors: {},
    formData: {}
  });
});

// POST /register
router.post('/register', redirectIfAuthenticated, async (req, res) => {
  try {
    const validation = validateRegistration(req.body);
    
    if (!validation.isValid) {
      return res.render('auth/register', {
        title: 'Register - AfriGlam',
        error: 'Please fix the errors below',
        errors: validation.errors,
        formData: req.body
      });
    }

    const result = await AuthService.register(req.body);
    
    // Set session
    req.session.userId = result.user.id;
    req.session.userRole = result.user.role;
    
    res.redirect('/dashboard');
  } catch (error) {
    res.render('auth/register', {
      title: 'Register - AfriGlam',
      error: error.message,
      errors: {},
      formData: req.body
    });
  }
});

// GET /logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
    }
    res.redirect('/');
  });
});

// GET /dashboard
router.get('/dashboard', authenticateSession, async (req, res) => {
  try {
    const result = await AuthService.getProfile(req.session.userId);
    res.render('dashboard/index', {
      title: 'Dashboard - AfriGlam',
      user: result.user
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.redirect('/login');
  }
});

export default router;