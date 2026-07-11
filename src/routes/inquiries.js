const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// 許可されるステータス
const VALID_STATUSES = ['open', 'in_progress', 'closed'];

// ステータス遷移の許可マップ
const ALLOWED_TRANSITIONS = {
  open:        ['in_progress'],
  in_progress: ['closed'],
  closed:      ['open'],
};

// 問い合わせ一覧（?status= ?assignee_id= でフィルタ）
router.get('/', async (req, res) => {
  const { status, assignee_id } = req.query;

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'status の値が不正です' });
  }
  if (assignee_id !== undefined) {
    const id = parseInt(assignee_id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'assignee_id は正の整数で指定してください' });
    }
  }

  try {
    const conditions = [];
    const values = [];

    if (status) {
      values.push(status);
      conditions.push(`i.status = $${values.length}`);
    }
    if (assignee_id) {
      values.push(parseInt(assignee_id, 10));
      conditions.push(`i.assignee_id = $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT i.id, i.subject, i.body, i.status,
             i.assignee_id, a.name AS assignee_name,
             i.created_at, i.updated_at
      FROM inquiries i
      LEFT JOIN assignees a ON a.id = i.assignee_id
      ${where}
      ORDER BY i.created_at DESC
    `;
    const result = await pool.query(sql, values);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// 問い合わせ登録
router.post('/', async (req, res) => {
  const { subject, body, assignee_id } = req.body;

  if (!subject || typeof subject !== 'string' || subject.trim() === '') {
    return res.status(400).json({ error: 'subject は必須です' });
  }
  if (subject.length > 200) {
    return res.status(400).json({ error: 'subject は200文字以内で入力してください' });
  }
  if (!body || typeof body !== 'string' || body.trim() === '') {
    return res.status(400).json({ error: 'body は必須です' });
  }

  let aid = null;
  if (assignee_id !== undefined && assignee_id !== null && assignee_id !== '') {
    aid = parseInt(assignee_id, 10);
    if (isNaN(aid) || aid <= 0) {
      return res.status(400).json({ error: 'assignee_id は正の整数で指定してください' });
    }
  }

  try {
    const result = await pool.query(
      `INSERT INTO inquiries (subject, body, assignee_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [subject.trim(), body.trim(), aid]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: '指定した担当者が存在しません' });
    }
    console.error(err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// 問い合わせ詳細
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'id は正の整数で指定してください' });
  }
  try {
    const result = await pool.query(
      `SELECT i.id, i.subject, i.body, i.status,
              i.assignee_id, a.name AS assignee_name,
              i.created_at, i.updated_at
       FROM inquiries i
       LEFT JOIN assignees a ON a.id = i.assignee_id
       WHERE i.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '問い合わせが見つかりません' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// 問い合わせ更新（ステータス・担当者）
router.patch('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'id は正の整数で指定してください' });
  }

  const { status, assignee_id } = req.body;

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'status の値が不正です' });
  }

  try {
    // 現在の状態を取得
    const current = await pool.query(
      'SELECT status FROM inquiries WHERE id = $1',
      [id]
    );
    if (current.rows.length === 0) {
      return res.status(404).json({ error: '問い合わせが見つかりません' });
    }

    const currentStatus = current.rows[0].status;

    // ステータス遷移チェック
    if (status !== undefined && status !== currentStatus) {
      const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          error: `${currentStatus} から ${status} への遷移は許可されていません`,
        });
      }
    }

    const fields = [];
    const values = [];

    if (status !== undefined) {
      values.push(status);
      fields.push(`status = $${values.length}`);
    }
    if (assignee_id !== undefined) {
      const aid = assignee_id === null ? null : parseInt(assignee_id, 10);
      if (aid !== null && (isNaN(aid) || aid <= 0)) {
        return res.status(400).json({ error: 'assignee_id は正の整数で指定してください' });
      }
      values.push(aid);
      fields.push(`assignee_id = $${values.length}`);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: '更新フィールドがありません' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE inquiries
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: '指定した担当者が存在しません' });
    }
    console.error(err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// 問い合わせ削除
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'id は正の整数で指定してください' });
  }
  try {
    const result = await pool.query(
      'DELETE FROM inquiries WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '問い合わせが見つかりません' });
    }
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// コメント一覧
router.get('/:id/comments', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'id は正の整数で指定してください' });
  }
  try {
    // 問い合わせの存在確認
    const inq = await pool.query('SELECT id FROM inquiries WHERE id = $1', [id]);
    if (inq.rows.length === 0) {
      return res.status(404).json({ error: '問い合わせが見つかりません' });
    }
    const result = await pool.query(
      'SELECT * FROM comments WHERE inquiry_id = $1 ORDER BY created_at ASC',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// コメント追加
router.post('/:id/comments', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'id は正の整数で指定してください' });
  }

  const { author, body } = req.body;
  if (!author || typeof author !== 'string' || author.trim() === '') {
    return res.status(400).json({ error: 'author は必須です' });
  }
  if (author.length > 100) {
    return res.status(400).json({ error: 'author は100文字以内で入力してください' });
  }
  if (!body || typeof body !== 'string' || body.trim() === '') {
    return res.status(400).json({ error: 'body は必須です' });
  }

  try {
    // 問い合わせの存在確認
    const inq = await pool.query('SELECT id FROM inquiries WHERE id = $1', [id]);
    if (inq.rows.length === 0) {
      return res.status(404).json({ error: '問い合わせが見つかりません' });
    }
    const result = await pool.query(
      'INSERT INTO comments (inquiry_id, author, body) VALUES ($1, $2, $3) RETURNING *',
      [id, author.trim(), body.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

module.exports = router;
