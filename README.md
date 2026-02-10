# Edit Excel CSV

Excelライセンス不要で、Excel/CSVファイルを閲覧・編集できるWebアプリケーションです。

**すべての処理はブラウザ内で完結** — サーバーにデータを送信しないため、機密データも安心して扱えます。

**デモ**: https://ayutaz.github.io/edit-excel-csv/

## 特徴

- **Excelライセンス不要** — .xlsx / .xls / .csv ファイルをブラウザだけで開いて編集
- **プライバシー重視** — ファイルデータはクライアントサイドに留まり、外部送信なし
- **複数形式で保存** — XLSX、CSV、PDF形式でエクスポート可能
- **ドラッグ&ドロップ** — ファイルをドロップするだけで即座に編集開始
- **数式対応** — Univerの数式エンジンによるリアルタイム計算
- **セル結合対応** — 結合セルの読み込み・編集・保存に対応

## スクリーンショット

<!-- TODO: スクリーンショットを追加 -->

## 技術スタック

| レイヤー | 技術 |
|---|---|
| UI | React 18 + TypeScript |
| ビルド | Vite 6 |
| スプレッドシート | Univer (Canvas描画・数式エンジン) |
| Excel読み込み | SheetJS CE |
| Excel書き出し | ExcelJS |
| CSV処理 | PapaParse |
| PDF出力 | jsPDF + jspdf-autotable |
| UIコンポーネント | shadcn/ui + Tailwind CSS 4 |
| 状態管理 | Zustand |

## セットアップ

### 必要環境

- Node.js 18+
- pnpm

### インストール

```bash
pnpm install
```

### 開発サーバー起動

```bash
pnpm dev
```

ブラウザで `http://localhost:5173` を開きます。

### ビルド

```bash
pnpm build
```

`dist/` ディレクトリに静的ファイルが生成されます。任意のWebサーバーでホスティング可能です。

```bash
pnpm preview    # ビルド結果のプレビュー
```

## 対応ファイル形式

| 形式 | 読み込み | 書き出し |
|---|---|---|
| .xlsx | ○ | ○ |
| .xls | ○ | ○ (xlsxとして保存) |
| .csv | ○ | ○ |
| .pdf | - | ○ (読み取り専用) |

## 制約・既知の制限

- **ファイルサイズ上限**: 50MB
- **同時編集**: 1ファイルのみ（シングルファイルモード）
- **CSV文字エンコーディング**: UTF-8のみ対応（Shift_JIS/EUC-JPは今後対応予定）
- **セルスタイル**: スタイル変換未対応（フォント、色、罫線等は無視されます）
- **PDF日本語**: jsPDFのデフォルトフォントは日本語非対応のため、日本語テキストは正しく表示されない場合があります

## 開発

```bash
pnpm dev        # 開発サーバー
pnpm test       # ユニットテスト (Vitest)
pnpm test:e2e   # E2Eテスト (Playwright)
pnpm lint       # ESLint
pnpm format     # Prettier
```

## ライセンス

MIT
