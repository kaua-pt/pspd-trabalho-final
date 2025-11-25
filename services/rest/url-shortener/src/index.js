const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const urlRoutes = require('./routes/url');
const healthRoutes = require('./routes/health');
const { errorHandler } = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 8083;

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

// Rate limiting
app.use(rateLimiter);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'URL Shortener REST API Documentation',
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestDuration: true
  }
}));

app.use('/health', healthRoutes);
// Short URL redirect route (for direct short URLs like /abc123)
app.get('/:shortCode', async (req, res, next) => {
  const shortCode = req.params.shortCode;

  // Only handle if it looks like a short code (6 alphanumeric characters)
  if (/^[a-zA-Z0-9]{6}$/.test(shortCode)) {
    try {
      const urlController = require('./controllers/urlController');
      await urlController.resolveUrl(req, res, next);
      return;
    } catch (error) {
      next(error);
      return;
    }
  }

  // Not a short code, let other routes handle it
  next();
});

// Routes
app.use('/api/v1/url', urlRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'URL Shortener REST API',
    version: '1.0.0',
    protocol: 'REST/JSON',
    comparison: 'Academic comparison with gRPC implementation',
    documentation: {
      swagger: '/api-docs',
      openapi: '/api-docs/swagger.json'
    },
    endpoints: {
      shorten: 'POST /api/v1/url/shorten',
      resolve: 'GET /api/v1/url/:shortCode',
      stats: 'GET /api/v1/url/:shortCode/stats',
      bulk: 'POST /api/v1/url/bulk',
      analytics: 'GET /api/v1/url/analytics',
      list: 'GET /api/v1/url',
      update: 'PUT /api/v1/url/:shortCode',
      delete: 'DELETE /api/v1/url/:shortCode',
      health: 'GET /health'
    }
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: ['/api/v1/url', '/health']
  });
});

const server = app.listen(PORT, () => {
  console.log(`URL Shortener REST API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
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