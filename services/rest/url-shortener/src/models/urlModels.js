/**
 * URL status enumeration (equivalent to gRPC enum)
 */
const URLStatus = {
  ACTIVE: 0,
  INACTIVE: 1,
  EXPIRED: 2,
  BLOCKED: 3
};

/**
 * URL shortening request model (equivalent to gRPC ShortenURLRequest)
 */
class ShortenURLRequest {
  constructor({
    originalUrl,
    customAlias,
    expiresAt,
    userId,
    trackClicks = true,
    description,
    tags = {}
  }) {
    this.originalUrl = originalUrl;
    this.customAlias = customAlias;
    this.expiresAt = expiresAt;
    this.userId = userId;
    this.trackClicks = trackClicks;
    this.description = description;
    this.tags = tags;
  }

  validate() {
    const errors = [];

    if (!this.originalUrl || typeof this.originalUrl !== 'string') {
      errors.push('originalUrl is required and must be a string');
    }

    // Basic URL validation
    try {
      new URL(this.originalUrl);
    } catch (e) {
      errors.push('originalUrl must be a valid URL');
    }

    if (this.customAlias && (this.customAlias.length < 3 || this.customAlias.length > 50)) {
      errors.push('customAlias must be between 3 and 50 characters');
    }

    if (this.expiresAt) {
      const expiry = new Date(this.expiresAt);
      if (expiry <= new Date()) {
        errors.push('expiresAt must be in the future');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * URL response model (equivalent to gRPC ShortenURLResponse)
 */
class ShortenURLResponse {
  constructor({
    urlId,
    shortUrl,
    shortCode,
    originalUrl,
    createdAt,
    expiresAt,
    status,
    qrCodeUrl
  }) {
    this.urlId = urlId;
    this.shortUrl = shortUrl;
    this.shortCode = shortCode;
    this.originalUrl = originalUrl;
    this.createdAt = createdAt;
    this.expiresAt = expiresAt;
    this.status = status;
    this.qrCodeUrl = qrCodeUrl;
  }
}

/**
 * Click information model (equivalent to gRPC ClickInfo)
 */
class ClickInfo {
  constructor({
    urlId,
    clientIp,
    country,
    city,
    deviceType,
    browser,
    referrer,
    timestamp
  }) {
    this.urlId = urlId;
    this.clientIp = clientIp;
    this.country = country;
    this.city = city;
    this.deviceType = deviceType;
    this.browser = browser;
    this.referrer = referrer;
    this.timestamp = timestamp;
  }
}

/**
 * Analytics statistics model
 */
class URLAnalytics {
  constructor({
    urlId,
    totalClicks = 0,
    uniqueClicks = 0,
    clickRate = 0,
    geographicStats = [],
    deviceStats = [],
    referrerStats = []
  }) {
    this.urlId = urlId;
    this.totalClicks = totalClicks;
    this.uniqueClicks = uniqueClicks;
    this.clickRate = clickRate;
    this.geographicStats = geographicStats;
    this.deviceStats = deviceStats;
    this.referrerStats = referrerStats;
  }
}

/**
 * Bulk shortening request model
 */
class BulkShortenRequest {
  constructor({
    urls,
    userId,
    batchId,
    trackClicks = true,
    defaultExpiry
  }) {
    this.urls = urls;
    this.userId = userId;
    this.batchId = batchId;
    this.trackClicks = trackClicks;
    this.defaultExpiry = defaultExpiry;
  }

  validate() {
    const errors = [];

    if (!this.urls || !Array.isArray(this.urls)) {
      errors.push('urls must be an array');
    } else {
      if (this.urls.length === 0) {
        errors.push('urls cannot be empty');
      }

      if (this.urls.length > 100) {
        errors.push('Batch size cannot exceed 100 URLs');
      }

      // Validate each URL
      this.urls.forEach((url, index) => {
        if (!url || typeof url !== 'string') {
          errors.push(`URL at index ${index} must be a non-empty string`);
        } else {
          try {
            new URL(url);
          } catch (e) {
            errors.push(`URL at index ${index} is not valid`);
          }
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = {
  URLStatus,
  ShortenURLRequest,
  ShortenURLResponse,
  ClickInfo,
  URLAnalytics,
  BulkShortenRequest
};