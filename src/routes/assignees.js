const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// 担当者一覧
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, created_at FROM assignees ORDER BY id'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// 担当者登録
router.post('/', async (req, res) => {
  const { name, email } = req.body;
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'name は必須です' });
  }
  if (!email || typeof email !== 'string' || email.trim() === '') {
    return res.status(400).json({ error: 'email は必須です' });
  }
  if (name.length > 100) {
    return res.status(400).json({ error: 'name は100文字以内で入力してください' });
  }
  if (email.length > 255) {
    return res.status(400).json({ error: 'email は255文字以内で入力してください' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO assignees (name, email) VALUES ($1, $2) RETURNING *',
      [name.trim(), email.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'そのメールアドレスは既に登録されています' });
    }
    console.error(err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

module.exports = router;
