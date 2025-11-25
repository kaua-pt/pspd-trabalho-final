const qrService = require('../../../src/services/qrService');
const { QRFormat, ErrorCorrectionLevel } = require('../../../src/models/qrModels');
const { AppError } = require('../../../src/utils/errors');

describe('QRService', () => {
  beforeEach(() => {
    // Clear the in-memory storage before each test
    qrService.storage.clear();
  });

  describe('generateSingleQR', () => {
    it('should generate QR code with default parameters', async () => {
      const params = {
        data: 'https://example.com',
        format: QRFormat.PNG,
        size: 256,
        errorCorrection: ErrorCorrectionLevel.MEDIUM
      };

      const result = await qrService.generateSingleQR(params);

      expect(result).toHaveProperty('qrId');
      expect(result).toHaveProperty('qrImage');
      expect(result).toHaveProperty('format');
      expect(result).toHaveProperty('size', 256);
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('downloadUrl');

      expect(typeof result.qrId).toBe('string');
      expect(typeof result.qrImage).toBe('string');
      expect(result.format).toBe('PNG');
    });

    it('should generate QR code in SVG format', async () => {
      const params = {
        data: 'Test SVG QR Code',
        format: QRFormat.SVG,
        size: 512,
        errorCorrection: ErrorCorrectionLevel.HIGH,
        userId: 'test-user-123',
        metadata: { source: 'test' }
      };

      const result = await qrService.generateSingleQR(params);

      expect(result.format).toBe('SVG');
      expect(result.size).toBe(512);

      // Check if QR data is stored
      const storedData = qrService.storage.get(result.qrId);
      expect(storedData).toBeDefined();
      expect(storedData.userId).toBe('test-user-123');
      expect(storedData.metadata.source).toBe('test');
    });

    it('should handle empty data gracefully', async () => {
      const params = {
        data: '',
        format: QRFormat.PNG
      };

      const result = await qrService.generateSingleQR(params);
      expect(result).toHaveProperty('qrId');
      expect(result).toHaveProperty('qrImage');
    });

    it('should handle special characters in data', async () => {
      const params = {
        data: '特殊字符测试 emoji 🔥 symbols @#$%^&*()',
        format: QRFormat.PNG
      };

      const result = await qrService.generateSingleQR(params);
      expect(result).toHaveProperty('qrId');
      expect(result).toHaveProperty('qrImage');
    });

    it('should apply metadata correctly', async () => {
      const metadata = {
        source: 'unit-test',
        category: 'testing',
        priority: 'high'
      };

      const params = {
        data: 'Test with metadata',
        metadata
      };

      const result = await qrService.generateSingleQR(params);
      const stored = qrService.storage.get(result.qrId);

      expect(stored.metadata).toEqual(metadata);
    });
  });

  describe('generateQRBatch', () => {
    it('should generate multiple QR codes successfully', async () => {
      const params = {
        dataItems: ['Item 1', 'Item 2', 'Item 3'],
        format: QRFormat.PNG,
        batchId: 'test-batch-123',
        userId: 'user-123'
      };

      const result = await qrService.generateQRBatch(params);

      expect(result.batchId).toBe('test-batch-123');
      expect(result.results).toHaveLength(3);
      expect(result.totalProcessed).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);

      result.results.forEach((item, index) => {
        expect(item.originalData).toBe(`Item ${index + 1}`);
        expect(item.success).toBe(true);
        expect(item.qrId).toBeDefined();
        expect(item.progress).toBe(Math.round(((index + 1) / 3) * 100));
      });
    });

    it('should handle mixed success/failure in batch', async () => {
      // Mock QR generation to fail for specific data
      const originalGenerate = qrService.generateSingleQR;
      qrService.generateSingleQR = jest.fn().mockImplementation((params) => {
        if (params.data === 'FAIL') {
          throw new AppError('Simulated failure', 500);
        }
        return originalGenerate.call(qrService, params);
      });

      const params = {
        dataItems: ['Success 1', 'FAIL', 'Success 2'],
        format: QRFormat.PNG,
        batchId: 'mixed-batch'
      };

      const result = await qrService.generateQRBatch(params);

      expect(result.totalProcessed).toBe(3);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);

      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBeDefined();
      expect(result.results[2].success).toBe(true);

      // Restore original method
      qrService.generateSingleQR = originalGenerate;
    });

    it('should handle empty dataItems array', async () => {
      const params = {
        dataItems: [],
        format: QRFormat.PNG
      };

      const result = await qrService.generateQRBatch(params);

      expect(result.totalProcessed).toBe(0);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(0);
    });
  });

  describe('processUploadedData', () => {
    it('should process uploaded data successfully', async () => {
      const params = {
        filename: 'test.txt',
        contentType: 'text/plain',
        fileSize: 1024,
        outputFormat: QRFormat.PNG,
        userId: 'upload-user',
        dataItems: ['URL 1', 'URL 2', 'URL 3']
      };

      const result = await qrService.processUploadedData(params);

      expect(result.totalProcessed).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.qrIds).toHaveLength(3);
      expect(result.errors).toHaveLength(0);

      // Check that metadata includes upload info
      const firstQRId = result.qrIds[0];
      const stored = qrService.storage.get(firstQRId);
      expect(stored.metadata.source).toBe('upload');
      expect(stored.metadata.filename).toBe('test.txt');
    });

    it('should handle upload processing errors', async () => {
      // Mock to simulate failure
      const originalGenerate = qrService.generateSingleQR;
      qrService.generateSingleQR = jest.fn().mockImplementation((params) => {
        if (params.data === 'BAD_DATA') {
          throw new AppError('Invalid QR data', 400);
        }
        return originalGenerate.call(qrService, params);
      });

      const params = {
        filename: 'mixed.txt',
        contentType: 'text/plain',
        fileSize: 512,
        outputFormat: QRFormat.SVG,
        dataItems: ['Good data', 'BAD_DATA', 'More good data']
      };

      const result = await qrService.processUploadedData(params);

      expect(result.totalProcessed).toBe(3);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].data).toBe('BAD_DATA');

      // Restore
      qrService.generateSingleQR = originalGenerate;
    });
  });

  describe('getQRById', () => {
    it('should retrieve QR code by ID', async () => {
      // First create a QR code
      const createParams = {
        data: 'Test QR for retrieval',
        userId: 'retrieval-user'
      };

      const created = await qrService.generateSingleQR(createParams);

      // Then retrieve it
      const retrieved = await qrService.getQRById(created.qrId, 'retrieval-user');

      expect(retrieved).toBeDefined();
      expect(retrieved.qrId).toBe(created.qrId);
      expect(retrieved.data).toBe('Test QR for retrieval');
      expect(retrieved.qrImage).toBeDefined();
    });

    it('should return null for non-existent QR ID', async () => {
      const result = await qrService.getQRById('non-existent-id');
      expect(result).toBeNull();
    });

    it('should enforce user access control', async () => {
      // Create QR with specific user
      const createParams = {
        data: 'Private QR code',
        userId: 'owner-user'
      };

      const created = await qrService.generateSingleQR(createParams);

      // Try to access with different user
      await expect(
        qrService.getQRById(created.qrId, 'different-user')
      ).rejects.toThrow(AppError);
    });

    it('should allow access without userId when QR has no owner', async () => {
      const createParams = {
        data: 'Public QR code'
        // No userId
      };

      const created = await qrService.generateSingleQR(createParams);
      const retrieved = await qrService.getQRById(created.qrId);

      expect(retrieved).toBeDefined();
      expect(retrieved.qrId).toBe(created.qrId);
    });
  });

  describe('deleteQR', () => {
    it('should delete QR code successfully', async () => {
      const createParams = {
        data: 'QR to delete',
        userId: 'delete-user'
      };

      const created = await qrService.generateSingleQR(createParams);
      const deleteResult = await qrService.deleteQR(created.qrId, 'delete-user');

      expect(deleteResult.success).toBe(true);
      expect(deleteResult.message).toContain('deleted successfully');
      expect(deleteResult.deletedAt).toBeDefined();

      // Verify it's actually deleted
      const retrieved = await qrService.getQRById(created.qrId);
      expect(retrieved).toBeNull();
    });

    it('should return failure for non-existent QR', async () => {
      const result = await qrService.deleteQR('non-existent');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should enforce user access control for deletion', async () => {
      const createParams = {
        data: 'Protected QR',
        userId: 'owner'
      };

      const created = await qrService.generateSingleQR(createParams);

      await expect(
        qrService.deleteQR(created.qrId, 'not-owner')
      ).rejects.toThrow(AppError);
    });
  });

  describe('listQRCodes', () => {
    beforeEach(async () => {
      // Create test data
      const testData = [
        { data: 'QR 1', userId: 'user1', format: QRFormat.PNG },
        { data: 'QR 2', userId: 'user1', format: QRFormat.SVG },
        { data: 'QR 3', userId: 'user2', format: QRFormat.PNG },
        { data: 'Search term QR', userId: 'user1', format: QRFormat.PDF }
      ];

      for (const params of testData) {
        await qrService.generateSingleQR(params);
        // Small delay to ensure different timestamps
        await sleep(10);
      }
    });

    it('should list QR codes with pagination', async () => {
      const params = {
        pagination: {
          page: 1,
          size: 2,
          sortBy: 'createdAt',
          ascending: true
        }
      };

      const result = await qrService.listQRCodes(params);

      expect(result.qrCodes).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.size).toBe(2);
      expect(result.pagination.totalItems).toBe(4);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrevious).toBe(false);
    });

    it('should filter QR codes by user', async () => {
      const params = {
        userId: 'user1',
        pagination: { page: 1, size: 10 }
      };

      const result = await qrService.listQRCodes(params);

      expect(result.qrCodes).toHaveLength(3);
      result.qrCodes.forEach(qr => {
        expect(qrService.storage.get(qr.qrId).userId).toBe('user1');
      });
    });

    it('should filter QR codes by format', async () => {
      const params = {
        filters: { format: 'PNG' },
        pagination: { page: 1, size: 10 }
      };

      const result = await qrService.listQRCodes(params);

      expect(result.qrCodes).toHaveLength(2);
      result.qrCodes.forEach(qr => {
        expect(qr.format).toBe('PNG');
      });
    });

    it('should filter QR codes by search term', async () => {
      const params = {
        filters: { search: 'Search term' },
        pagination: { page: 1, size: 10 }
      };

      const result = await qrService.listQRCodes(params);

      expect(result.qrCodes).toHaveLength(1);
      expect(result.qrCodes[0].data).toContain('Search term');
    });

    it('should sort QR codes correctly', async () => {
      const params = {
        pagination: {
          page: 1,
          size: 10,
          sortBy: 'data',
          ascending: true
        }
      };

      const result = await qrService.listQRCodes(params);

      const sortedData = result.qrCodes.map(qr => qr.data).sort();
      const actualData = result.qrCodes.map(qr => qr.data);

      expect(actualData).toEqual(sortedData);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      // Create test QR codes with different formats
      await qrService.generateSingleQR({ data: 'Test 1', format: QRFormat.PNG, size: 256 });
      await qrService.generateSingleQR({ data: 'Test 2', format: QRFormat.PNG, size: 512 });
      await qrService.generateSingleQR({ data: 'Test 3', format: QRFormat.SVG, size: 256 });
    });

    it('should return correct statistics', () => {
      const stats = qrService.getStats();

      expect(stats.totalQRCodes).toBe(3);
      expect(stats.formatDistribution.PNG).toBe(2);
      expect(stats.formatDistribution.SVG).toBe(1);
      expect(stats.averageSize).toBe((256 + 512 + 256) / 3);
      expect(stats.oldestQR).toBeDefined();
      expect(stats.newestQR).toBeDefined();
    });

    it('should return empty stats when no QR codes exist', () => {
      qrService.storage.clear();
      const stats = qrService.getStats();

      expect(stats.totalQRCodes).toBe(0);
      expect(stats.formatDistribution).toEqual({});
      expect(stats.averageSize).toBe(0);
      expect(stats.oldestQR).toBeNull();
      expect(stats.newestQR).toBeNull();
    });
  });

  describe('mapErrorCorrectionLevel', () => {
    it('should map error correction levels correctly', () => {
      expect(qrService.mapErrorCorrectionLevel(ErrorCorrectionLevel.LOW)).toBe('L');
      expect(qrService.mapErrorCorrectionLevel(ErrorCorrectionLevel.MEDIUM)).toBe('M');
      expect(qrService.mapErrorCorrectionLevel(ErrorCorrectionLevel.QUARTILE)).toBe('Q');
      expect(qrService.mapErrorCorrectionLevel(ErrorCorrectionLevel.HIGH)).toBe('H');
    });

    it('should default to MEDIUM for invalid levels', () => {
      expect(qrService.mapErrorCorrectionLevel(999)).toBe('M');
      expect(qrService.mapErrorCorrectionLevel(undefined)).toBe('M');
    });
  });
});