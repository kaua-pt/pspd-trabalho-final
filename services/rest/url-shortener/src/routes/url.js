const express = require('express');
const urlController = require('../controllers/urlController');
const { validateShortenRequest, validateBulkRequest } = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * /api/v1/url/shorten:
 *   post:
 *     tags:
 *       - URL Shortening
 *     summary: Shorten a URL
 *     description: |
 *       Create a shortened URL from a long URL. Equivalent to gRPC ShortenUrl unary call.
 *
 *       **Academic Comparison**: This endpoint provides identical functionality to the
 *       gRPC service for performance comparison studies.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShortenUrlRequest'
 *           examples:
 *             basic:
 *               summary: Basic URL shortening
 *               value:
 *                 url: "https://example.com/very/long/url/that/needs/shortening"
 *             custom:
 *               summary: Custom short code
 *               value:
 *                 url: "https://pspd-lab.example.com"
 *                 customCode: "pspd2024"
 *                 userId: "student123"
 *                 metadata:
 *                   campaign: "academic-study"
 *                   source: "grpc-comparison"
 *     responses:
 *       201:
 *         description: URL shortened successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShortenUrlResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/shorten', validateShortenRequest, urlController.shortenUrl);

/**
 * @swagger
 * /api/v1/url/{shortCode}:
 *   get:
 *     tags:
 *       - URL Shortening
 *     summary: Resolve a shortened URL
 *     description: |
 *       Resolve a short code to its original URL and redirect. Equivalent to gRPC ResolveUrl.
 *       This endpoint tracks click analytics including geographic and device information.
 *     parameters:
 *       - $ref: '#/components/parameters/ShortCode'
 *       - name: redirect
 *         in: query
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Whether to redirect to original URL or return URL data
 *     responses:
 *       301:
 *         description: Redirect to original URL
 *         headers:
 *           Location:
 *             description: Original URL
 *             schema:
 *               type: string
 *               format: uri
 *       200:
 *         description: URL data returned (when redirect=false)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/UrlData'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       410:
 *         description: URL expired
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:shortCode', urlController.resolveUrl);

/**
 * @swagger
 * /api/v1/url/{shortCode}/stats:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Get URL statistics
 *     description: |
 *       Get click statistics and analytics for a shortened URL.
 *       Equivalent to gRPC GetUrlStats unary call.
 *     parameters:
 *       - $ref: '#/components/parameters/ShortCode'
 *       - $ref: '#/components/parameters/UserId'
 *     responses:
 *       200:
 *         description: URL statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     shortCode:
 *                       type: string
 *                     originalUrl:
 *                       type: string
 *                     clickCount:
 *                       type: integer
 *                     uniqueClicks:
 *                       type: integer
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     lastAccessed:
 *                       type: string
 *                       format: date-time
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:shortCode/stats', urlController.getUrlStats);

/**
 * @swagger
 * /api/v1/url/bulk:
 *   post:
 *     tags:
 *       - Bulk Operations
 *     summary: Shorten multiple URLs
 *     description: |
 *       Shorten multiple URLs in a single request. Equivalent to gRPC BulkShortenUrls.
 *
 *       **Academic Comparison**: This endpoint enables testing bulk processing
 *       performance between REST and gRPC protocols.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkShortenRequest'
 *           examples:
 *             basic:
 *               summary: Bulk shortening
 *               value:
 *                 urls:
 *                   - "https://example1.com/long/url/1"
 *                   - "https://example2.com/long/url/2"
 *                   - "https://example3.com/long/url/3"
 *                 userId: "student123"
 *                 batchId: "batch-001"
 *     responses:
 *       201:
 *         description: Bulk URL shortening completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BulkShortenResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/bulk', validateBulkRequest, urlController.bulkShorten);

/**
 * @swagger
 * /api/v1/url/{shortCode}/analytics:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Get detailed analytics
 *     description: |
 *       Get comprehensive analytics for a shortened URL including geographic,
 *       device, and temporal data. Equivalent to gRPC GetAnalytics.
 *     parameters:
 *       - $ref: '#/components/parameters/ShortCode'
 *       - $ref: '#/components/parameters/StartDate'
 *       - $ref: '#/components/parameters/EndDate'
 *       - $ref: '#/components/parameters/UserId'
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:shortCode/analytics', urlController.getAnalytics);

/**
 * @swagger
 * /api/v1/url:
 *   get:
 *     tags:
 *       - Management
 *     summary: List shortened URLs
 *     description: |
 *       List shortened URLs with pagination and filtering options.
 *       Equivalent to gRPC ListUrls server streaming call.
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Size'
 *       - $ref: '#/components/parameters/UserId'
 *       - name: sortBy
 *         in: query
 *         schema:
 *           type: string
 *           enum: ['createdAt', 'clickCount', 'lastAccessed']
 *           default: 'createdAt'
 *         description: Sort field
 *       - name: sortOrder
 *         in: query
 *         schema:
 *           type: string
 *           enum: ['asc', 'desc']
 *           default: 'desc'
 *         description: Sort order
 *     responses:
 *       200:
 *         description: URLs listed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     urls:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UrlData'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         size:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', urlController.listUrls);

/**
 * @swagger
 * /api/v1/url/{shortCode}:
 *   put:
 *     tags:
 *       - Management
 *     summary: Update a shortened URL
 *     description: |
 *       Update properties of a shortened URL such as original URL or expiration.
 *       Equivalent to gRPC UpdateUrl unary call.
 *     parameters:
 *       - $ref: '#/components/parameters/ShortCode'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               originalUrl:
 *                 type: string
 *                 format: uri
 *                 description: New original URL
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: New expiration date
 *               isActive:
 *                 type: boolean
 *                 description: Active status
 *               metadata:
 *                 type: object
 *                 description: Updated metadata
 *     responses:
 *       200:
 *         description: URL updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/UrlData'
 *                 message:
 *                   type: string
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/:shortCode', urlController.updateUrl);

/**
 * @swagger
 * /api/v1/url/{shortCode}:
 *   delete:
 *     tags:
 *       - Management
 *     summary: Delete a shortened URL
 *     description: |
 *       Delete a shortened URL and all associated analytics data.
 *       Equivalent to gRPC DeleteUrl unary call.
 *     parameters:
 *       - $ref: '#/components/parameters/ShortCode'
 *       - $ref: '#/components/parameters/UserId'
 *     responses:
 *       200:
 *         description: URL deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         description: Forbidden - insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/:shortCode', urlController.deleteUrl);

/**
 * @swagger
 * /api/v1/url/{shortCode}/live-analytics:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Live analytics WebSocket
 *     description: |
 *       WebSocket endpoint for real-time analytics updates.
 *       Equivalent to gRPC LiveAnalytics bidirectional streaming.
 *
 *       **WebSocket Protocol**: This endpoint simulates real-time analytics
 *       streaming for academic comparison with gRPC bidirectional streaming.
 *
 *       **Note**: WebSocket implementation temporarily disabled - requires express-ws setup
 *     parameters:
 *       - $ref: '#/components/parameters/ShortCode'
 *     responses:
 *       101:
 *         description: WebSocket connection established
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// router.ws('/:shortCode/live-analytics', urlController.liveAnalytics);

module.exports = router;