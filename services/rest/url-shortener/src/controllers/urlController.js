const urlService = require('../services/urlService');
const { ValidationError, NotFoundError } = require('../utils/errors');

const urlController = {
  async shortenUrl(req, res, next) {
    try {
      // Transform request body to match service expectation
      const params = {
        originalUrl: req.body.url,
        customAlias: req.body.customCode,
        expiresAt: req.body.expiresAt,
        userId: req.body.userId,
        tags: req.body.metadata
      };

      const result = await urlService.shortenURL(params);
      res.status(201).json({
        success: true,
        data: result,
        message: 'URL shortened successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  async resolveUrl(req, res, next) {
    try {
      const { shortCode } = req.params;
      const { redirect = 'true' } = req.query;

      const result = await urlService.getOriginalURL(shortCode, {
        clientIp: req.ip,
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer
      });

      if (redirect === 'true' || redirect === true) {
        return res.redirect(301, result.originalUrl);
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  async getUrlStats(req, res, next) {
    try {
      const { shortCode } = req.params;
      const urlData = urlService.findByShortCode(shortCode);

      if (!urlData) {
        return res.status(404).json({
          success: false,
          message: 'URL not found'
        });
      }

      const stats = await urlService.getClickStats(urlData.urlId);

      res.json({
        success: true,
        data: {
          shortCode,
          originalUrl: urlData.originalUrl,
          clickCount: urlData.clickCount || 0,
          uniqueClicks: stats.uniqueClicks,
          createdAt: urlData.createdAt,
          lastAccessed: urlData.lastAccessed || null,
          ...stats
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async bulkShorten(req, res, next) {
    try {
      // Transform request body to match service expectation
      const params = {
        urls: req.body.urls,
        userId: req.body.userId,
        batchId: req.body.batchId
      };

      const result = await urlService.bulkShortenURLs(params);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Bulk URL shortening completed'
      });
    } catch (error) {
      next(error);
    }
  },

  async getAnalytics(req, res, next) {
    try {
      const { shortCode } = req.params;
      const { startDate, endDate } = req.query;

      const urlData = urlService.findByShortCode(shortCode);

      if (!urlData) {
        return res.status(404).json({
          success: false,
          message: 'URL not found'
        });
      }

      const analytics = await urlService.getClickStats(urlData.urlId, { startDate, endDate });

      res.json({
        success: true,
        data: {
          shortCode,
          originalUrl: urlData.originalUrl,
          analytics
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async listUrls(req, res, next) {
    try {
      const { page = 1, size = 10, userId } = req.query;
      const result = await urlService.listUserURLs(userId, { page: parseInt(page), size: parseInt(size) }, {});

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  async updateUrl(req, res, next) {
    try {
      const { shortCode } = req.params;
      const result = await urlService.updateUrl(shortCode, req.body);

      res.json({
        success: true,
        data: result,
        message: 'URL updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteUrl(req, res, next) {
    try {
      const { shortCode } = req.params;
      await urlService.deleteUrl(shortCode);

      res.json({
        success: true,
        message: 'URL deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  liveAnalytics(ws, req) {
    const shortCode = req.params.shortCode;

    console.log(`WebSocket connected for live analytics: ${shortCode}`);

    const interval = setInterval(async () => {
      try {
        const stats = await urlService.getUrlStats(shortCode);
        ws.send(JSON.stringify({
          type: 'analytics_update',
          data: stats,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message,
          timestamp: new Date().toISOString()
        }));
      }
    }, 5000);

    ws.on('close', () => {
      clearInterval(interval);
      console.log(`WebSocket disconnected for: ${shortCode}`);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clearInterval(interval);
    });
  }
};

module.exports = urlController;