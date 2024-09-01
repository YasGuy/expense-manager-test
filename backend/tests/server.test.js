const request = require('supertest');

// Mock mysql2 to use createPool
jest.mock('mysql2', () => ({
  createPool: jest.fn(() => ({
    query: jest.fn(), // Mock query method if needed
    on: jest.fn(),   // Mock event listener if needed
  })),
}));

const app = require('../server'); // Adjust the path if necessary

describe('Server API - Health Check', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('GET /health returns 200 OK', async () => {
    const response = await request(app).get('/health');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
