const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || 8081;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(compression());

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Analytics REST API Documentation',
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestDuration: true
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  const memUsage = process.memoryUsage();

  res.json({
    service: 'analytics-rest',
    status: 'SERVING',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: '1.0.0',
    protocol: 'REST/HTTP',
    memory: {
      used: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
    },
    stats: {
      totalReports: 0,
      activeQueries: 0,
      dataPoints: 0
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Analytics REST API',
    version: '1.0.0',
    protocol: 'REST/JSON',
    scope: 'Extended production service',
    documentation: {
      swagger: '/api-docs',
      openapi: '/api-docs/swagger.json'
    },
    endpoints: {
      dashboard: 'GET /api/v1/dashboard',
      metrics: 'GET /api/v1/metrics',
      reports: 'POST /api/v1/reports',
      reportStatus: 'GET /api/v1/reports/:reportId',
      usage: 'GET /api/v1/usage',
      export: 'POST /api/v1/export',
      health: 'GET /health'
    },
    note: 'This is a placeholder implementation. Extended analytics functionality to be implemented in production phase.'
  });
});

// Placeholder API endpoints
app.get('/api/v1/dashboard', (req, res) => {
  res.status(501).json({
    success: false,
    error: 'NotImplemented',
    message: 'Dashboard analytics endpoint - Implementation pending',
    note: 'This endpoint will provide comprehensive dashboard data aggregated from all services'
  });
});

app.get('/api/v1/metrics', (req, res) => {
  res.status(501).json({
    success: false,
    error: 'NotImplemented',
    message: 'System metrics endpoint - Implementation pending',
    note: 'This endpoint will provide real-time system and service metrics'
  });
});

app.post('/api/v1/reports', (req, res) => {
  res.status(501).json({
    success: false,
    error: 'NotImplemented',
    message: 'Report generation endpoint - Implementation pending',
    note: 'This endpoint will generate custom analytics reports'
  });
});

app.get('/api/v1/usage', (req, res) => {
  res.status(501).json({
    success: false,
    error: 'NotImplemented',
    message: 'Usage analytics endpoint - Implementation pending',
    note: 'This endpoint will provide detailed usage analytics across services'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);

  res.status(err.statusCode || 500).json({
    success: false,
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'NotFound',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: ['/api/v1/dashboard', '/api/v1/metrics', '/api/v1/reports', '/health'],
    note: 'Most endpoints are placeholders - see documentation for implementation status'
  });
});

const server = app.listen(PORT, () => {
  console.log(`Analytics REST API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
  console.log('Note: This is a placeholder service for extended analytics functionality');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;