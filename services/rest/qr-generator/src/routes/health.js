const express = require('express');
const router = express.Router();

/**
 * @route   GET /health
 * @desc    Health check endpoint (equivalent to gRPC HealthCheck)
 * @access  Public
 */
router.get('/', (req, res) => {
  const healthCheck = {
    service: 'qr-generator-rest',
    status: 'SERVING',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    protocol: 'REST/HTTP',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    },
    environment: process.env.NODE_ENV || 'development'
  };

  res.status(200).json(healthCheck);
});

/**
 * @route   GET /health/ready
 * @desc    Readiness probe for Kubernetes
 * @access  Public
 */
router.get('/ready', (req, res) => {
  // Add any readiness checks here (database connections, external services, etc.)
  const ready = true; // TODO: Add actual readiness checks

  if (ready) {
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /health/live
 * @desc    Liveness probe for Kubernetes
 * @access  Public
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;