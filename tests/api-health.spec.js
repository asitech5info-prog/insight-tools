const { test, expect } = require('@playwright/test');

test.describe('Backend API & Health Endpoints', () => {
  test('GET /api/health returns 200 OK and healthy status', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('healthy');
    expect(body.version).toBe('1.0.0');
    expect(body.memory).toHaveProperty('heapUsedMB');
  });

  test('GET /api/info returns app info and 23 supported tools', async ({ request }) => {
    const res = await request.get('/api/info');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Insight Tools');
    expect(body.supportedToolsCount).toBe(23);
    expect(body.categories).toContain('office');
  });

  test('POST /api/telemetry records anonymous conversion metrics', async ({ request }) => {
    const res = await request.post('/api/telemetry', {
      data: {
        tool: 'merge',
        sizeBytes: 1048576,
        durationMs: 420
      }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('Admin API endpoints function accurately', async ({ request }) => {
    // Unauthorized check
    const unauthRes = await request.get('/api/admin/stats');
    expect(unauthRes.status()).toBe(401);

    // Login endpoint
    const loginRes = await request.post('/api/admin/login', {
      data: { password: 'vape1098' }
    });
    expect(loginRes.status()).toBe(200);
    const { token } = await loginRes.json();
    expect(token).toBeTruthy();

    // Authenticated stats
    const statsRes = await request.get('/api/admin/stats', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(statsRes.status()).toBe(200);
    const statsBody = await statsRes.json();
    expect(statsBody).toHaveProperty('toolUsage');
    expect(statsBody).toHaveProperty('systemInfo');
  });
});
