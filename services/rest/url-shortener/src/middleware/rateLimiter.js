const { RateLimiterMemory, RateLimiterRedis } = require('rate-limiter-flexible');

/**
 * Rate limiter configurations
 */
const rateLimiters = {
  // General API rate limiting
  general: new RateLimiterMemory({
    keyPattern: 'general',
    points: 100, // Number of requests
    duration: 60, // Per 60 seconds
    blockDuration: 60, // Block for 60 seconds if exceeded
  }),

  // QR generation rate limiting (more restrictive)
  qrGeneration: new RateLimiterMemory({
    keyPattern: 'qr-gen',
    points: 10, // 10 QR codes
    duration: 60, // Per minute
    blockDuration: 120, // Block for 2 minutes
  }),

  // Batch processing rate limiting (very restrictive)
  batch: new RateLimiterMemory({
    keyPattern: 'batch',
    points: 2, // 2 batch requests
    duration: 300, // Per 5 minutes
    blockDuration: 600, // Block for 10 minutes
  }),

  // File upload rate limiting
  upload: new RateLimiterMemory({
    keyPattern: 'upload',
    points: 5, // 5 uploads
    duration: 300, // Per 5 minutes
    blockDuration: 300, // Block for 5 minutes
  })
};

/**
 * Create rate limiting middleware
 */
function createRateLimiter(limiterType = 'general') {
  const limiter = rateLimiters[limiterType];

  if (!limiter) {
    throw new Error(`Unknown rate limiter type: ${limiterType}`);
  }

  return async (req, res, next) => {
    try {
      // Use IP address as key (in production, might want to use user ID)
      const key = req.ip || req.connection.remoteAddress;

      await limiter.consume(key);
      next();
    } catch (rejRes) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;

      res.set('Retry-After', String(secs));
      res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: `Rate limit exceeded for ${limiterType} operations`,
        retryAfter: secs,
        limit: {
          points: limiter.points,
          duration: limiter.duration,
          remaining: rejRes.remainingPoints || 0
        },
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * General rate limiter middleware
 */
const rateLimiter = createRateLimiter('general');

/**
 * QR generation rate limiter
 */
const qrGenerationLimiter = createRateLimiter('qrGeneration');

/**
 * Batch processing rate limiter
 */
const batchLimiter = createRateLimiter('batch');

/**
 * Upload rate limiter
 */
const uploadLimiter = createRateLimiter('upload');

/**
 * Get rate limiter stats
 */
async function getRateLimiterStats(key, limiterType = 'general') {
  try {
    const limiter = rateLimiters[limiterType];
    const res = await limiter.get(key);

    return {
      totalHits: res?.totalHits || 0,
      remainingPoints: res?.remainingPoints || limiter.points,
      msBeforeNext: res?.msBeforeNext || 0,
      isBlocked: res?.totalHits >= limiter.points
    };
  } catch (error) {
    return null;
  }
}

/**
 * Reset rate limiter for a key
 */
async function resetRateLimit(key, limiterType = 'general') {
  try {
    const limiter = rateLimiters[limiterType];
    await limiter.delete(key);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Dynamic rate limiting based on endpoint
 */
function dynamicRateLimiter(req, res, next) {
  const path = req.path.toLowerCase();

  // Apply different rate limits based on endpoint
  if (path.includes('/batch')) {
    return batchLimiter(req, res, next);
  } else if (path.includes('/upload')) {
    return uploadLimiter(req, res, next);
  } else if (path.includes('/generate')) {
    return qrGenerationLimiter(req, res, next);
  } else {
    return rateLimiter(req, res, next);
  }
}

/**
 * Rate limiting configuration for different environments
 */
function getRateLimiterConfig(env = 'development') {
  const configs = {
    development: {
      general: { points: 1000, duration: 60 },
      qrGeneration: { points: 100, duration: 60 },
      batch: { points: 20, duration: 300 },
      upload: { points: 50, duration: 300 }
    },
    test: {
      general: { points: 10000, duration: 60 },
      qrGeneration: { points: 1000, duration: 60 },
      batch: { points: 100, duration: 300 },
      upload: { points: 100, duration: 300 }
    },
    production: {
      general: { points: 50, duration: 60 },
      qrGeneration: { points: 5, duration: 60 },
      batch: { points: 1, duration: 300 },
      upload: { points: 2, duration: 300 }
    }
  };

  return configs[env] || configs.development;
}

module.exports = {
  rateLimiter,
  qrGenerationLimiter,
  batchLimiter,
  uploadLimiter,
  dynamicRateLimiter,
  createRateLimiter,
  getRateLimiterStats,
  resetRateLimit,
  getRateLimiterConfig
};