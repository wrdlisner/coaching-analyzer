---
name: coaching-analyzer
description: ICFコーチングセッション分析ツールの開発・保守スキル。コーチングセッションの録音ファイルをICF 8コアコンピテンシーで分析しPDFレポートを生成するWebアプリ・CLIツールの実装を行う。仕様変更・機能追加・バグ修正・デプロイ作業を行う際に使用する。"coaching analyzer"、"ICF分析"、"コンピテンシー分析"、"セッション分析"と言われた場合に使用する。
---

# Coaching Analyzer 開発スキル

## プロジェクト概要

コーチングセッションの録音ファイルをアップロードするだけで、ICF 8つのコアコンピテンシーに基づいた分析レポートをPDFで受け取れるWebサービス。

- ターゲット：ICF資格取得を目指すコーチ（ACC/PCC/MCC）
- フェーズ：無料公開（フィードバック収集・認知拡大）
- ホスティング：Railway（無料サブドメイン）

---

## ディレクトリ構成

```
coaching-analyzer/
├── main.py                  # CLIエントリーポイント
├── config.py                # APIキー・設定
├── modules/
│   ├── converter.py         # mp4→mp3変換（ffmpeg）
│   ├── transcriber.py       # AssemblyAI文字起こし
│   ├── analyzer.py          # Claude API分析
│   └── reporter.py          # PDFレポート生成
├── backend/
│   ├── main.py              # FastAPI エントリーポイント
│   ├── routers/
│   │   ├── auth.py          # 認証（会員登録・ログイン）
│   │   ├── analyze.py       # 分析実行API
│   │   └── credits.py       # クレジット管理
│   ├── models/
│   │   ├── user.py          # usersテーブル
│   │   ├── session.py       # sessionsテーブル
│   │   ├── credit.py        # creditsテーブル
│   │   └── feedback.py      # feedbacksテーブル
│   └── db.py                # DB接続
├── frontend/
│   ├── pages/
│   │   ├── index.tsx        # トップページ
│   │   ├── register.tsx     # 会員登録
│   │   ├── login.tsx        # ログイン
│   │   ├── dashboard.tsx    # マイページ
│   │   ├── analyze.tsx      # 分析実行
│   │   ├── report/[id].tsx  # レポート表示
│   │   └── feedback/[id].tsx # フィードバック
│   └── components/
├── templates/
│   └── report_style.css     # PDFスタイル
├── output/                  # レポート出力先（CLI用）
└── requirements.txt
```

---

## 技術スタック

| 役割 | 技術 |
|------|------|
| フロントエンド | Next.js（React / TypeScript） |
| バックエンド | FastAPI（Python） |
| データベース | PostgreSQL |
| ホスティング | Railway |
| 音声変換 | ffmpeg（mp4/m4a→mp3） |
| 文字起こし | AssemblyAI API（Universal-2・話者分離有効） |
| AI分析 | Claude API（claude-sonnet-4-20250514） |
| PDF生成 | xhtml2pdf |
| 認証 | JWT |

---

## 環境変数

```env
ASSEMBLYAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
DATABASE_URL=your_postgresql_url
JWT_SECRET=your_secret
```

---

## PDFレポート構成

```
表紙（サービス名・分析日時・セッション時間）
⚠️ AI注意文（ライトグレー背景）
1. セッション概要
   - 総時間・発話比率・平均スコア
   - ICF資格別合格可能性（ACC/PCC/MCC）
2. ICFコンピテンシー別スコア（レーダーチャート）
3. コンピテンシー別詳細分析（8セクション）
   各セクション：スコア・評価コメント・根拠引用・改善提案
4. コーチの強み・改善点
   【強み】【改善点】【総合コメント】
```

---

## ICF資格別合格可能性の基準

| 資格 | 合格圏内の目安スコア（平均） |
|------|--------------------------|
| ACC | 3.0以上 |
| PCC | 3.8以上 |
| MCC | 4.5以上 |

判定表示：
- ✅ 合格圏内：基準以上
- 🔶 もう一歩：基準まで0.5点以内
- ❌ 要強化：基準まで0.5点以上の差

---

## DBテーブル設計

### users
| カラム | 型 | 内容 |
|--------|-----|------|
| id | UUID | 会員ID |
| name | string | 氏名 |
| email | string | メールアドレス |
| password_hash | string | パスワード（ハッシュ） |
| icf_level | enum | ACC / PCC / MCC / none |
| credits | integer | クレジット残高 |
| created_at | timestamp | 登録日時 |

### sessions
| カラム | 型 | 内容 |
|--------|-----|------|
| id | UUID | セッションID |
| user_id | UUID | 会員IDへの参照 |
| duration_seconds | integer | セッション時間 |
| coach_ratio | float | コーチ発話比率 |
| avg_score | float | 平均スコア |
| scores | JSON | コンピテンシー別スコア |
| created_at | timestamp | 分析日時 |

※音声・文字起こしデータはDBに保存しない。分析完了後に即時削除。

### credits
| カラム | 型 | 内容 |
|--------|-----|------|
| id | UUID | ID |
| user_id | UUID | 会員IDへの参照 |
| amount | integer | 増減数（+1/-1） |
| reason | enum | analysis / feedback / sns_share / bonus |
| created_at | timestamp | 日時 |

### feedbacks
| カラム | 型 | 内容 |
|--------|-----|------|
| id | UUID | ID |
| session_id | UUID | セッションIDへの参照 |
| satisfaction | integer | 総合満足度（1〜5） |
| accuracy | integer | 分析精度（1〜5） |
| comment | text | 自由コメント |
| created_at | timestamp | 日時 |

---

## クレジット設計

| イベント | 増減 |
|---------|------|
| 新規登録 | +3 |
| 分析実行 | -1 |
| フィードバック送信 | +1 |
| XシェアURL確認 | +1 |

---

## 分析実行フロー（/api/analyze）

```
1. 認証確認（JWT）
2. クレジット残高確認（0以下なら拒否）
3. ファイル受け取り（mp3/mp4/m4a）
4. mp4・m4aの場合はffmpegでmp3変換
5. AssemblyAIで文字起こし＋話者分離
6. Claude APIでICF 8コンピテンシー分析
7. PDFレポート生成
8. 音声・文字起こしデータを即時削除
9. DBにスコアデータを保存（sessionsテーブル）
10. クレジットを-1（creditsテーブルに記録）
11. PDFをレスポンスで返す
```

---

## 分析実行画面の免責確認（全項目必須）

```
☐ クライアントに録音・録画の事実を告知し同意を得ています
☐ クライアントに本サービスでの分析利用の同意を得ています
☐ 本サービスはICF公式の審査・認定とは無関係であることを理解しています
☐ クレジットを1消費することに同意します（現在の残高：〇）
```

---

## 開発優先順位

1. バックエンドAPI（/api/analyze）の実装
2. 会員登録・ログイン
3. 分析実行画面（免責確認・アップロード・進捗表示）
4. レポート表示・ダウンロード
5. フィードバック・SNSシェア・クレジット付与
6. マイページ（レポート履歴・クレジット残高）
7. トップページ

---

## 実行コマンド（CLI版）

```bash
# 基本実行
python main.py --input session.mp4

# 話者名を手動指定
python main.py --input session.mp3 --coach "Speaker A" --client "Speaker B"

# 出力先を指定
python main.py --input session.mp4 --output ./reports/
```

---

## Railwayデプロイ時の注意事項

### よくあるエラーと原因

| エラー | 原因 | 対策 |
|--------|------|------|
| ModuleNotFoundError: modules | backend/のみデプロイでmodules/が未同梱 | modules/をbackend/配下に配置する |
| FileNotFoundError: ffmpeg | ffmpeg未インストール | Dockerfileにffmpegインストールを追加 |
| ModuleNotFoundError: config | config.pyがbackend/に未同梱 | config.pyをbackend/配下に配置する |
| TypeError: get_qualification_statuses() | 引数の不一致（シグネチャ更新漏れ） | 関数シグネチャ変更時は呼び出し元も必ず更新 |
| FileNotFoundError: フォントファイル | ファイルが大きすぎてタイムアウト | システムフォントを使用するか軽量フォントに変更 |
| KeyError: 'avg_score' | 返り値の辞書にキーが欠落 | 返り値のキーを統一して定義する |

### 根本原因
もともと1つのプロジェクトとして作られたコードをbackend/だけで動かそうとしたことが原因。
ファイルを追加・修正する際はbackend/配下に置くこと。

### ⚠️ 本番環境ファイルの参照ルール

**⚠️ 重要：Railway は `modules/`（ルート直下）を参照する**

`backend/main.py` が起動時に `sys.path.insert(0, Path(__file__).parent.parent)` でリポジトリルートをパスに追加するため、`from modules.xxx import` はルート直下の `modules/` が優先される。

| 役割 | Railwayが実際に使うファイル | 使われないファイル |
|------|----------------------------|--------------------|
| 分析ロジック | `modules/analyzer.py` | `backend/modules/analyzer.py` |
| PDF生成 | `modules/reporter.py` | `backend/modules/reporter.py` |
| 文字起こし | `modules/transcriber.py` | `backend/modules/transcriber.py` |

- バグ修正・機能追加は **`modules/`（ルート直下）** を編集すること
- 変更後は `backend/modules/` にもコピーして同期すること（どちらが使われるか将来変わる可能性に備えて）
- フィードバック対応・コード確認も `modules/`（ルート直下）を参照すること

### デプロイ前の確認事項
ファイルを追加・変更した後は必ず `git status` で未追跡ファイル（Untracked files）がないか確認すること。
Railway は git に含まれるファイルしかデプロイしないため、未追跡ファイルは本番環境に反映されない。
