const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'URL Shortener REST API',
      version: '1.0.0',
      description: `
        URL Shortener REST API for academic comparison with gRPC implementation.

        This service provides comprehensive URL shortening capabilities including:
        - URL shortening with customizable short codes
        - Click tracking and analytics
        - Bulk URL processing
        - Geographic and device analytics
        - Live analytics streaming simulation

        **Academic Purpose**: This REST implementation mirrors the functionality of the
        equivalent gRPC service to enable performance comparison studies between
        REST/JSON and gRPC/Protocol Buffers communication approaches.
      `,
      contact: {
        name: 'PSPD Lab Team',
        email: 'pspd-lab@example.com'
      },
      license: {
        name: 'Academic Use',
        url: 'https://example.com/academic-license'
      }
    },
    servers: [
      {
        url: 'http://localhost:8083',
        description: 'Development server'
      },
      {
        url: 'http://url-shortener-rest:8083',
        description: 'Docker container'
      }
    ],
    tags: [
      {
        name: 'URL Shortening',
        description: 'URL shortening operations'
      },
      {
        name: 'Analytics',
        description: 'Click tracking and analytics'
      },
      {
        name: 'Bulk Operations',
        description: 'Batch URL processing'
      },
      {
        name: 'Management',
        description: 'URL management operations'
      },
      {
        name: 'Health',
        description: 'Service health and monitoring'
      }
    ],
    components: {
      schemas: {
        ShortenUrlRequest: {
          type: 'object',
          required: ['url'],
          properties: {
            url: {
              type: 'string',
              format: 'uri',
              description: 'URL to shorten',
              example: 'https://example.com/very/long/url/that/needs/shortening'
            },
            customCode: {
              type: 'string',
              pattern: '^[a-zA-Z0-9-_]{3,20}$',
              description: 'Custom short code (optional)',
              example: 'mylink'
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              description: 'Expiration timestamp (optional)'
            },
            userId: {
              type: 'string',
              description: 'User identifier for ownership',
              example: 'user123'
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata',
              example: { campaign: 'summer2024', source: 'email' }
            }
          }
        },
        ShortenUrlResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                urlId: {
                  type: 'string',
                  format: 'uuid',
                  description: 'Unique URL identifier'
                },
                shortUrl: {
                  type: 'string',
                  example: 'http://short.ly/abc123'
                },
                shortCode: {
                  type: 'string',
                  example: 'abc123'
                },
                originalUrl: {
                  type: 'string',
                  example: 'https://example.com/very/long/url'
                },
                clickCount: {
                  type: 'integer',
                  example: 0
                },
                createdAt: {
                  type: 'string',
                  format: 'date-time'
                },
                expiresAt: {
                  type: 'string',
                  format: 'date-time',
                  nullable: true
                }
              }
            },
            message: {
              type: 'string',
              example: 'URL shortened successfully'
            }
          }
        },
        BulkShortenRequest: {
          type: 'object',
          required: ['urls'],
          properties: {
            urls: {
              type: 'array',
              items: {
                type: 'string',
                format: 'uri'
              },
              minItems: 1,
              maxItems: 100,
              description: 'Array of URLs to shorten',
              example: ['https://example1.com', 'https://example2.com']
            },
            userId: {
              type: 'string',
              description: 'User identifier'
            },
            batchId: {
              type: 'string',
              description: 'Optional batch identifier'
            },
            commonSettings: {
              type: 'object',
              properties: {
                expiresAt: {
                  type: 'string',
                  format: 'date-time'
                },
                metadata: {
                  type: 'object'
                }
              }
            }
          }
        },
        BulkShortenResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean'
            },
            data: {
              type: 'object',
              properties: {
                batchId: {
                  type: 'string'
                },
                results: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      originalUrl: {
                        type: 'string'
                      },
                      shortUrl: {
                        type: 'string'
                      },
                      shortCode: {
                        type: 'string'
                      },
                      success: {
                        type: 'boolean'
                      },
                      error: {
                        type: 'string',
                        nullable: true
                      }
                    }
                  }
                },
                totalProcessed: {
                  type: 'integer'
                },
                successful: {
                  type: 'integer'
                },
                failed: {
                  type: 'integer'
                },
                processedAt: {
                  type: 'string',
                  format: 'date-time'
                }
              }
            }
          }
        },
        UrlData: {
          type: 'object',
          properties: {
            urlId: {
              type: 'string',
              format: 'uuid'
            },
            shortCode: {
              type: 'string'
            },
            originalUrl: {
              type: 'string'
            },
            shortUrl: {
              type: 'string'
            },
            clickCount: {
              type: 'integer'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              nullable: true
            },
            isActive: {
              type: 'boolean'
            },
            metadata: {
              type: 'object'
            }
          }
        },
        AnalyticsResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean'
            },
            data: {
              type: 'object',
              properties: {
                urlId: {
                  type: 'string'
                },
                shortCode: {
                  type: 'string'
                },
                totalClicks: {
                  type: 'integer'
                },
                uniqueClicks: {
                  type: 'integer'
                },
                clicksByDate: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      date: {
                        type: 'string',
                        format: 'date'
                      },
                      clicks: {
                        type: 'integer'
                      }
                    }
                  }
                },
                topCountries: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      country: {
                        type: 'string'
                      },
                      clicks: {
                        type: 'integer'
                      }
                    }
                  }
                },
                topDevices: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      device: {
                        type: 'string'
                      },
                      clicks: {
                        type: 'integer'
                      }
                    }
                  }
                },
                generatedAt: {
                  type: 'string',
                  format: 'date-time'
                }
              }
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'ValidationError'
            },
            message: {
              type: 'string',
              example: 'Request validation failed'
            },
            details: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'object' } }
              ]
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        HealthResponse: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              example: 'url-shortener-rest'
            },
            status: {
              type: 'string',
              example: 'SERVING'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            },
            uptime: {
              type: 'number',
              description: 'Service uptime in seconds'
            },
            version: {
              type: 'string'
            },
            protocol: {
              type: 'string',
              example: 'REST/HTTP'
            },
            stats: {
              type: 'object',
              properties: {
                totalUrls: {
                  type: 'integer'
                },
                totalClicks: {
                  type: 'integer'
                },
                activeUrls: {
                  type: 'integer'
                }
              }
            }
          }
        }
      },
      parameters: {
        ShortCode: {
          name: 'shortCode',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            pattern: '^[a-zA-Z0-9-_]{3,20}$'
          },
          description: 'Short code identifier'
        },
        UserId: {
          name: 'userId',
          in: 'query',
          schema: {
            type: 'string'
          },
          description: 'User identifier for access control'
        },
        StartDate: {
          name: 'startDate',
          in: 'query',
          schema: {
            type: 'string',
            format: 'date'
          },
          description: 'Start date for analytics (YYYY-MM-DD)'
        },
        EndDate: {
          name: 'endDate',
          in: 'query',
          schema: {
            type: 'string',
            format: 'date'
          },
          description: 'End date for analytics (YYYY-MM-DD)'
        },
        Page: {
          name: 'page',
          in: 'query',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          },
          description: 'Page number for pagination'
        },
        Size: {
          name: 'size',
          in: 'query',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 10
          },
          description: 'Number of items per page'
        }
      },
      responses: {
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        TooManyRequests: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ErrorResponse' },
                  {
                    type: 'object',
                    properties: {
                      retryAfter: {
                        type: 'integer',
                        description: 'Seconds to wait before retry'
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    }
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/models/*.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs;