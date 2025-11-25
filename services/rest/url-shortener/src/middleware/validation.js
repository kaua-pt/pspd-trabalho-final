const Joi = require('joi');
const { ValidationError } = require('../utils/errors');

const validateShortenRequest = (req, res, next) => {
  const schema = Joi.object({
    url: Joi.string().uri().required().max(4096),
    customCode: Joi.string().pattern(/^[a-zA-Z0-9-_]{3,20}$/).optional(),
    expiresAt: Joi.date().iso().greater('now').optional(),
    userId: Joi.string().max(255).optional(),
    metadata: Joi.object().optional()
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return next(new ValidationError(`Validation failed: ${error.details[0].message}`));
  }

  req.body = value;
  next();
};

const validateBulkRequest = (req, res, next) => {
  const schema = Joi.object({
    urls: Joi.array()
      .items(Joi.string().uri().max(4096))
      .min(1)
      .max(100)
      .required(),
    userId: Joi.string().max(255).optional(),
    batchId: Joi.string().max(255).optional(),
    commonSettings: Joi.object({
      expiresAt: Joi.date().iso().greater('now').optional(),
      metadata: Joi.object().optional()
    }).optional()
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return next(new ValidationError(`Validation failed: ${error.details[0].message}`));
  }

  req.body = value;
  next();
};

const validateUpdateRequest = (req, res, next) => {
  const schema = Joi.object({
    originalUrl: Joi.string().uri().max(4096).optional(),
    expiresAt: Joi.date().iso().greater('now').optional(),
    isActive: Joi.boolean().optional(),
    metadata: Joi.object().optional()
  }).min(1);

  const { error, value } = schema.validate(req.body);
  if (error) {
    return next(new ValidationError(`Validation failed: ${error.details[0].message}`));
  }

  req.body = value;
  next();
};

module.exports = {
  validateShortenRequest,
  validateBulkRequest,
  validateUpdateRequest
};