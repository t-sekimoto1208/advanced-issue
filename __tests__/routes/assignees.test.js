const request = require('supertest');
const app = require('../../src/index');

jest.mock('../../src/db/pool');
const pool = require('../../src/db/pool');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/assignees', () => {
  test('担当者一覧を200で返す', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, name: '田中', email: 'tanaka@example.com' }] });
    const res = await request(app).get('/api/assignees');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('POST /api/assignees', () => {
  test('正常登録で201を返す', async () => {
    const row = { id: 1, name: '田中', email: 'tanaka@example.com', created_at: new Date() };
    pool.query.mockResolvedValueOnce({ rows: [row] });

    const res = await request(app)
      .post('/api/assignees')
      .send({ name: '田中', email: 'tanaka@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('田中');
  });

  test('name なしで400を返す', async () => {
    const res = await request(app)
      .post('/api/assignees')
      .send({ email: 'test@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/);
  });

  test('email なしで400を返す', async () => {
    const res = await request(app)
      .post('/api/assignees')
      .send({ name: '田中' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/);
  });

  test('重複 email は400を返す', async () => {
    pool.query.mockRejectedValueOnce({ code: '23505' });
    const res = await request(app)
      .post('/api/assignees')
      .send({ name: '田中', email: 'tanaka@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/登録されています/);
  });
});
