import jwt from 'jsonwebtoken';
import DatabaseUtils from '../config/db-utils.js';

const getUserFromToken = async (token) => {
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await DatabaseUtils.findOne('users', { id: decoded.userId });
    if (user && user.is_active) {
      delete user.password_hash;
      return user;
    }
    return null;
  } catch (error) {
    // Check if token is expired
    if (error.name === 'TokenExpiredError') {
      return { expired: true };
    }
    return null;
  }
};

// Middleware to handle token refresh automatically
export const autoRefreshToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return next();

  const result = await getUserFromToken(token);
  
  if (result && result.expired) {
    // Try to refresh token using refresh token from cookies or header
    const refreshToken = req.cookies?.refreshToken || req.headers['x-refresh-token'];
    
    if (refreshToken) {
      try {
        const AuthService = (await import('../services/authService.js')).default;
        const refreshResult = await AuthService.refreshAccessToken(refreshToken);
        
        if (refreshResult.success) {
          // Set new token in response header
          res.setHeader('X-New-Token', refreshResult.accessToken);
          
          // Decode new token to get user
          const decoded = jwt.verify(refreshResult.accessToken, process.env.JWT_SECRET);
          const user = await DatabaseUtils.findOne('users', { id: decoded.userId });
          if (user && user.is_active) {
            delete user.password_hash;
            req.user = user;
          }
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError.message);
      }
    }
  }
  
  next();
};

const getUserFromSession = async (session) => {
  if (!session || !session.userId) return null;

  const user = await DatabaseUtils.findOne('users', { id: session.userId });
  if (user && user.is_active) {
    delete user.password_hash;
    return user;
  }
  return null;
};

// Middleware to verify JWT token
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  const user = await getUserFromToken(token);
  if (user) {
    req.user = user;
    return next();
  }

  return res.status(401).json({ 
    success: false, 
    message: 'Access token required or invalid' 
  });
};

// Middleware to check if user is admin
export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Admin access required' 
    });
  }
  next();
};

// Middleware for optional authentication (for pages that work with or without login)
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  const user = await getUserFromToken(token);
  if (user) {
    req.user = user;
  }
  
  next();
};

// Session-based authentication for web pages
export const authenticateSession = async (req, res, next) => {
  try {
    // Check session timeout
    if (req.session && req.session.userId) {
      const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
      const now = Date.now();
      
      if (!req.session.lastActivity) {
        req.session.lastActivity = now;
      }
      
      if (now - req.session.lastActivity > sessionTimeout) {
        req.session.destroy(() => {});
        const redirectUrl = req.originalUrl || req.url;
        return res.redirect(`/login?redirect=${encodeURIComponent(redirectUrl)}&message=Session expired`);
      }
      
      req.session.lastActivity = now;
    }

    const user = await getUserFromSession(req.session);
    if (user) {
      req.user = user;
      return next();
    }

    // Store the original URL to redirect back after login
    const redirectUrl = req.originalUrl || req.url;
    return res.redirect(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
  } catch (error) {
    console.error('Session authentication error:', error);
    const redirectUrl = req.originalUrl || req.url;
    return res.redirect(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
  }
};

// Regenerate session ID to prevent session fixation
export const regenerateSession = (req, res, next) => {
  if (req.session) {
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return next(err);
      }
      next();
    });
  } else {
    next();
  }
};

// Check if user is already logged in (redirect to dashboard or redirect URL)
export const redirectIfAuthenticated = async (req, res, next) => {
  try {
    if (req.session && req.session.userId) {
      // Verify the user still exists and is active
      const user = await getUserFromSession(req.session);
      if (user) {
        const redirectUrl = req.query.redirect;
        if (redirectUrl && redirectUrl.startsWith('/')) {
          return res.redirect(redirectUrl);
        }
        
        // Redirect based on user role
        if (user.role === 'admin') {
          return res.redirect('/admin/dashboard');
        } else {
          return res.redirect('/dashboard');
        }
      } else {
        // Clear invalid session
        req.session.destroy(() => {});
      }
    }
    next();
  } catch (error) {
    console.error('Redirect if authenticated error:', error);
    next();
  }
};

// Unified authentication for API routes (JWT or Session)
export const unifiedAuthenticate = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  let user = await getUserFromToken(token);

  if (!user) {
    user = await getUserFromSession(req.session);
  }

  if (user) {
    req.user = user;
    return next();
  }

  return res.status(401).json({
    success: false,
    message: 'Authentication required'
  });
};

// Session timeout middleware
export const checkSessionTimeout = (req, res, next) => {
  if (req.session && req.session.userId) {
    const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const now = Date.now();
    
    if (!req.session.lastActivity) {
      req.session.lastActivity = now;
    }
    
    if (now - req.session.lastActivity > sessionTimeout) {
      req.session.destroy(() => {});
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.'
      });
    }
    
    // Update last activity
    req.session.lastActivity = now;
  }
  
  next();
};

// Role-based authorization middleware factory
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${requiredRoles.join(', ')}`
      });
    }
    
    next();
  };
};

// Enhanced admin middleware with better error handling
export const requireAdminEnhanced = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // Additional check: verify user is still active and admin in database
    const user = await DatabaseUtils.findOne('users', { id: req.user.id });
    if (!user || !user.is_active || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access revoked or account deactivated'
      });
    }

    next();
  } catch (error) {
    console.error('Admin authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};