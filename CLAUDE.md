# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

ExcelファイルおよびCSVファイルをMicrosoft Excelライセンス不要で閲覧・編集できるWebアプリケーション。

**コンセプト**: クライアントサイド完結（サーバーにデータを送信しない）で、プライバシー重視の軽量Excel/CSVエディタ。

**ターゲット**: Excelライセンスを持たないユーザー、セキュリティ意識の高い開発者、スモールビジネス。

## 技術スタック

| レイヤー | 技術 | ライセンス | 役割 |
|---|---|---|---|
| UIフレームワーク | React 18 + TypeScript | MIT | アプリ全体のUI |
| ビルドツール | Vite 6 | MIT | 高速ビルド、コード分割 |
| スプレッドシートUI | Univer (preset-sheets-core) | Apache 2.0 | Canvas描画、数式エンジン、セル編集 |
| Excel読み込み | SheetJS CE (xlsx) | Apache 2.0 | .xlsx/.xls/.csv/.odsパース |
| Excel書き出し | ExcelJS | MIT | スタイル付き.xlsx生成 |
| CSV処理 | PapaParse | MIT | 高速CSVパース/生成 |
| UIコンポーネント | shadcn/ui + Tailwind CSS 4 | MIT | ツールバー、ダイアログ等 |
| アイコン | Lucide React | ISC | UIアイコン |
| 状態管理 | Zustand | MIT | ファイル状態、UI設定等 |
| テスト | Vitest + Playwright | MIT | ユニット/E2E |
| パッケージマネージャー | pnpm | MIT | 高速インストール |

## アーキテクチャ方針

### クライアントサイド完結型

1. File APIでファイルをArrayBufferとして読込
2. SheetJSでパース → JSON/配列データに変換
3. UniverのUIで表示・編集
4. ExcelJSで.xlsxに変換 or PapaParseでCSV生成
5. Blob + URL.createObjectURL でダウンロード

サーバー不要でデータがクライアントに留まるためプライバシー保護に優れる。

### Univerとの共存設計

- Univerはスプレッドシートのビューポート内のみ管轄
- アプリシェル（ヘッダー、ツールバー、ダイアログ等）はshadcn/ui + Zustand
- Univerとの結合は **Facade APIのみ経由**（内部API非依存で将来の差し替え可能）

### 変換フロー

```
[ユーザーファイル] → File API → SheetJS parse → import-adapter → Univer IWorkbookData
                                                                         ↓
                                                                   Univerで編集
                                                                         ↓
[ダウンロード] ← Blob ← ExcelJS/PapaParse ← export-adapter ← Univer Snapshot
```

## ディレクトリ構成

```
edit-excel-csv/
├── src/
│   ├── main.tsx                    # エントリーポイント
│   ├── App.tsx                     # ルートコンポーネント
│   ├── core/                       # コアロジック（UI非依存）
│   │   ├── univer-bridge/          # Univerとの結合レイヤー
│   │   │   ├── setup.ts            # Univerインスタンス初期化
│   │   │   ├── import-adapter.ts   # SheetJS → Univer変換
│   │   │   ├── export-adapter.ts   # Univer → ExcelJS/PapaParse変換
│   │   │   └── types.ts
│   │   ├── encoding/               # 文字エンコーディング
│   │   │   ├── detector.ts         # エンコーディング自動検出
│   │   │   ├── encoder.ts          # エンコーディング出力
│   │   │   └── types.ts            # 型定義
│   │   ├── file-io/                # ファイル入出力
│   │   │   ├── reader.ts           # ファイル読み込み
│   │   │   ├── writer.ts           # ファイル書き出し
│   │   │   └── validator.ts        # バリデーション
│   │   └── security/               # セキュリティ
│   │       └── sanitizer.ts        # CSVインジェクション対策
│   ├── stores/                     # Zustandストア
│   │   ├── file-store.ts           # ファイル状態
│   │   └── ui-store.ts             # UI状態（テーマ等）
│   ├── components/                 # Reactコンポーネント
│   │   ├── layout/                 # AppShell, Header, StatusBar
│   │   ├── editor/                 # SpreadsheetContainer
│   │   ├── dialogs/                # FileOpen, FileSave, Settings
│   │   ├── toolbar/                # MainToolbar
│   │   └── ui/                     # shadcn/ui共通コンポーネント
│   ├── hooks/                      # useUniver, useFileIO, useTheme等
│   ├── lib/                        # ユーティリティ
│   └── styles/                     # globals.css
├── tests/
│   ├── unit/                       # Vitest
│   ├── integration/                # ラウンドトリップテスト
│   ├── e2e/                        # Playwright
│   └── fixtures/                   # テスト用xlsx/csvファイル
├── docs/                           # ドキュメント
│   ├── research/                   # 調査レポート
│   └── architecture.md             # アーキテクチャ設計書
├── public/
├── vite.config.ts
├── package.json
├── CLAUDE.md
├── README.md
└── LICENSE
```

## 開発コマンド

```bash
pnpm dev          # 開発サーバー起動
pnpm build        # プロダクションビルド
pnpm preview      # ビルド結果プレビュー
pnpm test         # ユニットテスト (Vitest)
pnpm test:e2e     # E2Eテスト (Playwright)
pnpm lint         # ESLint
pnpm format       # Prettier
```

## コーディング規約

- **言語**: TypeScript strict mode
- **UIテキスト**: 日本語（将来i18n対応予定）
- **コメント**: 日本語可
- **フォーマット**: Prettier (デフォルト設定)
- **インポート**: 絶対パス (`@/` エイリアス)
- **コンポーネント**: 関数コンポーネント + hooks
- **状態管理**: Zustand (Reactコンテキスト不使用)
- **Univerアクセス**: Facade APIのみ使用（内部APIアクセス禁止）
- **セキュリティ**: `dangerouslySetInnerHTML` 使用禁止

## ライブラリ選定の注意点

- **SheetJS CE**: 数式の計算(評価)はCommunity Editionでは不可(Pro版のみ)。セルスタイルも限定的
- **ExcelJS**: 数式設定可能、フォント・罫線・条件付き書式等の豊富なスタイリング対応
- **Univer** (旧Luckysheet後継): Apache 2.0で商用無料。プラグインシステム・数式エンジン内蔵
- **Handsontable**: 商用利用は有料ライセンス必要のため非推奨

## 対応ファイル形式

| 形式 | MVP | Phase 2 | 読込ライブラリ | 書出ライブラリ |
|---|---|---|---|---|
| .xlsx | ○ | ○ | SheetJS | ExcelJS |
| .xls | ○ | ○ | SheetJS | ×（xlsxとして保存） |
| .csv | ○ | ○ | PapaParse | PapaParse |
| .ods | × | ○ | SheetJS | × |

## 制約・制限

- **ファイルサイズ上限**: 50MB（メモリ枯渇防止のため）
- **同時編集ファイル数**: 1ファイル（シングルファイルモード）
- **文字エンコーディング**: UTF-8、Shift_JIS、EUC-JP に対応（CSVファイルの自動エンコーディング検出）
- **セルスタイル**: MVP段階ではスタイル変換未対応（フォント、色、罫線等は無視される）
- **数式**: SheetJS CEは数式評価不可。Univerの数式エンジンで再計算

## エラーハンドリング方針

2段構えのエラーハンドリング:

1. **Toast通知**: ファイルI/Oエラー（読込失敗、保存失敗、バリデーションエラー）は非破壊的なToast通知で表示。編集中のデータは保持される
2. **Error Boundary**: Univerの初期化失敗や予期しないランタイムエラーは全画面のError Boundaryでキャッチし、ページリロードを提案

## CSVインジェクション対策方針

CSVエクスポート時に危険なプレフィックス文字（`=`, `+`, `-`, `@`, `\t`, `\r`）を検出する。

- **MVP**: 基本検出ロジックの実装。検出時は `console.warn` で警告を出力
- **Phase 2**: ユーザー向けUI警告ダイアログを表示し、エスケープ処理（シングルクオートプレフィックス）の選択を提供

対応コード: `src/core/security/sanitizer.ts`

## テスト戦略

### ユニットテスト (Vitest)

対象モジュール:
- `src/core/univer-bridge/import-adapter.ts` — SheetJS→Univer変換の正確性
- `src/core/univer-bridge/export-adapter.ts` — Univer→ExcelJS/PapaParse変換の正確性
- `src/core/file-io/validator.ts` — 拡張子、サイズ、マジックバイトの検証
- `src/core/security/sanitizer.ts` — CSVインジェクション検出ロジック
- `src/core/encoding/detector.ts` — UTF-8/Shift_JIS/EUC-JP自動検出の精度
- `src/core/encoding/encoder.ts` — エンコーディング出力の正当性

カバレッジ目標: `src/core/` 配下で80%以上

### ラウンドトリップテスト (Vitest 統合テスト)

手順:
1. テストフィクスチャ(.xlsx/.csv)をSheetJSで読み込み
2. import-adapterでUniverデータに変換
3. export-adapterでExcelJS/PapaParseデータに変換
4. 再度SheetJSで読み込み
5. 元データと変換後データの一致を検証（セル値、数式、セル結合）

### E2Eテスト (Playwright)

対象フロー:
- ファイルドラッグ&ドロップ → 表示確認
- セル編集 → 値の反映確認
- xlsx/csv保存 → ダウンロード確認
- ブラウザ: Chromium, Firefox, WebKit

## ドキュメント

- `docs/research/market-analysis.md` — 市場調査レポート
- `docs/research/technical-analysis.md` — 技術調査レポート
- `docs/research/product-ux-analysis.md` — プロダクト/UX/デザイン分析
- `docs/architecture.md` — アーキテクチャ設計書
