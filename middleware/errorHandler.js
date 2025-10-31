// Global error handling middleware

export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

export const errorHandler = (error, req, res, next) => {
  const statusCode = error.status || 500;
  
  // Log error details
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Check if it's an API request
  const isApiRequest = req.originalUrl.startsWith('/api/');

  if (isApiRequest) {
    // Return JSON error for API requests
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  } else {
    // Render error page for web requests
    res.status(statusCode).render('error', {
      title: 'Error - AfriGlam',
      message: statusCode === 404 ? 'Page Not Found' : 'Something went wrong',
      error: {
        status: statusCode,
        message: statusCode === 404 ? 'Page Not Found' : 'Something went wrong',
        details: process.env.NODE_ENV === 'development' ? error.message : null
      },
      user: req.session?.userId ? { id: req.session.userId } : null
    });
  }
};

// Async error wrapper
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation error formatter
export const handleValidationError = (error) => {
  if (error.name === 'ValidationError') {
    const errors = {};
    Object.keys(error.errors).forEach(key => {
      errors[key] = error.errors[key].message;
    });
    return {
      success: false,
      message: 'Validation failed',
      errors
    };
  }
  return null;
};