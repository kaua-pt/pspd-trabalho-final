const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'QR Code Generator REST API',
      version: '1.0.0',
      description: `
        QR Code Generator REST API for academic comparison with gRPC implementation.

        This service provides comprehensive QR code generation capabilities including:
        - Single QR code generation with multiple formats
        - Batch QR code processing
        - File upload processing
        - Live QR code editing simulation

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
        url: 'http://localhost:8082',
        description: 'Development server'
      },
      {
        url: 'http://qr-generator-rest:8082',
        description: 'Docker container'
      }
    ],
    tags: [
      {
        name: 'QR Generation',
        description: 'QR code generation operations'
      },
      {
        name: 'Batch Processing',
        description: 'Batch QR code operations'
      },
      {
        name: 'File Upload',
        description: 'File upload and processing'
      },
      {
        name: 'Management',
        description: 'QR code management operations'
      },
      {
        name: 'Health',
        description: 'Service health and monitoring'
      }
    ],
    components: {
      schemas: {
        QRGenerateRequest: {
          type: 'object',
          required: ['data'],
          properties: {
            data: {
              type: 'string',
              description: 'Data to encode in QR code',
              example: 'https://example.com',
              maxLength: 4096
            },
            format: {
              type: 'string',
              enum: ['PNG', 'SVG', 'PDF', 'JPEG'],
              default: 'PNG',
              description: 'Output format for QR code'
            },
            size: {
              type: 'integer',
              minimum: 64,
              maximum: 2048,
              default: 256,
              description: 'Size of QR code in pixels'
            },
            errorCorrection: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'QUARTILE', 'HIGH'],
              default: 'MEDIUM',
              description: 'Error correction level'
            },
            userId: {
              type: 'string',
              description: 'User identifier for ownership',
              example: 'user123'
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata for QR code',
              example: { source: 'web', priority: 'high' }
            }
          }
        },
        QRGenerateResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                qrId: {
                  type: 'string',
                  format: 'uuid',
                  description: 'Unique QR code identifier'
                },
                qrImage: {
                  type: 'string',
                  description: 'Base64 encoded QR code image'
                },
                format: {
                  type: 'string',
                  example: 'PNG'
                },
                size: {
                  type: 'integer',
                  example: 256
                },
                createdAt: {
                  type: 'string',
                  format: 'date-time'
                },
                downloadUrl: {
                  type: 'string',
                  example: '/api/v1/qr/123e4567-e89b-12d3-a456-426614174000/download'
                }
              }
            },
            message: {
              type: 'string',
              example: 'QR code generated successfully'
            }
          }
        },
        QRBatchRequest: {
          type: 'object',
          required: ['dataItems'],
          properties: {
            dataItems: {
              type: 'array',
              items: {
                type: 'string'
              },
              minItems: 1,
              maxItems: 100,
              description: 'Array of data items to generate QR codes for',
              example: ['https://example1.com', 'https://example2.com']
            },
            format: {
              type: 'string',
              enum: ['PNG', 'SVG', 'PDF', 'JPEG'],
              default: 'PNG'
            },
            size: {
              type: 'integer',
              minimum: 64,
              maximum: 2048,
              default: 256
            },
            errorCorrection: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'QUARTILE', 'HIGH'],
              default: 'MEDIUM'
            },
            userId: {
              type: 'string',
              description: 'User identifier'
            },
            batchId: {
              type: 'string',
              description: 'Optional batch identifier'
            }
          }
        },
        QRBatchResponse: {
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
                      originalData: {
                        type: 'string'
                      },
                      qrId: {
                        type: 'string'
                      },
                      shortUrl: {
                        type: 'string'
                      },
                      success: {
                        type: 'boolean'
                      },
                      progress: {
                        type: 'integer'
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
        QRData: {
          type: 'object',
          properties: {
            qrId: {
              type: 'string',
              format: 'uuid'
            },
            data: {
              type: 'string'
            },
            format: {
              type: 'string'
            },
            size: {
              type: 'integer'
            },
            qrImage: {
              type: 'string',
              description: 'Base64 encoded image'
            },
            downloadUrl: {
              type: 'string'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            metadata: {
              type: 'object'
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
              example: 'qr-generator-rest'
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
            memory: {
              type: 'object',
              properties: {
                used: {
                  type: 'string'
                },
                total: {
                  type: 'string'
                }
              }
            }
          }
        }
      },
      parameters: {
        QRId: {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'QR code unique identifier'
        },
        UserId: {
          name: 'userId',
          in: 'query',
          schema: {
            type: 'string'
          },
          description: 'User identifier for access control'
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