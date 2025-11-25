const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const qrService = require('../services/qrService');
const { QRFormat, ErrorCorrectionLevel } = require('../models/qrModels');
const { AppError } = require('../utils/errors');

class QRController {
  /**
   * Generate a single QR code (equivalent to gRPC GenerateQR)
   */
  async generateQR(req, res, next) {
    try {
      const { data, format = 'PNG', size = 256, errorCorrection = 'MEDIUM', userId, metadata } = req.body;

      const qrResult = await qrService.generateSingleQR({
        data,
        format: QRFormat[format.toUpperCase()],
        size,
        errorCorrection: ErrorCorrectionLevel[errorCorrection.toUpperCase()],
        userId,
        metadata
      });

      res.status(201).json({
        success: true,
        data: qrResult,
        message: 'QR code generated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate multiple QR codes in batch (equivalent to gRPC GenerateQRBatch)
   */
  async generateQRBatch(req, res, next) {
    try {
      const { dataItems, format = 'PNG', size = 256, errorCorrection = 'MEDIUM', userId, batchId } = req.body;

      if (!dataItems || !Array.isArray(dataItems)) {
        throw new AppError('dataItems must be an array', 400);
      }

      // For REST, we'll simulate the streaming behavior with a single response containing all results
      const batchResult = await qrService.generateQRBatch({
        dataItems,
        format: QRFormat[format.toUpperCase()],
        size,
        errorCorrection: ErrorCorrectionLevel[errorCorrection.toUpperCase()],
        userId,
        batchId: batchId || uuidv4()
      });

      res.status(201).json({
        success: true,
        data: batchResult,
        message: `Batch of ${dataItems.length} QR codes generated successfully`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload data for QR processing (equivalent to gRPC UploadQRData)
   */
  async uploadQRData(req, res, next) {
    try {
      if (!req.file) {
        throw new AppError('No file uploaded', 400);
      }

      const { outputFormat = 'PNG', userId } = req.body;
      const fileContent = req.file.buffer.toString('utf-8');

      // Parse file content based on type
      let dataItems;
      if (req.file.mimetype === 'application/json') {
        dataItems = JSON.parse(fileContent);
      } else if (req.file.mimetype === 'text/csv') {
        dataItems = fileContent.split('\n').filter(line => line.trim());
      } else {
        dataItems = fileContent.split('\n').filter(line => line.trim());
      }

      const uploadResult = await qrService.processUploadedData({
        filename: req.file.originalname,
        contentType: req.file.mimetype,
        fileSize: req.file.size,
        outputFormat: QRFormat[outputFormat.toUpperCase()],
        userId,
        dataItems
      });

      res.status(201).json({
        success: true,
        data: uploadResult,
        message: 'File processed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get QR code by ID (equivalent to gRPC GetQR)
   */
  async getQR(req, res, next) {
    try {
      const { id } = req.params;
      const { userId } = req.query;

      const qrData = await qrService.getQRById(id, userId);

      if (!qrData) {
        throw new AppError('QR code not found', 404);
      }

      res.status(200).json({
        success: true,
        data: qrData,
        message: 'QR code retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete QR code by ID (equivalent to gRPC DeleteQR)
   */
  async deleteQR(req, res, next) {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      const deleteResult = await qrService.deleteQR(id, userId);

      if (!deleteResult.success) {
        throw new AppError('QR code not found or already deleted', 404);
      }

      res.status(200).json({
        success: true,
        data: deleteResult,
        message: 'QR code deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List QR codes with pagination
   */
  async listQRCodes(req, res, next) {
    try {
      const {
        userId,
        page = 1,
        size = 10,
        sortBy = 'createdAt',
        ascending = false,
        format,
        search
      } = req.query;

      const listResult = await qrService.listQRCodes({
        userId,
        pagination: {
          page: parseInt(page),
          size: parseInt(size),
          sortBy,
          ascending: ascending === 'true'
        },
        filters: {
          format,
          search
        }
      });

      res.status(200).json({
        success: true,
        data: listResult.qrCodes,
        pagination: listResult.pagination,
        message: 'QR codes retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Live QR editor WebSocket handler (equivalent to gRPC LiveQREditor bidirectional streaming)
   * Note: This would need WebSocket support in Express for full implementation
   */
  async liveQREditor(ws, req) {
    try {
      console.log('Live QR Editor WebSocket connection established');

      ws.on('message', async (message) => {
        try {
          const request = JSON.parse(message);

          switch (request.type) {
            case 'init':
              await this.handleEditorInit(ws, request);
              break;
            case 'update':
              await this.handleDataUpdate(ws, request);
              break;
            case 'format_change':
              await this.handleFormatChange(ws, request);
              break;
            case 'save':
              await this.handleSaveQR(ws, request);
              break;
            default:
              ws.send(JSON.stringify({
                type: 'error',
                error: { message: 'Unknown request type' }
              }));
          }
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'error',
            error: { message: error.message }
          }));
        }
      });

      ws.on('close', () => {
        console.log('Live QR Editor WebSocket connection closed');
      });
    } catch (error) {
      console.error('WebSocket error:', error);
      ws.close();
    }
  }

  // WebSocket helper methods
  async handleEditorInit(ws, request) {
    const { sessionId, userId, initialData } = request;

    const state = {
      sessionId,
      userId,
      currentData: initialData,
      currentFormat: 'PNG',
      currentSize: 256,
      lastModified: new Date().toISOString()
    };

    ws.send(JSON.stringify({
      type: 'state',
      data: state
    }));
  }

  async handleDataUpdate(ws, request) {
    const { sessionId, data } = request;

    // Generate preview
    try {
      const qrImage = await QRCode.toDataURL(data, {
        width: 256,
        margin: 2
      });

      ws.send(JSON.stringify({
        type: 'preview',
        data: {
          sessionId,
          qrImage: qrImage.split(',')[1], // Remove data:image/png;base64, prefix
          generatedAt: new Date().toISOString()
        }
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        error: { message: 'Failed to generate preview' }
      }));
    }
  }

  async handleFormatChange(ws, request) {
    const { sessionId, format, size } = request;

    ws.send(JSON.stringify({
      type: 'state',
      data: {
        sessionId,
        currentFormat: format,
        currentSize: size,
        lastModified: new Date().toISOString()
      }
    }));
  }

  async handleSaveQR(ws, request) {
    const { sessionId, name, data, format, size } = request;

    try {
      const qrResult = await qrService.generateSingleQR({
        data,
        format: QRFormat[format.toUpperCase()],
        size,
        metadata: { name, sessionId }
      });

      ws.send(JSON.stringify({
        type: 'save_result',
        data: {
          sessionId,
          qrId: qrResult.qrId,
          downloadUrl: qrResult.downloadUrl,
          success: true
        }
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'save_result',
        data: {
          sessionId,
          success: false,
          error: error.message
        }
      }));
    }
  }
}

module.exports = new QRController();