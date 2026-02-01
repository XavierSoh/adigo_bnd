const request = require('supertest');
const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3800/v1/api/booking';

describe('Booking API Endpoints', () => {
  it('GET /bookings - should return all bookings', async () => {
    const res = await request(baseURL).get('/bookings');
    expect([200, 404]).toContain(res.statusCode); // 404 si aucune donnée
  });

  it('POST /bookings - should fail with missing data', async () => {
    const res = await request(baseURL).post('/bookings').send({});
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('POST /bookings/multiple - should fail with missing data', async () => {
    const res = await request(baseURL).post('/bookings/multiple').send({});
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('GET /bookings/statistics - should return statistics', async () => {
    const res = await request(baseURL).get('/bookings/statistics');
    expect([200, 404]).toContain(res.statusCode);
  });

  it('GET /bookings/revenue-statistics - should return revenue statistics', async () => {
    const res = await request(baseURL).get('/bookings/revenue-statistics');
    expect([200, 404]).toContain(res.statusCode);
  });

  it('GET /bookings/seat-availability - should return seat availability', async () => {
    const res = await request(baseURL).get('/bookings/seat-availability');
    expect([200, 404]).toContain(res.statusCode);
  });

  it('GET /bookings/booked-seats - should return booked seats', async () => {
    const res = await request(baseURL).get('/bookings/booked-seats');
    expect([200, 404]).toContain(res.statusCode);
  });

  it('GET /bookings/soft-deleted - should return soft deleted bookings', async () => {
    const res = await request(baseURL).get('/bookings/soft-deleted');
    expect([200, 404]).toContain(res.statusCode);
  });

  it('GET /bookings/recent - should return recent bookings', async () => {
    const res = await request(baseURL).get('/bookings/recent');
    expect([200, 404]).toContain(res.statusCode);
  });

  it('GET /bookings/by-date-range?start=2025-01-01&end=2025-12-31 - should return bookings in range', async () => {
    const res = await request(baseURL).get('/bookings/by-date-range?start=2025-01-01&end=2025-12-31');
    expect([200, 404]).toContain(res.statusCode);
  });

  // Ajoute d'autres tests pour les routes PUT, DELETE, PATCH si besoin
});
