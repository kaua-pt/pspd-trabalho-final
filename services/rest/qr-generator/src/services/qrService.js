const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { QRFormat, ErrorCorrectionLevel } = require('../models/qrModels');
const { AppError } = require('../utils/errors');

// In-memory storage for demo purposes - replace with actual database
const qrStorage = new Map();

class QRService {
  constructor() {
    this.storage = qrStorage;
  }

  /**
   * Generate a single QR code
   */
  async generateSingleQR(params) {
    const { data, format, size, errorCorrection, userId, metadata } = params;

    try {
      const qrId = uuidv4();
      const timestamp = new Date().toISOString();

      // Configure QR code options
      const qrOptions = {
        width: size || 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: this.mapErrorCorrectionLevel(errorCorrection)
      };

      // Generate QR code in requested format
      let qrImage;
      let mimeType;

      switch (format) {
        case QRFormat.PNG:
          qrImage = await QRCode.toBuffer(data, { ...qrOptions, type: 'png' });
          mimeType = 'image/png';
          break;
        case QRFormat.SVG:
          qrImage = await QRCode.toString(data, { ...qrOptions, type: 'svg' });
          mimeType = 'image/svg+xml';
          break;
        case QRFormat.JPEG:
          // Convert to JPEG via canvas (QRCode doesn't support JPEG directly)
          const pngBuffer = await QRCode.toBuffer(data, { ...qrOptions, type: 'png' });
          qrImage = pngBuffer; // In production, convert PNG to JPEG
          mimeType = 'image/jpeg';
          break;
        case QRFormat.PDF:
          // Generate PDF with QR code (simplified implementation)
          qrImage = await QRCode.toBuffer(data, { ...qrOptions, type: 'png' });
          mimeType = 'application/pdf';
          break;
        default:
          qrImage = await QRCode.toBuffer(data, { ...qrOptions, type: 'png' });
          mimeType = 'image/png';
      }

      // Store QR code data
      const qrData = {
        qrId,
        data,
        format: Object.keys(QRFormat)[format],
        size: size || 256,
        qrImage: Buffer.isBuffer(qrImage) ? qrImage.toString('base64') : Buffer.from(qrImage).toString('base64'),
        mimeType,
        createdAt: timestamp,
        userId,
        metadata: metadata || {},
        downloadUrl: `/api/v1/qr/${qrId}/download`
      };

      this.storage.set(qrId, qrData);

      return {
        qrId,
        qrImage: qrData.qrImage,
        format: qrData.format,
        size: qrData.size,
        createdAt: timestamp,
        downloadUrl: qrData.downloadUrl
      };
    } catch (error) {
      throw new AppError(`Failed to generate QR code: ${error.message}`, 500);
    }
  }

  /**
   * Generate multiple QR codes in batch
   */
  async generateQRBatch(params) {
    const { dataItems, format, size, errorCorrection, userId, batchId } = params;

    const batchResults = {
      batchId,
      results: [],
      totalProcessed: dataItems.length,
      successful: 0,
      failed: 0,
      processedAt: new Date().toISOString()
    };

    for (const [index, item] of dataItems.entries()) {
      try {
        const qrResult = await this.generateSingleQR({
          data: item,
          format,
          size,
          errorCorrection,
          userId,
          metadata: { batchId, batchIndex: index }
        });

        batchResults.results.push({
          originalData: item,
          qrId: qrResult.qrId,
          shortUrl: `/api/v1/qr/${qrResult.qrId}`,
          success: true,
          progress: Math.round(((index + 1) / dataItems.length) * 100)
        });

        batchResults.successful++;
      } catch (error) {
        batchResults.results.push({
          originalData: item,
          success: false,
          error: {
            code: error.statusCode || 500,
            message: error.message,
            details: 'QR generation failed'
          }
        });

        batchResults.failed++;
      }
    }

    return batchResults;
  }

  /**
   * Process uploaded data for QR generation
   */
  async processUploadedData(params) {
    const { filename, contentType, fileSize, outputFormat, userId, dataItems } = params;

    const uploadResult = {
      qrIds: [],
      totalProcessed: dataItems.length,
      successful: 0,
      failed: 0,
      errors: [],
      processedAt: new Date().toISOString()
    };

    for (const item of dataItems) {
      try {
        const qrResult = await this.generateSingleQR({
          data: item,
          format: outputFormat,
          userId,
          metadata: {
            source: 'upload',
            filename,
            contentType,
            fileSize
          }
        });

        uploadResult.qrIds.push(qrResult.qrId);
        uploadResult.successful++;
      } catch (error) {
        uploadResult.errors.push({
          data: item,
          error: error.message
        });
        uploadResult.failed++;
      }
    }

    return uploadResult;
  }

  /**
   * Get QR code by ID
   */
  async getQRById(qrId, userId) {
    const qrData = this.storage.get(qrId);

    if (!qrData) {
      return null;
    }

    // Check user access (if userId is provided)
    if (userId && qrData.userId && qrData.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    return {
      qrId: qrData.qrId,
      data: qrData.data,
      format: qrData.format,
      size: qrData.size,
      qrImage: qrData.qrImage,
      downloadUrl: qrData.downloadUrl,
      createdAt: qrData.createdAt,
      updatedAt: qrData.updatedAt,
      metadata: qrData.metadata
    };
  }

  /**
   * Delete QR code
   */
  async deleteQR(qrId, userId) {
    const qrData = this.storage.get(qrId);

    if (!qrData) {
      return { success: false, message: 'QR code not found' };
    }

    // Check user access (if userId is provided)
    if (userId && qrData.userId && qrData.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    this.storage.delete(qrId);

    return {
      success: true,
      message: 'QR code deleted successfully',
      deletedAt: new Date().toISOString()
    };
  }

  /**
   * List QR codes with pagination and filtering
   */
  async listQRCodes(params) {
    const { userId, pagination, filters } = params;

    // Convert storage to array and filter
    let qrCodes = Array.from(this.storage.values());

    // Filter by user if specified
    if (userId) {
      qrCodes = qrCodes.filter(qr => qr.userId === userId);
    }

    // Filter by format if specified
    if (filters?.format) {
      qrCodes = qrCodes.filter(qr => qr.format.toLowerCase() === filters.format.toLowerCase());
    }

    // Filter by search term if specified
    if (filters?.search) {
      qrCodes = qrCodes.filter(qr =>
        qr.data.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Sort
    qrCodes.sort((a, b) => {
      const aValue = a[pagination.sortBy];
      const bValue = b[pagination.sortBy];

      if (pagination.ascending) {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Pagination
    const startIndex = (pagination.page - 1) * pagination.size;
    const endIndex = startIndex + pagination.size;
    const paginatedQRs = qrCodes.slice(startIndex, endIndex);

    const totalItems = qrCodes.length;
    const totalPages = Math.ceil(totalItems / pagination.size);

    return {
      qrCodes: paginatedQRs.map(qr => ({
        qrId: qr.qrId,
        data: qr.data,
        format: qr.format,
        size: qr.size,
        createdAt: qr.createdAt,
        downloadUrl: qr.downloadUrl,
        metadata: qr.metadata
      })),
      pagination: {
        page: pagination.page,
        size: pagination.size,
        totalItems,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrevious: pagination.page > 1
      }
    };
  }

  /**
   * Map error correction levels
   */
  mapErrorCorrectionLevel(level) {
    const mapping = {
      [ErrorCorrectionLevel.LOW]: 'L',
      [ErrorCorrectionLevel.MEDIUM]: 'M',
      [ErrorCorrectionLevel.QUARTILE]: 'Q',
      [ErrorCorrectionLevel.HIGH]: 'H'
    };

    return mapping[level] || 'M';
  }

  /**
   * Get service statistics
   */
  getStats() {
    const qrCodes = Array.from(this.storage.values());

    const stats = {
      totalQRCodes: qrCodes.length,
      formatDistribution: {},
      averageSize: 0,
      oldestQR: null,
      newestQR: null
    };

    if (qrCodes.length > 0) {
      // Format distribution
      qrCodes.forEach(qr => {
        stats.formatDistribution[qr.format] = (stats.formatDistribution[qr.format] || 0) + 1;
      });

      // Average size
      stats.averageSize = qrCodes.reduce((sum, qr) => sum + qr.size, 0) / qrCodes.length;

      // Oldest and newest
      const sortedByDate = qrCodes.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      stats.oldestQR = sortedByDate[0]?.createdAt;
      stats.newestQR = sortedByDate[sortedByDate.length - 1]?.createdAt;
    }

    return stats;
  }
}

module.exports = new QRService();