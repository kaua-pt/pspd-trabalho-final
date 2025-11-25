/**
 * QR Code format enumeration (equivalent to gRPC enum)
 */
const QRFormat = {
  PNG: 0,
  SVG: 1,
  PDF: 2,
  JPEG: 3
};

/**
 * Error correction level enumeration (equivalent to gRPC enum)
 */
const ErrorCorrectionLevel = {
  LOW: 0,      // ~7% correction
  MEDIUM: 1,   // ~15% correction
  QUARTILE: 2, // ~25% correction
  HIGH: 3      // ~30% correction
};

/**
 * QR Request model (equivalent to gRPC GenerateQRRequest)
 */
class GenerateQRRequest {
  constructor({
    data,
    format = QRFormat.PNG,
    size = 256,
    errorCorrection = ErrorCorrectionLevel.MEDIUM,
    userId,
    metadata = {}
  }) {
    this.data = data;
    this.format = format;
    this.size = size;
    this.errorCorrection = errorCorrection;
    this.userId = userId;
    this.metadata = metadata;
  }

  validate() {
    const errors = [];

    if (!this.data || typeof this.data !== 'string') {
      errors.push('Data is required and must be a string');
    }

    if (this.data && this.data.length > 4096) {
      errors.push('Data cannot exceed 4096 characters');
    }

    if (!Object.values(QRFormat).includes(this.format)) {
      errors.push('Invalid format specified');
    }

    if (this.size < 64 || this.size > 2048) {
      errors.push('Size must be between 64 and 2048 pixels');
    }

    if (!Object.values(ErrorCorrectionLevel).includes(this.errorCorrection)) {
      errors.push('Invalid error correction level specified');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * QR Response model (equivalent to gRPC GenerateQRResponse)
 */
class GenerateQRResponse {
  constructor({
    qrId,
    qrImage,
    format,
    size,
    createdAt,
    downloadUrl
  }) {
    this.qrId = qrId;
    this.qrImage = qrImage;
    this.format = format;
    this.size = size;
    this.createdAt = createdAt;
    this.downloadUrl = downloadUrl;
  }
}

/**
 * Batch QR Request model (equivalent to gRPC QRBatchRequest)
 */
class QRBatchRequest {
  constructor({
    dataItems,
    format = QRFormat.PNG,
    size = 256,
    errorCorrection = ErrorCorrectionLevel.MEDIUM,
    userId,
    batchId
  }) {
    this.dataItems = dataItems;
    this.format = format;
    this.size = size;
    this.errorCorrection = errorCorrection;
    this.userId = userId;
    this.batchId = batchId;
  }

  validate() {
    const errors = [];

    if (!this.dataItems || !Array.isArray(this.dataItems)) {
      errors.push('dataItems must be an array');
    } else {
      if (this.dataItems.length === 0) {
        errors.push('dataItems cannot be empty');
      }

      if (this.dataItems.length > 100) {
        errors.push('Batch size cannot exceed 100 items');
      }

      // Validate each item
      this.dataItems.forEach((item, index) => {
        if (!item || typeof item !== 'string') {
          errors.push(`Item at index ${index} must be a non-empty string`);
        } else if (item.length > 4096) {
          errors.push(`Item at index ${index} exceeds 4096 character limit`);
        }
      });
    }

    if (!Object.values(QRFormat).includes(this.format)) {
      errors.push('Invalid format specified');
    }

    if (this.size < 64 || this.size > 2048) {
      errors.push('Size must be between 64 and 2048 pixels');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Upload metadata model (equivalent to gRPC UploadMetadata)
 */
class UploadMetadata {
  constructor({
    filename,
    contentType,
    fileSize,
    outputFormat = QRFormat.PNG,
    userId
  }) {
    this.filename = filename;
    this.contentType = contentType;
    this.fileSize = fileSize;
    this.outputFormat = outputFormat;
    this.userId = userId;
  }

  validate() {
    const errors = [];

    if (!this.filename || typeof this.filename !== 'string') {
      errors.push('Filename is required');
    }

    if (!this.contentType || typeof this.contentType !== 'string') {
      errors.push('Content type is required');
    }

    const allowedTypes = ['text/plain', 'application/json', 'text/csv'];
    if (!allowedTypes.includes(this.contentType)) {
      errors.push('Unsupported file type. Allowed types: text/plain, application/json, text/csv');
    }

    if (!this.fileSize || this.fileSize <= 0) {
      errors.push('File size must be greater than 0');
    }

    if (this.fileSize > 10 * 1024 * 1024) { // 10MB
      errors.push('File size cannot exceed 10MB');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Pagination model (equivalent to gRPC PaginationRequest)
 */
class PaginationRequest {
  constructor({
    page = 1,
    size = 10,
    sortBy = 'createdAt',
    ascending = false
  }) {
    this.page = Math.max(1, parseInt(page));
    this.size = Math.min(100, Math.max(1, parseInt(size)));
    this.sortBy = sortBy;
    this.ascending = ascending;
  }

  validate() {
    const errors = [];
    const allowedSortFields = ['createdAt', 'data', 'format', 'size'];

    if (!allowedSortFields.includes(this.sortBy)) {
      errors.push(`sortBy must be one of: ${allowedSortFields.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Live editor session model (equivalent to gRPC LiveQREditorRequest)
 */
class LiveEditorSession {
  constructor({
    sessionId,
    userId,
    initialData = '',
    currentFormat = QRFormat.PNG,
    currentSize = 256
  }) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.initialData = initialData;
    this.currentFormat = currentFormat;
    this.currentSize = currentSize;
    this.createdAt = new Date().toISOString();
    this.lastActivity = new Date().toISOString();
  }

  updateActivity() {
    this.lastActivity = new Date().toISOString();
  }

  isExpired(timeoutMinutes = 30) {
    const lastActivity = new Date(this.lastActivity);
    const now = new Date();
    const diffMinutes = (now - lastActivity) / (1000 * 60);
    return diffMinutes > timeoutMinutes;
  }
}

module.exports = {
  QRFormat,
  ErrorCorrectionLevel,
  GenerateQRRequest,
  GenerateQRResponse,
  QRBatchRequest,
  UploadMetadata,
  PaginationRequest,
  LiveEditorSession
};