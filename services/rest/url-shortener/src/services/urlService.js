const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const validator = require('validator');
const geoip = require('geoip-lite');
const useragent = require('useragent');
const { URLStatus } = require('../models/urlModels');
const { AppError } = require('../utils/errors');

// In-memory storage for demo purposes
const urlStorage = new Map();
const clickStorage = new Map();

class URLService {
  constructor() {
    this.baseUrl = process.env.BASE_URL || 'http://localhost:8083';
  }

  /**
   * Shorten a URL (equivalent to gRPC ShortenURL)
   */
  async shortenURL(params) {
    const { originalUrl, customAlias, expiresAt, userId, trackClicks, description, tags } = params;

    // Validate URL
    if (!validator.isURL(originalUrl)) {
      throw new AppError('Invalid URL provided', 400);
    }

    // Generate short code
    const shortCode = customAlias || this.generateShortCode();

    // Check if alias already exists
    if (this.findByShortCode(shortCode)) {
      throw new AppError('Short code already exists', 409);
    }

    const urlId = uuidv4();
    const timestamp = new Date().toISOString();
    const shortUrl = `${this.baseUrl}/${shortCode}`;

    const urlData = {
      urlId,
      originalUrl,
      shortUrl,
      shortCode,
      userId,
      status: URLStatus.ACTIVE,
      trackClicks: trackClicks || true,
      description,
      tags: tags || {},
      createdAt: timestamp,
      expiresAt,
      clickCount: 0,
      qrCodeUrl: `/api/v1/qr/generate?data=${encodeURIComponent(shortUrl)}`
    };

    urlStorage.set(shortCode, urlData);

    return {
      urlId,
      shortUrl,
      shortCode,
      originalUrl,
      createdAt: timestamp,
      expiresAt,
      status: URLStatus.ACTIVE,
      qrCodeUrl: urlData.qrCodeUrl
    };
  }

  /**
   * Get original URL from short code (equivalent to gRPC GetOriginalURL)
   */
  async getOriginalURL(shortCode, clientInfo = {}) {
    const urlData = urlStorage.get(shortCode);

    if (!urlData) {
      throw new AppError('Short URL not found', 404);
    }

    // Check if expired
    if (urlData.expiresAt && new Date(urlData.expiresAt) < new Date()) {
      urlData.status = URLStatus.EXPIRED;
      throw new AppError('Short URL has expired', 410);
    }

    // Check if active
    if (urlData.status !== URLStatus.ACTIVE) {
      throw new AppError('Short URL is not available', 403);
    }

    // Track click if enabled
    if (urlData.trackClicks) {
      await this.trackClick(urlData, clientInfo);
    }

    return {
      originalUrl: urlData.originalUrl,
      status: urlData.status,
      redirectAllowed: true,
      clickInfo: clientInfo
    };
  }

  /**
   * Track click analytics
   */
  async trackClick(urlData, clientInfo) {
    const clickId = uuidv4();
    const { clientIp, userAgent, referrer } = clientInfo;

    // Get geographic info
    const geo = geoip.lookup(clientIp) || {};

    // Parse user agent
    const agent = useragent.parse(userAgent || '');

    const clickData = {
      clickId,
      urlId: urlData.urlId,
      clientIp,
      country: geo.country,
      city: geo.city,
      deviceType: agent.device.toString(),
      browser: agent.family,
      referrer,
      timestamp: new Date().toISOString()
    };

    // Store click data
    if (!clickStorage.has(urlData.urlId)) {
      clickStorage.set(urlData.urlId, []);
    }
    clickStorage.get(urlData.urlId).push(clickData);

    // Update click count
    urlData.clickCount = (urlData.clickCount || 0) + 1;
    urlStorage.set(urlData.shortCode, urlData);

    return clickData;
  }

  /**
   * Get click statistics (equivalent to gRPC GetClickStats)
   */
  async getClickStats(urlId, params = {}) {
    const clicks = clickStorage.get(urlId) || [];
    const { startDate, endDate, granularity = 'day' } = params;

    let filteredClicks = clicks;

    // Filter by date range
    if (startDate || endDate) {
      filteredClicks = clicks.filter(click => {
        const clickTime = new Date(click.timestamp);
        if (startDate && clickTime < new Date(startDate)) return false;
        if (endDate && clickTime > new Date(endDate)) return false;
        return true;
      });
    }

    // Group by time granularity
    const stats = this.groupClicksByTime(filteredClicks, granularity);
    const geoStats = this.groupClicksByLocation(filteredClicks);
    const deviceStats = this.groupClicksByDevice(filteredClicks);
    const referrerStats = this.groupClicksByReferrer(filteredClicks);

    return {
      urlId,
      totalClicks: filteredClicks.length,
      uniqueClicks: new Set(filteredClicks.map(c => c.clientIp)).size,
      timeStats: stats,
      geographicStats: geoStats,
      deviceStats: deviceStats,
      referrerStats: referrerStats
    };
  }

  /**
   * Bulk URL shortening
   */
  async bulkShortenURLs(params) {
    const { urls, userId, batchId = uuidv4(), trackClicks = true, defaultExpiry } = params;

    const results = [];
    let successful = 0;
    let failed = 0;

    for (const originalUrl of urls) {
      try {
        const result = await this.shortenURL({
          originalUrl,
          userId,
          trackClicks,
          expiresAt: defaultExpiry
        });

        results.push({
          originalUrl,
          shortUrl: result.shortUrl,
          urlId: result.urlId,
          success: true
        });

        successful++;
      } catch (error) {
        results.push({
          originalUrl,
          success: false,
          error: {
            code: error.statusCode || 500,
            message: error.message
          }
        });

        failed++;
      }
    }

    return {
      batchId,
      results,
      totalProcessed: urls.length,
      successful,
      failed,
      processedAt: new Date().toISOString()
    };
  }

  /**
   * List URLs for user
   */
  async listUserURLs(userId, pagination, filters) {
    let urls = Array.from(urlStorage.values());

    // Filter by user
    if (userId) {
      urls = urls.filter(url => url.userId === userId);
    }

    // Apply filters
    if (filters.statusFilter) {
      urls = urls.filter(url => url.status === filters.statusFilter);
    }

    if (filters.searchQuery) {
      urls = urls.filter(url =>
        url.originalUrl.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        (url.description && url.description.toLowerCase().includes(filters.searchQuery.toLowerCase()))
      );
    }

    // Sort and paginate
    urls.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const startIndex = (pagination.page - 1) * pagination.size;
    const endIndex = startIndex + pagination.size;
    const paginatedUrls = urls.slice(startIndex, endIndex);

    return {
      urls: paginatedUrls.map(url => ({
        urlId: url.urlId,
        shortUrl: url.shortUrl,
        originalUrl: url.originalUrl,
        description: url.description,
        status: url.status,
        totalClicks: url.clickCount || 0,
        createdAt: url.createdAt,
        expiresAt: url.expiresAt,
        tags: url.tags
      })),
      pagination: {
        page: pagination.page,
        size: pagination.size,
        totalItems: urls.length,
        totalPages: Math.ceil(urls.length / pagination.size),
        hasNext: endIndex < urls.length,
        hasPrevious: pagination.page > 1
      }
    };
  }

  /**
   * Generate short code
   */
  generateShortCode(length = 6) {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  /**
   * Find URL by short code
   */
  findByShortCode(shortCode) {
    return urlStorage.get(shortCode);
  }

  /**
   * Helper methods for analytics
   */
  groupClicksByTime(clicks, granularity) {
    // Implementation for time-based grouping
    return [];
  }

  groupClicksByLocation(clicks) {
    const locationGroups = {};
    clicks.forEach(click => {
      const key = `${click.country}-${click.city}`;
      locationGroups[key] = (locationGroups[key] || 0) + 1;
    });
    return Object.entries(locationGroups).map(([location, count]) => ({
      location,
      clicks: count,
      percentage: (count / clicks.length) * 100
    }));
  }

  groupClicksByDevice(clicks) {
    const deviceGroups = {};
    clicks.forEach(click => {
      const key = click.deviceType;
      deviceGroups[key] = (deviceGroups[key] || 0) + 1;
    });
    return Object.entries(deviceGroups).map(([device, count]) => ({
      device,
      clicks: count,
      percentage: (count / clicks.length) * 100
    }));
  }

  groupClicksByReferrer(clicks) {
    const referrerGroups = {};
    clicks.forEach(click => {
      const referrer = click.referrer || 'Direct';
      referrerGroups[referrer] = (referrerGroups[referrer] || 0) + 1;
    });
    return Object.entries(referrerGroups).map(([referrer, count]) => ({
      referrer,
      clicks: count,
      percentage: (count / clicks.length) * 100
    }));
  }

  /**
   * Update URL data
   */
  async updateUrl(shortCode, updateData) {
    const urlData = urlStorage.get(shortCode);

    if (!urlData) {
      throw new AppError('Short URL not found', 404);
    }

    const updatedData = {
      ...urlData,
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    urlStorage.set(shortCode, updatedData);
    return updatedData;
  }

  /**
   * Delete URL and associated data
   */
  async deleteUrl(shortCode) {
    const urlData = urlStorage.get(shortCode);

    if (!urlData) {
      throw new AppError('Short URL not found', 404);
    }

    // Delete URL data
    urlStorage.delete(shortCode);

    // Delete associated click data
    if (clickStorage.has(urlData.urlId)) {
      clickStorage.delete(urlData.urlId);
    }

    return { deleted: true };
  }

  /**
   * Get service stats for health check
   */
  getServiceStats() {
    return {
      totalUrls: urlStorage.size,
      totalClicks: Array.from(clickStorage.values()).reduce((sum, clicks) => sum + clicks.length, 0),
      activeUrls: Array.from(urlStorage.values()).filter(url => url.status === URLStatus.ACTIVE).length
    };
  }
}

module.exports = new URLService();