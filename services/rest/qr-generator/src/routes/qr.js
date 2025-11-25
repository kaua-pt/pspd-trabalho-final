const express = require('express');
const multer = require('multer');
const qrController = require('../controllers/qrController');
const { validateQRRequest, validateBatchRequest } = require('../middleware/validation');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/plain', 'application/json', 'text/csv'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only text, JSON, and CSV files are allowed.'), false);
    }
  }
});

/**
 * @swagger
 * /api/v1/qr/generate:
 *   post:
 *     tags:
 *       - QR Generation
 *     summary: Generate a single QR code
 *     description: |
 *       Generate a QR code from provided data. Equivalent to gRPC GenerateQR unary call.
 *
 *       **Academic Comparison**: This endpoint provides identical functionality to the
 *       gRPC service for performance comparison studies.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QRGenerateRequest'
 *           examples:
 *             basic:
 *               summary: Basic QR code
 *               value:
 *                 data: "https://example.com"
 *             advanced:
 *               summary: Advanced configuration
 *               value:
 *                 data: "https://pspd-lab.example.com"
 *                 format: "SVG"
 *                 size: 512
 *                 errorCorrection: "HIGH"
 *                 userId: "student123"
 *                 metadata:
 *                   source: "academic-study"
 *                   experiment: "grpc-vs-rest"
 *     responses:
 *       201:
 *         description: QR code generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QRGenerateResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/generate', validateQRRequest, qrController.generateQR);

/**
 * @route   POST /api/v1/qr/batch
 * @desc    Generate multiple QR codes in batch (equivalent to gRPC GenerateQRBatch)
 * @access  Public
 */
router.post('/batch', validateBatchRequest, qrController.generateQRBatch);

/**
 * @route   POST /api/v1/qr/upload
 * @desc    Upload data for QR code processing (equivalent to gRPC UploadQRData)
 * @access  Public
 */
router.post('/upload', upload.single('file'), qrController.uploadQRData);

/**
 * @route   GET /api/v1/qr/:id
 * @desc    Get QR code by ID (equivalent to gRPC GetQR)
 * @access  Public
 */
router.get('/:id', qrController.getQR);

/**
 * @route   DELETE /api/v1/qr/:id
 * @desc    Delete QR code by ID (equivalent to gRPC DeleteQR)
 * @access  Public
 */
router.delete('/:id', qrController.deleteQR);

/**
 * @route   GET /api/v1/qr
 * @desc    List QR codes with pagination and filtering
 * @access  Public
 */
router.get('/', qrController.listQRCodes);

/**
 * @route   WebSocket /api/v1/qr/live-editor
 * @desc    Live QR code editor (equivalent to gRPC LiveQREditor bidirectional streaming)
 * @access  Public
 * @note    WebSocket implementation temporarily disabled - requires express-ws setup
 */
// router.ws('/live-editor', qrController.liveQREditor);

module.exports = router;