/**
 * Custom application error class
 * Equivalent to gRPC error responses with structured error handling
 */
class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);

    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert to gRPC-like error response format
   */
  toGRPCFormat() {
    return {
      code: this.statusCode,
      message: this.message,
      details: this.details || 'Error occurred in QR Generator service',
      timestamp: this.timestamp
    };
  }

  /**
   * Convert to JSON response format
   */
  toJSON() {
    return {
      success: false,
      error: this.name,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

/**
 * Validation error class
 */
class ValidationError extends AppError {
  constructor(message, validationErrors = []) {
    super(message, 400);
    this.name = 'ValidationError';
    this.validationErrors = validationErrors;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      validationErrors: this.validationErrors
    };
  }
}

/**
 * Not found error class
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Forbidden error class
 */
class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * Rate limit error class
 */
class RateLimitError extends AppError {
  constructor(retryAfter = 60) {
    super('Rate limit exceeded', 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter
    };
  }
}

/**
 * QR generation specific errors
 */
class QRGenerationError extends AppError {
  constructor(message, qrData = null) {
    super(`QR Generation failed: ${message}`, 422);
    this.name = 'QRGenerationError';
    this.qrData = qrData;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      qrData: this.qrData
    };
  }
}

/**
 * File upload specific errors
 */
class FileUploadError extends AppError {
  constructor(message, fileInfo = null) {
    super(`File upload failed: ${message}`, 400);
    this.name = 'FileUploadError';
    this.fileInfo = fileInfo;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      fileInfo: this.fileInfo
    };
  }
}

/**
 * Service unavailable error
 */
class ServiceUnavailableError extends AppError {
  constructor(service = 'Service') {
    super(`${service} is temporarily unavailable`, 503);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Error factory for creating consistent errors
 */
class ErrorFactory {
  static createValidationError(field, message) {
    return new ValidationError(`Validation failed for ${field}`, [
      { field, message }
    ]);
  }

  static createQRError(message, data = null) {
    return new QRGenerationError(message, data);
  }

  static createNotFoundError(resource = 'QR Code') {
    return new NotFoundError(resource);
  }

  static createForbiddenError(action = 'perform this action') {
    return new ForbiddenError(`You do not have permission to ${action}`);
  }

  static createRateLimitError(retryAfter = 60, operation = 'this operation') {
    const error = new RateLimitError(retryAfter);
    error.message = `Rate limit exceeded for ${operation}. Try again in ${retryAfter} seconds.`;
    return error;
  }

  static createFileUploadError(reason, fileInfo = null) {
    return new FileUploadError(reason, fileInfo);
  }

  static createServiceError(message, statusCode = 500) {
    return new AppError(message, statusCode);
  }
}

/**
 * HTTP status code constants
 */
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
};

/**
 * gRPC status code mapping (for compatibility)
 */
const GRPC_STATUS = {
  OK: 0,
  CANCELLED: 1,
  UNKNOWN: 2,
  INVALID_ARGUMENT: 3,
  DEADLINE_EXCEEDED: 4,
  NOT_FOUND: 5,
  ALREADY_EXISTS: 6,
  PERMISSION_DENIED: 7,
  RESOURCE_EXHAUSTED: 8,
  FAILED_PRECONDITION: 9,
  ABORTED: 10,
  OUT_OF_RANGE: 11,
  UNIMPLEMENTED: 12,
  INTERNAL: 13,
  UNAVAILABLE: 14,
  DATA_LOSS: 15,
  UNAUTHENTICATED: 16
};

/**
 * Map HTTP status codes to gRPC status codes
 */
function httpToGrpcStatus(httpStatus) {
  const mapping = {
    [HTTP_STATUS.OK]: GRPC_STATUS.OK,
    [HTTP_STATUS.BAD_REQUEST]: GRPC_STATUS.INVALID_ARGUMENT,
    [HTTP_STATUS.UNAUTHORIZED]: GRPC_STATUS.UNAUTHENTICATED,
    [HTTP_STATUS.FORBIDDEN]: GRPC_STATUS.PERMISSION_DENIED,
    [HTTP_STATUS.NOT_FOUND]: GRPC_STATUS.NOT_FOUND,
    [HTTP_STATUS.CONFLICT]: GRPC_STATUS.ALREADY_EXISTS,
    [HTTP_STATUS.UNPROCESSABLE_ENTITY]: GRPC_STATUS.INVALID_ARGUMENT,
    [HTTP_STATUS.TOO_MANY_REQUESTS]: GRPC_STATUS.RESOURCE_EXHAUSTED,
    [HTTP_STATUS.INTERNAL_SERVER_ERROR]: GRPC_STATUS.INTERNAL,
    [HTTP_STATUS.SERVICE_UNAVAILABLE]: GRPC_STATUS.UNAVAILABLE
  };

  return mapping[httpStatus] || GRPC_STATUS.UNKNOWN;
}

/**
 * Check if error is operational (expected) vs programming error
 */
function isOperationalError(error) {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  RateLimitError,
  QRGenerationError,
  FileUploadError,
  ServiceUnavailableError,
  ErrorFactory,
  HTTP_STATUS,
  GRPC_STATUS,
  httpToGrpcStatus,
  isOperationalError
};