import express from 'express';
import { validationResult } from 'express-validator';
import AuthService from '../services/authService.js';
import { 
  validateRegistration, 
  validateLogin, 
  validateProfileUpdate, 
  validatePasswordChange,
  validatePasswordReset,
  validatePasswordResetConfirm,
  handleValidationErrors
} from '../utils/validation.js';
import { 
  unifiedAuthenticate, 
  authenticateSession, 
  redirectIfAuthenticated,
  regenerateSession,
  checkSessionTimeout
} from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// API Routes (JSON responses)

// POST /api/auth/register
router.post('/api/auth/register', validateRegistration, handleValidationErrors, asyncHandler(async (req, res) => {
  const result = await AuthService.register(req.body);
  res.status(201).json(result);
}));

// POST /api/auth/login
router.post('/api/auth/login', validateLogin, handleValidationErrors, asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await AuthService.login(email, password);
  res.json(result);
}));

// POST /api/auth/refresh-token
router.post('/api/auth/refresh-token', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await AuthService.refreshAccessToken(refreshToken);
  res.json(result);
}));

// POST /api/auth/logout
router.post('/api/auth/logout', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  await AuthService.logout(refreshToken);
  res.json({ success: true, message: 'Logged out successfully' });
}));

// GET /api/auth/profile
router.get('/api/auth/profile', unifiedAuthenticate, asyncHandler(async (req, res) => {
  const result = await AuthService.getProfile(req.user.id);
  res.json(result);
}));

// PUT /api/auth/profile
router.put('/api/auth/profile', unifiedAuthenticate, validateProfileUpdate, handleValidationErrors, asyncHandler(async (req, res) => {
  const result = await AuthService.updateProfile(req.user.id, req.body);
  res.json(result);
}));

// POST /api/auth/change-password
router.post('/api/auth/change-password', unifiedAuthenticate, validatePasswordChange, handleValidationErrors, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await AuthService.changePassword(req.user.id, currentPassword, newPassword);
  res.json(result);
}));

// POST /api/auth/forgot-password
router.post('/api/auth/forgot-password', validatePasswordReset, handleValidationErrors, asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await AuthService.requestPasswordReset(email);
  res.json(result);
}));

// POST /api/auth/reset-password
router.post('/api/auth/reset-password', validatePasswordResetConfirm, handleValidationErrors, asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  const result = await AuthService.resetPassword(token, newPassword);
  res.json(result);
}));

// Web Routes (HTML responses)

// GET /login
router.get('/login', redirectIfAuthenticated, (req, res) => {
  const redirectUrl = req.query.redirect || '';
  res.render('auth/login', { 
    title: 'Login - AfriGlam',
    error: null,
    errors: {},
    formData: {},
    redirectUrl
  });
});

// POST /login
router.post('/login', redirectIfAuthenticated, validateLogin, regenerateSession, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/login', {
      title: 'Login - AfriGlam',
      error: 'Please fix the errors below',
      errors: errors.mapped(),
      formData: req.body
    });
  }

  const { email, password } = req.body;
  const result = await AuthService.login(email, password);
  
  // Set session with security measures
  req.session.userId = result.user.id;
  req.session.userRole = result.user.role;
  req.session.lastActivity = Date.now();
  req.session.loginTime = Date.now();
  
  // Check for redirect URL
  const redirectUrl = req.body.redirectUrl || req.query.redirect;
  
  if (redirectUrl && redirectUrl.startsWith('/')) {
    // Redirect back to the original page
    res.redirect(redirectUrl);
  } else {
    // Default redirect based on role
    if (result.user.role === 'admin') {
      res.redirect('/admin/dashboard');
    } else {
      res.redirect('/dashboard');
    }
  }
}));

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
router.post('/register', redirectIfAuthenticated, validateRegistration, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/register', {
      title: 'Register - AfriGlam',
      error: 'Please fix the errors below',
      errors: errors.mapped(),
      formData: req.body
    });
  }

  const result = await AuthService.register(req.body);
  
  res.render('auth/login', {
    title: 'Login - AfriGlam',
    error: null,
    errors: {},
    formData: {},
    success: result.message,
  });
}));

// GET /verify-email
router.get('/verify-email', asyncHandler(async (req, res) => {
  const { token } = req.query;
  const result = await AuthService.verifyEmail(token);
  // Redirect to login page with a success message
  res.redirect('/login?success=' + encodeURIComponent(result.message));
}));

// GET /logout
router.get('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Session destroy error:', err);
      return next(err);
    }
    console.log('✅ User logged out successfully');
    res.redirect('/?message=You have been logged out successfully');
  });
});

// GET /dashboard
router.get('/dashboard', authenticateSession, asyncHandler(async (req, res) => {
  const result = await AuthService.getProfile(req.session.userId);
  res.render('dashboard/index', {
    title: 'Dashboard - AfriGlam',
    user: result.user
  });
}));

export default router;