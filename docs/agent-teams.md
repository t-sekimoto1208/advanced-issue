# Agent Teams 設計書

## 追加機能の概要

テーマC（問い合わせ管理アプリ）の追加機能を実装する。

1. **ステータス自動更新**：担当者がアサインされたら自動で「対応中（in_progress）」に変わる
   - PATCH /api/inquiries/:id で assignee_id が設定された際、status が open であれば自動的に in_progress へ遷移する
2. **集計API**：ステータス別の件数を返す GET /api/inquiries/summary エンドポイントを追加する

## Agent構成

| Agent名 | 役割 | 担当タスク |
|---------|------|------------|
| Backend Agent | サーバーサイドAPI実装 | inquiries.js に /summary エンドポイント追加・PATCH の自動遷移ロジック実装 |
| Frontend Agent | クライアントUI実装 | index.html 上部に集計ダッシュボードを追加 |
| Test Agent | テストコード作成 | __tests__/routes/inquiries.test.js に追加機能のテストを追記 |
| Review Agent | セキュリティ・品質レビュー | 全出力のSQLインジェクション・XSS・エラーハンドリングを確認 |

## タスクの依存関係

```
Backend Agent（API実装）
  └→ Frontend Agent（UIが /summary を fetch）
  └→ Test Agent（実装済みAPIに対してテスト作成）
       └→ Review Agent（完成コードのレビュー）
```

## 並列実行できるタスク

- Backend Agent と Frontend Agent は **並列実行可能**（Frontendは /summary のI/Fさえ決まれば実装できる）
- Test Agent は Backend Agent の完了後に開始
- Review Agent は全員の完了後に実行

## 統合時の確認ポイント

1. `/summary` のルートが `/:id` より前に定義されているか（Express のルート順序問題）
2. 自動遷移ロジックが明示的な status 指定と競合しないか
3. Frontend の fetch エラー時にダッシュボードが非表示になるか（graceful degradation）
4. テストの mock が自動遷移後の返却値を正しく反映しているか

## 実際の気づき（実装後追記）

- `/summary` ルートは `/:id` より上に配置する必要があった（Expressは上から順にマッチするため）
- 自動遷移は「assignee_id が null でない値に変更される」かつ「現在の status が open」の場合のみ発動させ、明示的な status 指定と競合しないようにした
- Frontend ダッシュボードはサーバーエラー時に非表示とし、既存UIへの影響を最小化した
