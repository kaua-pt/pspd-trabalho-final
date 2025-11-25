const { AppError } = require('../utils/errors');

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  // Log error details
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Default error response
  let error = {
    success: false,
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  };

  // Handle different error types
  if (err instanceof AppError) {
    // Custom application errors
    error = {
      success: false,
      error: err.name,
      message: err.message,
      statusCode: err.statusCode,
      timestamp: new Date().toISOString()
    };

    if (err.details) {
      error.details = err.details;
    }

    return res.status(err.statusCode).json(error);
  }

  // Validation errors (Joi)
  if (err.name === 'ValidationError') {
    error = {
      success: false,
      error: 'Validation Error',
      message: 'Request validation failed',
      details: err.details,
      timestamp: new Date().toISOString()
    };

    return res.status(400).json(error);
  }

  // Multer errors (file upload)
  if (err.name === 'MulterError') {
    error = {
      success: false,
      error: 'File Upload Error',
      message: getMulterErrorMessage(err),
      timestamp: new Date().toISOString()
    };

    return res.status(400).json(error);
  }

  // JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = {
      success: false,
      error: 'Invalid JSON',
      message: 'Request body contains invalid JSON',
      timestamp: new Date().toISOString()
    };

    return res.status(400).json(error);
  }

  // Rate limiting errors
  if (err.name === 'TooManyRequests') {
    error = {
      success: false,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: err.retryAfter,
      timestamp: new Date().toISOString()
    };

    return res.status(429).json(error);
  }

  // QR Code generation errors
  if (err.message && err.message.includes('QR')) {
    error = {
      success: false,
      error: 'QR Generation Error',
      message: err.message,
      timestamp: new Date().toISOString()
    };

    return res.status(422).json(error);
  }

  // Database errors (when implemented)
  if (err.name === 'SequelizeError' || err.name === 'MongoError') {
    error = {
      success: false,
      error: 'Database Error',
      message: 'A database error occurred',
      timestamp: new Date().toISOString()
    };

    // Don't expose database details in production
    if (process.env.NODE_ENV !== 'production') {
      error.details = err.message;
    }

    return res.status(500).json(error);
  }

  // CORS errors
  if (err.message && err.message.includes('CORS')) {
    error = {
      success: false,
      error: 'CORS Error',
      message: 'Cross-origin request blocked',
      timestamp: new Date().toISOString()
    };

    return res.status(403).json(error);
  }

  // Generic server errors
  const statusCode = err.statusCode || err.status || 500;

  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production') {
    error.message = statusCode >= 500 ? 'Internal server error' : err.message;
  } else {
    error.message = err.message;
    error.stack = err.stack;
  }

  res.status(statusCode).json(error);
}

/**
 * Get user-friendly error message for Multer errors
 */
function getMulterErrorMessage(err) {
  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      return 'File size too large. Maximum size is 10MB.';
    case 'LIMIT_FILE_COUNT':
      return 'Too many files. Only one file is allowed.';
    case 'LIMIT_UNEXPECTED_FILE':
      return 'Unexpected file field. Use "file" as the field name.';
    case 'LIMIT_FIELD_KEY':
      return 'Field name too long.';
    case 'LIMIT_FIELD_VALUE':
      return 'Field value too long.';
    case 'LIMIT_FIELD_COUNT':
      return 'Too many fields.';
    case 'LIMIT_PART_COUNT':
      return 'Too many parts in multipart data.';
    default:
      return 'File upload error occurred.';
  }
}

/**
 * Not found handler (404)
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'POST /api/v1/qr/generate',
      'POST /api/v1/qr/batch',
      'POST /api/v1/qr/upload',
      'GET /api/v1/qr/:id',
      'DELETE /api/v1/qr/:id',
      'GET /api/v1/qr',
      'GET /health'
    ],
    timestamp: new Date().toISOString()
  });
}

/**
 * Async error wrapper to catch async/await errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Graceful shutdown error handler
 */
function handleShutdownError(err) {
  console.error('Shutdown error:', err);
  process.exit(1);
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  handleShutdownError
};