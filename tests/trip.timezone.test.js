const request = require('supertest');
const app = require('../src/app').default;

// Regression test for the "create a trip at 10h, it lands at 11h/9h in the
// DB" bug (UX_FUNCTIONAL_REVAMP_PLAN_2026-09.md, point 5). These requests
// are rejected by TripController's date validation before any Prisma call
// is made, so they don't need a live database to run.
describe('POST /v1/api/trip — timezone validation', () => {
  const basePayload = {
    departure_city: 'Douala',
    arrival_city: 'Yaoundé',
    price: 5000,
    bus_id: 1,
    agency_id: 1,
    created_by: 1,
  };

  it('rejects a naive (no timezone offset) departure_time instead of silently '
    + 'misinterpreting it as UTC', async () => {
    const res = await request(app).post('/v1/api/trip/').send({
      ...basePayload,
      departure_time: '2026-09-23T10:00:00.000',
      arrival_time: '2026-09-23T14:00:00.000',
      valid_from: '2026-09-23T00:00:00.000',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe(false);
    expect(res.body.message).toContain('departure_time');
  });

  it('rejects a naive arrival_time even when departure_time is well-formed', async () => {
    const res = await request(app).post('/v1/api/trip/').send({
      ...basePayload,
      departure_time: '2026-09-23T09:00:00.000Z',
      arrival_time: '2026-09-23T14:00:00.000',
      valid_from: '2026-09-23T00:00:00.000Z',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('arrival_time');
  });

  it('rejects a naive valid_from', async () => {
    const res = await request(app).post('/v1/api/trip/').send({
      ...basePayload,
      departure_time: '2026-09-23T09:00:00.000Z',
      arrival_time: '2026-09-23T13:00:00.000Z',
      valid_from: '2026-09-23T00:00:00.000',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('valid_from');
  });

  it('does not reject a properly Z-suffixed payload on timezone grounds '
    + '(may still fail later for unrelated reasons, e.g. no DB/no such bus '
    + 'in this test environment — only asserting the date check itself '
    + 'passes)', async () => {
    const res = await request(app).post('/v1/api/trip/').send({
      ...basePayload,
      departure_time: '2026-09-23T09:00:00.000Z',
      arrival_time: '2026-09-23T13:00:00.000Z',
      valid_from: '2026-09-23T00:00:00.000Z',
    });

    // Whatever happens next (200/201 on success, or a 4xx/5xx from a layer
    // further down like a missing bus/agency or no DB connection), it must
    // not be this controller's own "ambiguous date" rejection.
    if (res.statusCode === 400) {
      expect(res.body.message).not.toMatch(/timezone offset/);
    }
  });
});
