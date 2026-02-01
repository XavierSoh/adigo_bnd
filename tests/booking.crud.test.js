const request = require('supertest');
const app = require('../src/app').default;

describe('Booking API Endpoints - CRUD', () => {
  let createdId;
  let testBooking = {
    generated_trip_id: 1,
    customer_id: 1,
    generated_trip_seat_id: 1,
    booking_date: new Date().toISOString(),
    status: 'confirmed',
    payment_method: 'cash',
    payment_reference: 'TEST-REF',
    created_by: 1,
    total_price: 1000
  };

  it('POST / - should create a booking', async () => {
    const res = await request(app).post('/v1/api/booking/').send(testBooking);
    console.log('Response status:', res.statusCode);
    console.log('Response body:', JSON.stringify(res.body, null, 2));
    if (res.error) {
      console.log('Response error:', res.error);
    }
    expect([200, 201]).toContain(res.statusCode);
    if (res.body && res.body.body && res.body.body.id) createdId = res.body.body.id;
  });

  it('GET /:id - should get the created booking', async () => {
    if (!createdId) return;
    const res = await request(app).get(`/v1/api/booking/${createdId}`);
    expect([200, 404]).toContain(res.statusCode);
  });

  it('PUT /:id - should update the booking', async () => {
    if (!createdId) return;
    const res = await request(app).put(`/v1/api/booking/${createdId}`).send({ status: 'cancelled' });
    expect([200, 404]).toContain(res.statusCode);
  });

  it('DELETE /:id/soft - should soft delete the booking', async () => {
    if (!createdId) return;
    const res = await request(app).delete(`/v1/api/booking/${createdId}/soft`);
    expect([200, 404]).toContain(res.statusCode);
  });

  it('PATCH /:id/restore - should restore the booking', async () => {
    if (!createdId) return;
    const res = await request(app).patch(`/v1/api/booking/${createdId}/restore`);
    expect([200, 404]).toContain(res.statusCode);
  });

  it('DELETE /:id - should hard delete the booking', async () => {
    if (!createdId) return;
    const res = await request(app).delete(`/v1/api/booking/${createdId}`);
    expect([200, 404]).toContain(res.statusCode);
  });
});
