const qrController = require('../../../src/controllers/qrController');
const qrService = require('../../../src/services/qrService');
const { QRFormat, ErrorCorrectionLevel } = require('../../../src/models/qrModels');
const { AppError } = require('../../../src/utils/errors');

// Mock the qrService
jest.mock('../../../src/services/qrService');

describe('QRController', () => {
  let req, res, next;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('generateQR', () => {
    it('should generate QR code successfully', async () => {
      const mockQRResult = {
        qrId: 'test-qr-id',
        qrImage: 'base64-image-data',
        format: 'PNG',
        size: 256,
        createdAt: new Date().toISOString(),
        downloadUrl: '/api/v1/qr/test-qr-id/download'
      };

      req.body = {
        data: 'https://example.com',
        format: 'PNG',
        size: 256,
        errorCorrection: 'MEDIUM',
        userId: 'user-123'
      };

      qrService.generateSingleQR.mockResolvedValue(mockQRResult);

      await qrController.generateQR(req, res, next);

      expect(qrService.generateSingleQR).toHaveBeenCalledWith({
        data: 'https://example.com',
        format: QRFormat.PNG,
        size: 256,
        errorCorrection: ErrorCorrectionLevel.MEDIUM,
        userId: 'user-123',
        metadata: undefined
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockQRResult,
        message: 'QR code generated successfully'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should use default values when not provided', async () => {
      const mockQRResult = {
        qrId: 'test-qr-id',
        qrImage: 'base64-image-data',
        format: 'PNG',
        size: 256,
        createdAt: new Date().toISOString(),
        downloadUrl: '/api/v1/qr/test-qr-id/download'
      };

      req.body = {
        data: 'Test data only'
      };

      qrService.generateSingleQR.mockResolvedValue(mockQRResult);

      await qrController.generateQR(req, res, next);

      expect(qrService.generateSingleQR).toHaveBeenCalledWith({
        data: 'Test data only',
        format: QRFormat.PNG,
        size: 256,
        errorCorrection: ErrorCorrectionLevel.MEDIUM,
        userId: undefined,
        metadata: undefined
      });

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should handle service errors', async () => {
      const error = new AppError('QR generation failed', 500);

      req.body = {
        data: 'Invalid data'
      };

      qrService.generateSingleQR.mockRejectedValue(error);

      await qrController.generateQR(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should handle metadata in request', async () => {
      const mockQRResult = { qrId: 'test' };
      const metadata = { source: 'web', priority: 'high' };

      req.body = {
        data: 'Test data',
        metadata
      };

      qrService.generateSingleQR.mockResolvedValue(mockQRResult);

      await qrController.generateQR(req, res, next);

      expect(qrService.generateSingleQR).toHaveBeenCalledWith(
        expect.objectContaining({ metadata })
      );
    });
  });

  describe('generateQRBatch', () => {
    it('should generate batch QR codes successfully', async () => {
      const mockBatchResult = {
        batchId: 'batch-123',
        results: [
          { originalData: 'Item 1', qrId: 'qr-1', success: true },
          { originalData: 'Item 2', qrId: 'qr-2', success: true }
        ],
        totalProcessed: 2,
        successful: 2,
        failed: 0,
        processedAt: new Date().toISOString()
      };

      req.body = {
        dataItems: ['Item 1', 'Item 2'],
        format: 'SVG',
        size: 512,
        userId: 'batch-user'
      };

      qrService.generateQRBatch.mockResolvedValue(mockBatchResult);

      await qrController.generateQRBatch(req, res, next);

      expect(qrService.generateQRBatch).toHaveBeenCalledWith({
        dataItems: ['Item 1', 'Item 2'],
        format: QRFormat.SVG,
        size: 512,
        errorCorrection: ErrorCorrectionLevel.MEDIUM,
        userId: 'batch-user',
        batchId: expect.any(String)
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockBatchResult,
        message: 'Batch of 2 QR codes generated successfully'
      });
    });

    it('should validate dataItems array', async () => {
      req.body = {
        dataItems: null
      };

      await qrController.generateQRBatch(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'dataItems must be an array'
        })
      );
    });

    it('should reject non-array dataItems', async () => {
      req.body = {
        dataItems: 'not an array'
      };

      await qrController.generateQRBatch(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(AppError)
      );
    });

    it('should use provided batchId', async () => {
      const mockResult = { batchId: 'custom-batch', results: [] };
      req.body = {
        dataItems: ['test'],
        batchId: 'custom-batch'
      };

      qrService.generateQRBatch.mockResolvedValue(mockResult);

      await qrController.generateQRBatch(req, res, next);

      expect(qrService.generateQRBatch).toHaveBeenCalledWith(
        expect.objectContaining({ batchId: 'custom-batch' })
      );
    });
  });

  describe('uploadQRData', () => {
    it('should process uploaded file successfully', async () => {
      const mockUploadResult = {
        qrIds: ['qr-1', 'qr-2'],
        totalProcessed: 2,
        successful: 2,
        failed: 0,
        processedAt: new Date().toISOString()
      };

      req.file = {
        buffer: Buffer.from('Line 1\nLine 2\n'),
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 1024
      };

      req.body = {
        outputFormat: 'PDF',
        userId: 'upload-user'
      };

      qrService.processUploadedData.mockResolvedValue(mockUploadResult);

      await qrController.uploadQRData(req, res, next);

      expect(qrService.processUploadedData).toHaveBeenCalledWith({
        filename: 'test.txt',
        contentType: 'text/plain',
        fileSize: 1024,
        outputFormat: QRFormat.PDF,
        userId: 'upload-user',
        dataItems: ['Line 1', 'Line 2']
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUploadResult,
        message: 'File processed successfully'
      });
    });

    it('should handle missing file', async () => {
      req.file = null;

      await qrController.uploadQRData(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No file uploaded'
        })
      );
    });

    it('should parse JSON files correctly', async () => {
      const jsonData = ['item1', 'item2', 'item3'];
      const mockResult = { qrIds: [] };

      req.file = {
        buffer: Buffer.from(JSON.stringify(jsonData)),
        originalname: 'data.json',
        mimetype: 'application/json',
        size: 100
      };

      req.body = { outputFormat: 'PNG' };

      qrService.processUploadedData.mockResolvedValue(mockResult);

      await qrController.uploadQRData(req, res, next);

      expect(qrService.processUploadedData).toHaveBeenCalledWith(
        expect.objectContaining({
          dataItems: jsonData
        })
      );
    });

    it('should parse CSV files correctly', async () => {
      const csvData = 'item1\nitem2\nitem3\n';
      const mockResult = { qrIds: [] };

      req.file = {
        buffer: Buffer.from(csvData),
        originalname: 'data.csv',
        mimetype: 'text/csv',
        size: 50
      };

      req.body = {};

      qrService.processUploadedData.mockResolvedValue(mockResult);

      await qrController.uploadQRData(req, res, next);

      expect(qrService.processUploadedData).toHaveBeenCalledWith(
        expect.objectContaining({
          dataItems: ['item1', 'item2', 'item3']
        })
      );
    });

    it('should filter empty lines from text files', async () => {
      const textData = 'line1\n\nline2\n   \nline3\n';
      const mockResult = { qrIds: [] };

      req.file = {
        buffer: Buffer.from(textData),
        originalname: 'data.txt',
        mimetype: 'text/plain',
        size: textData.length
      };

      req.body = {};

      qrService.processUploadedData.mockResolvedValue(mockResult);

      await qrController.uploadQRData(req, res, next);

      expect(qrService.processUploadedData).toHaveBeenCalledWith(
        expect.objectContaining({
          dataItems: ['line1', 'line2', 'line3']
        })
      );
    });
  });

  describe('getQR', () => {
    it('should retrieve QR code successfully', async () => {
      const mockQRData = {
        qrId: 'test-qr-id',
        data: 'Test QR data',
        format: 'PNG',
        size: 256,
        qrImage: 'base64-image',
        downloadUrl: '/download/test-qr-id',
        createdAt: new Date().toISOString()
      };

      req.params = { id: 'test-qr-id' };
      req.query = { userId: 'user-123' };

      qrService.getQRById.mockResolvedValue(mockQRData);

      await qrController.getQR(req, res, next);

      expect(qrService.getQRById).toHaveBeenCalledWith('test-qr-id', 'user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockQRData,
        message: 'QR code retrieved successfully'
      });
    });

    it('should handle QR code not found', async () => {
      req.params = { id: 'non-existent' };

      qrService.getQRById.mockResolvedValue(null);

      await qrController.getQR(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'QR code not found',
          statusCode: 404
        })
      );
    });

    it('should handle service errors', async () => {
      const error = new AppError('Access denied', 403);

      req.params = { id: 'protected-qr' };
      req.query = { userId: 'wrong-user' };

      qrService.getQRById.mockRejectedValue(error);

      await qrController.getQR(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteQR', () => {
    it('should delete QR code successfully', async () => {
      const mockDeleteResult = {
        success: true,
        message: 'QR code deleted successfully',
        deletedAt: new Date().toISOString()
      };

      req.params = { id: 'delete-qr-id' };
      req.body = { userId: 'owner-user' };

      qrService.deleteQR.mockResolvedValue(mockDeleteResult);

      await qrController.deleteQR(req, res, next);

      expect(qrService.deleteQR).toHaveBeenCalledWith('delete-qr-id', 'owner-user');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockDeleteResult,
        message: 'QR code deleted successfully'
      });
    });

    it('should handle delete failure', async () => {
      const mockDeleteResult = {
        success: false,
        message: 'QR code not found'
      };

      req.params = { id: 'missing-qr' };
      req.body = {};

      qrService.deleteQR.mockResolvedValue(mockDeleteResult);

      await qrController.deleteQR(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'QR code not found or already deleted',
          statusCode: 404
        })
      );
    });
  });

  describe('listQRCodes', () => {
    it('should list QR codes with default pagination', async () => {
      const mockListResult = {
        qrCodes: [
          { qrId: 'qr-1', data: 'Data 1' },
          { qrId: 'qr-2', data: 'Data 2' }
        ],
        pagination: {
          page: 1,
          size: 10,
          totalItems: 2,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false
        }
      };

      req.query = {};

      qrService.listQRCodes.mockResolvedValue(mockListResult);

      await qrController.listQRCodes(req, res, next);

      expect(qrService.listQRCodes).toHaveBeenCalledWith({
        userId: undefined,
        pagination: {
          page: 1,
          size: 10,
          sortBy: 'createdAt',
          ascending: false
        },
        filters: {}
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockListResult.qrCodes,
        pagination: mockListResult.pagination,
        message: 'QR codes retrieved successfully'
      });
    });

    it('should handle query parameters correctly', async () => {
      const mockListResult = {
        qrCodes: [],
        pagination: {}
      };

      req.query = {
        userId: 'filter-user',
        page: '2',
        size: '5',
        sortBy: 'data',
        ascending: 'true',
        format: 'SVG',
        search: 'test search'
      };

      qrService.listQRCodes.mockResolvedValue(mockListResult);

      await qrController.listQRCodes(req, res, next);

      expect(qrService.listQRCodes).toHaveBeenCalledWith({
        userId: 'filter-user',
        pagination: {
          page: 2,
          size: 5,
          sortBy: 'data',
          ascending: true
        },
        filters: {
          format: 'SVG',
          search: 'test search'
        }
      });
    });
  });
});