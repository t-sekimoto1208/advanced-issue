# 要件定義書

## システム概要

問い合わせ管理アプリ。顧客からの問い合わせを受け付け、担当者を割り当て、対応完了までのステータスを管理する社内ツール。
利用者はサポート担当者。問い合わせの見落としや対応漏れを防ぐことが目的。

## 画面一覧

| 画面名 | ファイル | 主な操作 |
|--------|----------|----------|
| 問い合わせ一覧 | index.html | 一覧表示・ステータス/担当者でフィルタ・新規登録ボタン・ステータス集計ダッシュボード |
| 問い合わせ登録フォーム | form.html | 件名・本文・担当者を入力して登録 |
| 詳細・対応履歴 | detail.html | コメント追加・ステータス変更・担当者変更 |

## APIエンドポイント一覧

| メソッド | パス | 概要 |
|----------|------|------|
| GET | /api/inquiries | 問い合わせ一覧（?status= ?assignee_id= でフィルタ） |
| POST | /api/inquiries | 問い合わせ登録 |
| GET | /api/inquiries/:id | 問い合わせ詳細 |
| PATCH | /api/inquiries/:id | ステータス・担当者の更新 |
| DELETE | /api/inquiries/:id | 問い合わせ削除（コメントもカスケード削除） |
| GET | /api/inquiries/:id/comments | 対応履歴一覧 |
| POST | /api/inquiries/:id/comments | コメント追加 |
| GET | /api/inquiries/summary | ステータス別集計（open/in_progress/closed/total） |
| GET | /api/assignees | 担当者一覧 |
| POST | /api/assignees | 担当者登録 |

## DBテーブル設計

### assignees（担当者）
| カラム | 型 | 制約 |
|--------|----|------|
| id | SERIAL | PRIMARY KEY |
| name | VARCHAR(100) | NOT NULL |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

### inquiries（問い合わせ）
| カラム | 型 | 制約 |
|--------|----|------|
| id | SERIAL | PRIMARY KEY |
| subject | VARCHAR(200) | NOT NULL |
| body | TEXT | NOT NULL |
| status | VARCHAR(20) | NOT NULL DEFAULT 'open' CHECK IN ('open','in_progress','closed') |
| assignee_id | INTEGER | FK → assignees(id) ON DELETE SET NULL |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

### comments（対応履歴）
| カラム | 型 | 制約 |
|--------|----|------|
| id | SERIAL | PRIMARY KEY |
| inquiry_id | INTEGER | NOT NULL, FK → inquiries(id) ON DELETE CASCADE |
| author | VARCHAR(100) | NOT NULL |
| body | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

## 状態遷移

```
open（未対応）
  ↓ 担当者アサイン
in_progress（対応中）
  ↓ 対応完了
closed（完了）
  ↓ 再オープン
open（未対応）
```

- `open` → `in_progress`：担当者アサイン時に自動遷移（またはPATCHで明示指定）
- `in_progress` → `closed`：PATCH でステータスを closed に変更
- `closed` → `open`：再オープン操作（PATCH でステータスを open に変更）
- `open` → `closed` の直接遷移は**許可しない**（必ず対応中を経由）
