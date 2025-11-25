const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'User Management REST API',
      version: '1.0.0',
      description: `
        User Management REST API for extended production functionality.

        This service provides comprehensive user management capabilities including:
        - User registration and authentication
        - Profile management
        - Role-based access control
        - Session management
        - User preferences and settings

        **Extended Service**: This is a production-ready service that extends beyond
        the academic gRPC comparison scope, providing additional functionality
        for a complete microservices architecture.
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
        url: 'http://localhost:8080',
        description: 'Development server'
      },
      {
        url: 'http://user-management-rest:8080',
        description: 'Docker container'
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication operations'
      },
      {
        name: 'User Management',
        description: 'User account management operations'
      },
      {
        name: 'Profile',
        description: 'User profile operations'
      },
      {
        name: 'Settings',
        description: 'User settings and preferences'
      },
      {
        name: 'Health',
        description: 'Service health and monitoring'
      }
    ],
    components: {
      schemas: {
        UserRegistrationRequest: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 50,
              pattern: '^[a-zA-Z0-9_-]+$',
              description: 'Unique username',
              example: 'student123'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'student@pspd-lab.example.com'
            },
            password: {
              type: 'string',
              minLength: 8,
              maxLength: 128,
              description: 'User password (will be hashed)',
              example: 'SecurePassword123!'
            },
            firstName: {
              type: 'string',
              maxLength: 100,
              description: 'First name',
              example: 'João'
            },
            lastName: {
              type: 'string',
              maxLength: 100,
              description: 'Last name',
              example: 'Silva'
            },
            role: {
              type: 'string',
              enum: ['student', 'instructor', 'admin'],
              default: 'student',
              description: 'User role'
            }
          }
        },
        UserLoginRequest: {
          type: 'object',
          required: ['login', 'password'],
          properties: {
            login: {
              type: 'string',
              description: 'Username or email',
              example: 'student123'
            },
            password: {
              type: 'string',
              description: 'User password',
              example: 'SecurePassword123!'
            },
            rememberMe: {
              type: 'boolean',
              default: false,
              description: 'Extended session duration'
            }
          }
        },
        UserResponse: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'Unique user identifier'
            },
            username: {
              type: 'string',
              example: 'student123'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'student@pspd-lab.example.com'
            },
            firstName: {
              type: 'string',
              example: 'João'
            },
            lastName: {
              type: 'string',
              example: 'Silva'
            },
            role: {
              type: 'string',
              example: 'student'
            },
            isActive: {
              type: 'boolean',
              example: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              nullable: true
            },
            preferences: {
              type: 'object',
              properties: {
                theme: {
                  type: 'string',
                  enum: ['light', 'dark'],
                  default: 'light'
                },
                language: {
                  type: 'string',
                  default: 'en'
                },
                notifications: {
                  type: 'boolean',
                  default: true
                }
              }
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/UserResponse'
                },
                token: {
                  type: 'string',
                  description: 'JWT authentication token'
                },
                refreshToken: {
                  type: 'string',
                  description: 'Refresh token for token renewal'
                },
                expiresAt: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Token expiration time'
                }
              }
            },
            message: {
              type: 'string',
              example: 'Login successful'
            }
          }
        },
        UserProfileUpdate: {
          type: 'object',
          properties: {
            firstName: {
              type: 'string',
              maxLength: 100
            },
            lastName: {
              type: 'string',
              maxLength: 100
            },
            email: {
              type: 'string',
              format: 'email'
            },
            preferences: {
              type: 'object',
              properties: {
                theme: {
                  type: 'string',
                  enum: ['light', 'dark']
                },
                language: {
                  type: 'string'
                },
                notifications: {
                  type: 'boolean'
                }
              }
            }
          }
        },
        PasswordChangeRequest: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: {
              type: 'string',
              description: 'Current password for verification'
            },
            newPassword: {
              type: 'string',
              minLength: 8,
              maxLength: 128,
              description: 'New password'
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
              example: 'user-management-rest'
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
                totalUsers: {
                  type: 'integer'
                },
                activeUsers: {
                  type: 'integer'
                },
                activeSessions: {
                  type: 'integer'
                }
              }
            }
          }
        }
      },
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      parameters: {
        UserId: {
          name: 'userId',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'User unique identifier'
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
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        Forbidden: {
          description: 'Insufficient permissions',
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
    },
    security: [
      {
        BearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/models/*.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs;