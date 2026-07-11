const request = require('supertest');
const app = require('../../src/index');

jest.mock('../../src/db/pool');
const pool = require('../../src/db/pool');

beforeEach(() => {
  jest.clearAllMocks();
});

// --- GET /api/inquiries ---
describe('GET /api/inquiries', () => {
  test('全件取得で200を返す', async () => {
    // Arrange
    const rows = [
      { id: 1, subject: '件名1', body: '本文1', status: 'open', assignee_id: null, assignee_name: null, created_at: new Date(), updated_at: new Date() },
    ];
    pool.query.mockResolvedValueOnce({ rows });

    // Act
    const res = await request(app).get('/api/inquiries');

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].subject).toBe('件名1');
  });

  test('?status=open でフィルタして200を返す', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/inquiries?status=open');
    expect(res.status).toBe(200);
  });

  test('不正な status は400を返す', async () => {
    const res = await request(app).get('/api/inquiries?status=invalid');
    expect(res.status).toBe(400);
  });

  test('不正な assignee_id は400を返す', async () => {
    const res = await request(app).get('/api/inquiries?assignee_id=abc');
    expect(res.status).toBe(400);
  });
});

// --- POST /api/inquiries ---
describe('POST /api/inquiries', () => {
  test('正常登録で201を返す', async () => {
    const row = { id: 1, subject: '件名', body: '本文', status: 'open', assignee_id: null, created_at: new Date(), updated_at: new Date() };
    pool.query.mockResolvedValueOnce({ rows: [row] });

    const res = await request(app)
      .post('/api/inquiries')
      .send({ subject: '件名', body: '本文' });

    expect(res.status).toBe(201);
    expect(res.body.subject).toBe('件名');
  });

  test('subject なしで400を返す', async () => {
    const res = await request(app)
      .post('/api/inquiries')
      .send({ body: '本文' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/subject/);
  });

  test('body なしで400を返す', async () => {
    const res = await request(app)
      .post('/api/inquiries')
      .send({ subject: '件名' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/body/);
  });

  test('subject が200文字超で400を返す', async () => {
    const res = await request(app)
      .post('/api/inquiries')
      .send({ subject: 'a'.repeat(201), body: '本文' });
    expect(res.status).toBe(400);
  });

  test('存在しない assignee_id は400を返す', async () => {
    pool.query.mockRejectedValueOnce({ code: '23503' });
    const res = await request(app)
      .post('/api/inquiries')
      .send({ subject: '件名', body: '本文', assignee_id: 999 });
    expect(res.status).toBe(400);
  });
});

// --- GET /api/inquiries/:id ---
describe('GET /api/inquiries/:id', () => {
  test('存在するIDで200を返す', async () => {
    const row = { id: 1, subject: '件名', body: '本文', status: 'open', assignee_id: null, assignee_name: null };
    pool.query.mockResolvedValueOnce({ rows: [row] });

    const res = await request(app).get('/api/inquiries/1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });

  test('存在しないIDで404を返す', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/inquiries/999');
    expect(res.status).toBe(404);
  });

  test('非数値IDで400を返す', async () => {
    const res = await request(app).get('/api/inquiries/abc');
    expect(res.status).toBe(400);
  });
});

// --- PATCH /api/inquiries/:id ---
describe('PATCH /api/inquiries/:id', () => {
  test('open→in_progress 遷移で200を返す', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ status: 'open' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, status: 'in_progress' }] });

    const res = await request(app)
      .patch('/api/inquiries/1')
      .send({ status: 'in_progress' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in_progress');
  });

  test('open→closed の禁止遷移は400を返す', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ status: 'open' }] });

    const res = await request(app)
      .patch('/api/inquiries/1')
      .send({ status: 'closed' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/許可されていません/);
  });

  test('存在しないIDで404を返す', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .patch('/api/inquiries/999')
      .send({ status: 'in_progress' });
    expect(res.status).toBe(404);
  });

  test('不正な status で400を返す', async () => {
    const res = await request(app)
      .patch('/api/inquiries/1')
      .send({ status: 'invalid' });
    expect(res.status).toBe(400);
  });

  test('更新フィールドなしで400を返す', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ status: 'open' }] });
    const res = await request(app)
      .patch('/api/inquiries/1')
      .send({});
    expect(res.status).toBe(400);
  });
});

// --- DELETE /api/inquiries/:id ---
describe('DELETE /api/inquiries/:id', () => {
  test('存在するIDで204を返す', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await request(app).delete('/api/inquiries/1');
    expect(res.status).toBe(204);
  });

  test('存在しないIDで404を返す', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).delete('/api/inquiries/999');
    expect(res.status).toBe(404);
  });
});

// --- GET /api/inquiries/:id/comments ---
describe('GET /api/inquiries/:id/comments', () => {
  test('コメント一覧を200で返す', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, inquiry_id: 1, author: '田中', body: 'コメント' }] });

    const res = await request(app).get('/api/inquiries/1/comments');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test('存在しない inquiry_id で404を返す', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/inquiries/999/comments');
    expect(res.status).toBe(404);
  });
});

// --- POST /api/inquiries/:id/comments ---
describe('POST /api/inquiries/:id/comments', () => {
  test('正常登録で201を返す', async () => {
    const row = { id: 1, inquiry_id: 1, author: '田中', body: 'コメント', created_at: new Date() };
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [row] });

    const res = await request(app)
      .post('/api/inquiries/1/comments')
      .send({ author: '田中', body: 'コメント' });

    expect(res.status).toBe(201);
    expect(res.body.author).toBe('田中');
  });

  test('author なしで400を返す', async () => {
    const res = await request(app)
      .post('/api/inquiries/1/comments')
      .send({ body: 'コメント' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/author/);
  });

  test('body なしで400を返す', async () => {
    const res = await request(app)
      .post('/api/inquiries/1/comments')
      .send({ author: '田中' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/body/);
  });

  test('存在しない inquiry_id で404を返す', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/inquiries/999/comments')
      .send({ author: '田中', body: 'コメント' });
    expect(res.status).toBe(404);
  });
});
