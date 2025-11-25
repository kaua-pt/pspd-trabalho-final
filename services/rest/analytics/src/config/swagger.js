const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Analytics REST API',
      version: '1.0.0',
      description: `
        Analytics REST API for extended production functionality.

        This service provides comprehensive analytics and reporting capabilities including:
        - Cross-service metrics aggregation
        - Performance analytics and reporting
        - Usage statistics and insights
        - Real-time dashboard data
        - Custom analytics queries
        - Data export and visualization

        **Extended Service**: This is a production-ready service that aggregates
        data from other microservices to provide comprehensive analytics and
        business intelligence capabilities.
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
        url: 'http://localhost:8081',
        description: 'Development server'
      },
      {
        url: 'http://analytics-rest:8081',
        description: 'Docker container'
      }
    ],
    tags: [
      {
        name: 'Dashboard',
        description: 'Dashboard data and metrics'
      },
      {
        name: 'Reports',
        description: 'Analytics reports generation'
      },
      {
        name: 'Metrics',
        description: 'System and performance metrics'
      },
      {
        name: 'Usage',
        description: 'Service usage analytics'
      },
      {
        name: 'Export',
        description: 'Data export operations'
      },
      {
        name: 'Health',
        description: 'Service health and monitoring'
      }
    ],
    components: {
      schemas: {
        DashboardRequest: {
          type: 'object',
          properties: {
            timeRange: {
              type: 'string',
              enum: ['1h', '24h', '7d', '30d', '90d', 'custom'],
              default: '24h',
              description: 'Time range for dashboard data'
            },
            startDate: {
              type: 'string',
              format: 'date-time',
              description: 'Start date for custom time range'
            },
            endDate: {
              type: 'string',
              format: 'date-time',
              description: 'End date for custom time range'
            },
            services: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['qr-generator', 'url-shortener', 'user-management', 'all']
              },
              default: ['all'],
              description: 'Services to include in analytics'
            },
            metrics: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['requests', 'errors', 'latency', 'usage', 'users']
              },
              description: 'Specific metrics to include'
            }
          }
        },
        DashboardResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                timeRange: {
                  type: 'string',
                  example: '24h'
                },
                generatedAt: {
                  type: 'string',
                  format: 'date-time'
                },
                overview: {
                  type: 'object',
                  properties: {
                    totalRequests: {
                      type: 'integer',
                      example: 15420
                    },
                    errorRate: {
                      type: 'number',
                      format: 'float',
                      example: 0.025
                    },
                    avgLatency: {
                      type: 'number',
                      format: 'float',
                      example: 145.3
                    },
                    activeUsers: {
                      type: 'integer',
                      example: 342
                    }
                  }
                },
                serviceMetrics: {
                  type: 'object',
                  properties: {
                    qrGenerator: {
                      type: 'object',
                      properties: {
                        requests: { type: 'integer' },
                        errors: { type: 'integer' },
                        avgLatency: { type: 'number' },
                        qrCodesGenerated: { type: 'integer' }
                      }
                    },
                    urlShortener: {
                      type: 'object',
                      properties: {
                        requests: { type: 'integer' },
                        errors: { type: 'integer' },
                        avgLatency: { type: 'number' },
                        urlsShortened: { type: 'integer' },
                        totalClicks: { type: 'integer' }
                      }
                    }
                  }
                },
                charts: {
                  type: 'object',
                  properties: {
                    requestsOverTime: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          timestamp: { type: 'string', format: 'date-time' },
                          requests: { type: 'integer' },
                          errors: { type: 'integer' }
                        }
                      }
                    },
                    topEndpoints: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          endpoint: { type: 'string' },
                          requests: { type: 'integer' },
                          avgLatency: { type: 'number' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        ReportRequest: {
          type: 'object',
          required: ['reportType', 'timeRange'],
          properties: {
            reportType: {
              type: 'string',
              enum: ['performance', 'usage', 'errors', 'comparison', 'custom'],
              description: 'Type of report to generate'
            },
            timeRange: {
              type: 'string',
              enum: ['1h', '24h', '7d', '30d', '90d', 'custom']
            },
            startDate: {
              type: 'string',
              format: 'date-time'
            },
            endDate: {
              type: 'string',
              format: 'date-time'
            },
            services: {
              type: 'array',
              items: { type: 'string' }
            },
            format: {
              type: 'string',
              enum: ['json', 'csv', 'pdf'],
              default: 'json',
              description: 'Report output format'
            },
            parameters: {
              type: 'object',
              description: 'Additional report parameters'
            }
          }
        },
        ReportResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean'
            },
            data: {
              type: 'object',
              properties: {
                reportId: {
                  type: 'string',
                  format: 'uuid'
                },
                reportType: {
                  type: 'string'
                },
                generatedAt: {
                  type: 'string',
                  format: 'date-time'
                },
                downloadUrl: {
                  type: 'string',
                  nullable: true
                },
                reportData: {
                  type: 'object',
                  description: 'Report content (when format is json)'
                },
                metadata: {
                  type: 'object',
                  properties: {
                    timeRange: { type: 'string' },
                    recordCount: { type: 'integer' },
                    fileSize: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        MetricsResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean'
            },
            data: {
              type: 'object',
              properties: {
                system: {
                  type: 'object',
                  properties: {
                    cpuUsage: { type: 'number', format: 'float' },
                    memoryUsage: { type: 'number', format: 'float' },
                    diskUsage: { type: 'number', format: 'float' },
                    networkIn: { type: 'number' },
                    networkOut: { type: 'number' }
                  }
                },
                services: {
                  type: 'object',
                  properties: {
                    qrGenerator: {
                      type: 'object',
                      properties: {
                        status: { type: 'string' },
                        uptime: { type: 'number' },
                        requestRate: { type: 'number' },
                        errorRate: { type: 'number' },
                        avgLatency: { type: 'number' }
                      }
                    },
                    urlShortener: {
                      type: 'object',
                      properties: {
                        status: { type: 'string' },
                        uptime: { type: 'number' },
                        requestRate: { type: 'number' },
                        errorRate: { type: 'number' },
                        avgLatency: { type: 'number' }
                      }
                    }
                  }
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
              example: 'analytics-rest'
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
                totalReports: {
                  type: 'integer'
                },
                activeQueries: {
                  type: 'integer'
                },
                dataPoints: {
                  type: 'integer'
                }
              }
            }
          }
        }
      },
      parameters: {
        TimeRange: {
          name: 'timeRange',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['1h', '24h', '7d', '30d', '90d', 'custom'],
            default: '24h'
          },
          description: 'Time range for analytics data'
        },
        StartDate: {
          name: 'startDate',
          in: 'query',
          schema: {
            type: 'string',
            format: 'date-time'
          },
          description: 'Start date for custom time range'
        },
        EndDate: {
          name: 'endDate',
          in: 'query',
          schema: {
            type: 'string',
            format: 'date-time'
          },
          description: 'End date for custom time range'
        },
        Services: {
          name: 'services',
          in: 'query',
          schema: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['qr-generator', 'url-shortener', 'user-management', 'all']
            }
          },
          description: 'Services to include in analytics'
        },
        ReportId: {
          name: 'reportId',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'Report unique identifier'
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