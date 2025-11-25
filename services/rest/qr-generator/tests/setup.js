// Test setup file
const { performance } = require('perf_hooks');

// Global test configuration
global.testStartTime = performance.now();

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';

// Console override for cleaner test output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error // Keep error for debugging
};

// Global test helpers
global.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

global.createMockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  ip: '127.0.0.1',
  method: 'GET',
  originalUrl: '/test',
  ...overrides
});

global.createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis()
  };
  return res;
};

global.createMockNext = () => jest.fn();

// Setup and teardown
beforeAll(() => {
  console.log('🧪 Starting QR Generator REST API tests...');
});

afterAll(() => {
  const testEndTime = performance.now();
  const duration = Math.round(testEndTime - global.testStartTime);
  console.log(`✅ All tests completed in ${duration}ms`);
});

beforeEach(() => {
  // Clear mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  jest.restoreAllMocks();
});