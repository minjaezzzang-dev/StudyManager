import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app';
import { testEnv } from './test/fixtures/env';
import { createLogger, setLogger } from './utils/logger';

describe('API contract', () => {
  beforeAll(() => {
    setLogger(createLogger(testEnv));
  });

  const app = createApp(testEnv);

  it('GET /health returns ok status', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('easykr-backend');
  });

  it('POST /api/auth/login rejects invalid body', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bad-email', password: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('BAD_REQUEST');
  });

  it('GET /api/translations/history requires authentication', async () => {
    const res = await request(app).get('/api/translations/history');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
  });

  it('GET /api/auth/me requires authentication', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/unknown-route');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not Found');
  });
});
