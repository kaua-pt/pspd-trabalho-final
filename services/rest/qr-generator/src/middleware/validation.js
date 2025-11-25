const Joi = require('joi');
const { QRFormat, ErrorCorrectionLevel } = require('../models/qrModels');

/**
 * Validation schemas using Joi
 */
const schemas = {
  generateQR: Joi.object({
    data: Joi.string().required().max(4096).messages({
      'string.empty': 'Data is required',
      'string.max': 'Data cannot exceed 4096 characters'
    }),
    format: Joi.string().valid('PNG', 'SVG', 'PDF', 'JPEG').default('PNG'),
    size: Joi.number().integer().min(64).max(2048).default(256),
    errorCorrection: Joi.string().valid('LOW', 'MEDIUM', 'QUARTILE', 'HIGH').default('MEDIUM'),
    userId: Joi.string().optional(),
    metadata: Joi.object().optional()
  }),

  batchQR: Joi.object({
    dataItems: Joi.array()
      .items(Joi.string().required().max(4096))
      .min(1)
      .max(100)
      .required()
      .messages({
        'array.min': 'At least one data item is required',
        'array.max': 'Batch cannot exceed 100 items'
      }),
    format: Joi.string().valid('PNG', 'SVG', 'PDF', 'JPEG').default('PNG'),
    size: Joi.number().integer().min(64).max(2048).default(256),
    errorCorrection: Joi.string().valid('LOW', 'MEDIUM', 'QUARTILE', 'HIGH').default('MEDIUM'),
    userId: Joi.string().optional(),
    batchId: Joi.string().optional()
  }),

  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    size: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().valid('createdAt', 'data', 'format', 'size').default('createdAt'),
    ascending: Joi.boolean().default(false),
    userId: Joi.string().optional(),
    format: Joi.string().valid('PNG', 'SVG', 'PDF', 'JPEG').optional(),
    search: Joi.string().optional()
  }),

  deleteQR: Joi.object({
    userId: Joi.string().optional()
  })
};

/**
 * Generic validation middleware factory
 */
function createValidationMiddleware(schema, source = 'body') {
  return (req, res, next) => {
    const data = source === 'query' ? req.query : req.body;

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    // Replace original data with validated and sanitized data
    if (source === 'query') {
      req.query = value;
    } else {
      req.body = value;
    }

    next();
  };
}

/**
 * Specific validation middlewares
 */
const validateQRRequest = createValidationMiddleware(schemas.generateQR);
const validateBatchRequest = createValidationMiddleware(schemas.batchQR);
const validatePagination = createValidationMiddleware(schemas.pagination, 'query');
const validateDeleteRequest = createValidationMiddleware(schemas.deleteQR);

/**
 * File upload validation middleware
 */
function validateFileUpload(req, res, next) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded',
      details: 'File is required for upload processing'
    });
  }

  const allowedTypes = ['text/plain', 'application/json', 'text/csv'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type',
      details: `Allowed types: ${allowedTypes.join(', ')}`
    });
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (req.file.size > maxSize) {
    return res.status(400).json({
      success: false,
      error: 'File too large',
      details: 'Maximum file size is 10MB'
    });
  }

  // Validate request body
  const bodySchema = Joi.object({
    outputFormat: Joi.string().valid('PNG', 'SVG', 'PDF', 'JPEG').default('PNG'),
    userId: Joi.string().optional()
  });

  const { error, value } = bodySchema.validate(req.body, {
    stripUnknown: true,
    convert: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      error: 'Request validation failed',
      details: errors
    });
  }

  req.body = value;
  next();
}

/**
 * Parameter validation for route parameters
 */
function validateQRId(req, res, next) {
  const { id } = req.params;

  const schema = Joi.string().uuid().required();
  const { error } = schema.validate(id);

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid QR ID',
      details: 'QR ID must be a valid UUID'
    });
  }

  next();
}

/**
 * WebSocket message validation
 */
function validateWebSocketMessage(message) {
  const messageSchema = Joi.object({
    type: Joi.string().valid('init', 'update', 'format_change', 'save').required(),
    sessionId: Joi.string().required(),
    userId: Joi.string().optional(),
    data: Joi.string().optional(),
    initialData: Joi.string().when('type', { is: 'init', then: Joi.required() }),
    format: Joi.string().valid('PNG', 'SVG', 'PDF', 'JPEG').optional(),
    size: Joi.number().integer().min(64).max(2048).optional(),
    name: Joi.string().when('type', { is: 'save', then: Joi.required() })
  });

  return messageSchema.validate(message);
}

/**
 * Request rate limiting validation
 */
function validateRateLimit(req, res, next) {
  // Add custom rate limiting logic here if needed
  // For now, just pass through
  next();
}

module.exports = {
  validateQRRequest,
  validateBatchRequest,
  validatePagination,
  validateDeleteRequest,
  validateFileUpload,
  validateQRId,
  validateWebSocketMessage,
  validateRateLimit,
  schemas
};