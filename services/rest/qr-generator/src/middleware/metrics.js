const prometheus = require('prom-client');

// Define labels
const labels = ['method', 'route', 'status_code'];

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: labels,
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const httpRequestTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: labels
});

const activeConnections = new prometheus.Gauge({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections',
});

// Middleware to track metrics
const metricsMiddleware = (req, res, next) => {
  activeConnections.inc();

  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;
    const route = req.route?.path || req.path;
    const statusCode = res.statusCode;

    httpRequestDuration.labels(req.method, route, statusCode).observe(duration);
    httpRequestTotal.labels(req.method, route, statusCode).inc();
    activeConnections.dec();
  });

  next();
};

// Endpoint to expose metrics
const metricsRoute = async (req, res) => {
  try {
    res.set('Content-Type', prometheus.register.contentType);
    const metrics = await prometheus.register.metrics();
    res.end(metrics);
  } catch (err) {
    res.status(500).end(err);
  }
};

module.exports = {
  metricsMiddleware,
  metricsRoute,
  httpRequestDuration,
  httpRequestTotal,
  activeConnections
};
