const express = require('express');
const urlService = require('../services/urlService');

const router = express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Service health check
 *     description: |
 *       Get service health status including uptime, memory usage, and service statistics.
 *       Used for monitoring and load balancer health checks.
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *             examples:
 *               healthy:
 *                 summary: Healthy service response
 *                 value:
 *                   service: "url-shortener-rest"
 *                   status: "SERVING"
 *                   timestamp: "2024-01-15T10:30:00Z"
 *                   uptime: 3600
 *                   version: "1.0.0"
 *                   protocol: "REST/HTTP"
 *                   stats:
 *                     totalUrls: 1250
 *                     totalClicks: 5430
 *                     activeUrls: 1100
 *       503:
 *         description: Service unavailable
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/HealthResponse'
 *                 - type: object
 *                   properties:
 *                     status:
 *                       example: "NOT_SERVING"
 */
router.get('/', async (req, res) => {
  try {
    const stats = await urlService.getServiceStats();
    const memUsage = process.memoryUsage();

    const healthData = {
      service: 'url-shortener-rest',
      status: 'SERVING',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: '1.0.0',
      protocol: 'REST/HTTP',
      memory: {
        used: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
      },
      stats
    };

    res.json(healthData);
  } catch (error) {
    res.status(503).json({
      service: 'url-shortener-rest',
      status: 'NOT_SERVING',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router;