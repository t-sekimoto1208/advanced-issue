-- 問い合わせ管理アプリ 初期スキーマ

-- 担当者テーブル
CREATE TABLE IF NOT EXISTS assignees (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100)  NOT NULL,
  email      VARCHAR(255)  NOT NULL UNIQUE,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 問い合わせテーブル
CREATE TABLE IF NOT EXISTS inquiries (
  id          SERIAL PRIMARY KEY,
  subject     VARCHAR(200)  NOT NULL,
  body        TEXT          NOT NULL,
  status      VARCHAR(20)   NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'in_progress', 'closed')),
  assignee_id INTEGER       REFERENCES assignees(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 対応履歴（コメント）テーブル
CREATE TABLE IF NOT EXISTS comments (
  id          SERIAL PRIMARY KEY,
  inquiry_id  INTEGER       NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  author      VARCHAR(100)  NOT NULL,
  body        TEXT          NOT NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_inquiries_status      ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_assignee_id ON inquiries(assignee_id);
CREATE INDEX IF NOT EXISTS idx_comments_inquiry_id   ON comments(inquiry_id);
