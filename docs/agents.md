# Subagent定義書

## backend-architect
- 役割：APIエンドポイント設計・DBスキーマ・Expressルート実装を担当
- 担当するタスク：
  - マイグレーションSQL作成
  - src/routes/ 配下のCRUDルート実装
  - バリデーション・エラーハンドリング設計
  - ステータス遷移ロジックの実装
- 特に注意させること：
  - パラメータ化クエリを必ず使う（SQLインジェクション対策）
  - ステータス遷移のバリデーション（open→closed の直接遷移を禁止）
  - 外部キー制約に合わせたエラーハンドリング

## frontend-developer
- 役割：public/ 配下のHTML・CSS・JS実装とExpress静的配信設定を担当
- 担当するタスク：
  - public/index.html（一覧・フィルタ）
  - public/form.html（新規登録）
  - public/detail.html（詳細・コメント・ステータス変更）
  - public/style.css（共通スタイル）
- 特に注意させること：
  - fetch のエラーハンドリング（res.ok チェック）
  - フォーム送信後に一覧を自動更新する
  - ステータスに応じた色分け表示（open=赤・in_progress=黄・closed=緑）

## security-auditor
- 役割：実装済みコードのセキュリティ脆弱性を監査する
- 担当するタスク：
  - OWASP Top 10 チェック
  - 入力バリデーション・サニタイゼーション確認
  - SQLインジェクション・XSS リスク検出
  - 機密情報の露出確認
- 特に注意させること：
  - ステータス遷移のバリデーションバイパスがないか
  - コメントのbodyにXSSリスクがないか（HTMLエスケープ）
  - エラーレスポンスにスタックトレースが含まれていないか
