# アーキテクチャ設計書

## 概要

Excel/CSVブラウザ編集Webアプリのアーキテクチャ設計をまとめる。

---

## 1. 技術スタック選定理由

| レイヤー | 技術 | 選定理由 |
|---|---|---|
| UIフレームワーク | React 18 + TypeScript | エコシステム最大、型安全、豊富な開発者プール |
| ビルドツール | Vite 6 | HMR高速、ESM対応、コード分割容易 |
| スプレッドシートUI | Univer | Apache 2.0商用無料、Canvas高性能描画、Facade API疎結合 |
| Excel読み込み | SheetJS CE | 多形式対応（xlsx/xls/csv/ods）、高速パース |
| Excel書き出し | ExcelJS | セルスタイリング対応が豊富、ストリーミング書込対応 |
| CSV処理 | PapaParse | 最速、ブラウザ/Node.js両対応、自動エンコーディング検出 |
| PDF出力 | jsPDF + jspdf-autotable | テーブルレイアウト対応、日本語フォント（Noto Sans JP）組み込み |
| エンコーディング変換 | encoding-japanese | Shift_JIS/EUC-JP↔UTF-8 変換、バイト列レベルの文字コード検出 |
| UIコンポーネント | shadcn/ui + Tailwind CSS 4 | バンドルサイズ極小、カスタマイズ性最高、Tailwindネイティブ |
| 状態管理 | Zustand | 軽量、ボイラープレート最小、React外からもアクセス可能 |
| テスト | Vitest + Playwright | Viteエコシステム統一、高速ユニットテスト + ブラウザE2E |
| パッケージマネージャー | pnpm | 高速インストール、ディスク効率、厳密な依存管理 |

---

## 2. Univerとの共存設計方針

### 責務分離

```
┌─────────────────────────────────────────┐
│  アプリシェル (React + shadcn/ui)        │
│  ┌─────────────────────────────────────┐│
│  │ Header / Toolbar / StatusBar       ││
│  │ Dialog / Toast / FileDropZone      ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │ Univer (Canvas描画エリア)           ││
│  │ - セル編集                         ││
│  │ - 数式計算                         ││
│  │ - スクロール/選択                   ││
│  │ - シートタブ                       ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │ Core Logic (UI非依存)               ││
│  │ - univer-bridge (結合レイヤー)      ││
│  │ - file-io (読み書き)               ││
│  │ - encoding (文字エンコーディング)     ││
│  │ - pdf (PDF出力・日本語フォント)      ││
│  │ - security (バリデーション)         ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### 結合ルール

1. **Facade APIのみ経由**: Univerの内部APIには一切依存しない
2. **型定義経由**: Univerの`IWorkbookData`型を共有境界とする
3. **単方向データフロー**: import-adapter → Univer → export-adapter
4. **差し替え可能設計**: univer-bridge配下を書き換えることで将来Univer以外に移行可能

---

## 3. ディレクトリ構成

```
edit-excel-csv/
├── src/
│   ├── main.tsx                              # エントリーポイント
│   ├── App.tsx                               # ルートコンポーネント
│   ├── core/                                 # コアロジック（UI非依存）
│   │   ├── univer-bridge/                    # Univerとの結合レイヤー
│   │   │   ├── setup.ts                      # Univerインスタンス初期化
│   │   │   ├── import-adapter.ts             # SheetJS → Univer変換
│   │   │   ├── export-adapter.ts             # Univer → ExcelJS/PapaParse変換
│   │   │   ├── empty-workbook.ts             # 新規ワークブック生成
│   │   │   └── types.ts                      # 共有型定義
│   │   ├── encoding/                          # 文字エンコーディング
│   │   │   ├── detector.ts                    # エンコーディング自動検出
│   │   │   ├── encoder.ts                     # エンコーディング出力
│   │   │   └── types.ts                       # 型定義
│   │   ├── file-io/                          # ファイル入出力
│   │   │   ├── reader.ts                     # ファイル読み込み
│   │   │   ├── writer.ts                     # ファイル書き出し
│   │   │   └── validator.ts                  # バリデーション
│   │   ├── pdf/                              # PDF出力
│   │   │   └── font-loader.ts                # 日本語フォント読み込み・キャッシュ
│   │   └── security/                         # セキュリティ
│   │       └── sanitizer.ts                  # CSVインジェクション対策
│   ├── stores/                               # Zustandストア
│   │   ├── file-store.ts                     # ファイル状態（ファイル名、変更フラグ等）
│   │   └── ui-store.ts                       # UI状態（テーマ等）
│   ├── components/                           # Reactコンポーネント
│   │   ├── layout/                           # AppShell, Header, StatusBar, ErrorBoundary, LoadingOverlay
│   │   ├── editor/                           # SpreadsheetContainer
│   │   ├── dialogs/                          # FileDropZone, SaveDialog
│   │   ├── toolbar/                          # MainToolbar
│   │   └── ui/                               # shadcn/ui共通コンポーネント
│   ├── hooks/                                # カスタムフック
│   │   ├── useUniver.ts                      # Univerライフサイクル管理
│   │   ├── useFileIO.ts                      # ファイル操作
│   │   └── useBeforeUnload.ts                # ページ離脱時の未保存警告
│   ├── lib/                                  # ユーティリティ
│   │   └── utils.ts                          # cn()等の汎用関数
│   ├── encoding-japanese.d.ts                # encoding-japanese型定義
│   ├── vite-env.d.ts                         # Vite環境型定義
│   └── styles/                               # スタイル
│       └── globals.css                       # Tailwindベース + カスタム変数
├── tests/
│   ├── unit/                                 # Vitest ユニットテスト
│   ├── integration/                          # ラウンドトリップテスト
│   ├── e2e/                                  # Playwright E2Eテスト
│   ├── fixtures/                             # テスト用xlsx/csvファイル
│   └── setup.ts                              # テストセットアップ
├── docs/                                     # ドキュメント
│   ├── research/                             # 調査レポート
│   │   ├── market-analysis.md
│   │   ├── technical-analysis.md
│   │   └── product-ux-analysis.md
│   └── architecture.md                       # 本ドキュメント
├── public/                                   # 静的アセット
│   └── fonts/                                # フォントアセット
│       └── NotoSansJP-Regular-subset.ttf     # 日本語フォント（PDF出力用）
├── vite.config.ts                            # Vite設定
├── vitest.config.ts                          # Vitest設定
├── playwright.config.ts                      # Playwright設定
├── tsconfig.json                             # TypeScript設定
├── tsconfig.app.json                         # アプリ用TypeScript設定
├── eslint.config.js                          # ESLint設定（Flat Config）
├── .prettierrc                               # Prettier設定
├── .gitignore
├── CLAUDE.md                                 # Claude Code向けガイド
├── README.md                                 # プロジェクトREADME（日本語）
├── LICENSE                                   # MITライセンス
└── package.json
```

---

## 4. 変換フロー

### インポートフロー (ファイル → Univer)

```
ユーザーファイル (.xlsx / .xls / .csv)
    │
    ▼
File API: file.arrayBuffer()
    │
    ▼
validator.ts: ファイルバリデーション
  - 拡張子チェック (.xlsx, .xls, .csv)
  - サイズチェック (上限50MB)
  - マジックバイトチェック
    │
    ▼
reader.ts: ファイル読み込み
    │  CSV: detectEncoding(buffer) で自動検出 → TextDecoder でデコード → PapaParse
    │  Excel: SheetJS XLSX.read(buffer, { type: 'array' })
    │  → SheetJS WorkBook オブジェクト
    ▼
import-adapter.ts: convertWorkbookToUniverData(workbook)
  - SheetNames → sheets配列
  - セルデータ変換 (cell.v, cell.t, cell.f)
  - セル結合 (merges) 変換
  - 列幅/行高変換
    │  → Univer IWorkbookData
    ▼
setup.ts: univerAPI.createWorkbook(workbookData)
    │
    ▼
Univerで表示・編集
```

### エクスポートフロー (Univer → ファイル)

```
Univer: univerAPI.getActiveWorkbook().getSnapshot()
    │  → Univer IWorkbookData (スナップショット)
    ▼
export-adapter.ts: convertUniverDataToExcelJS(snapshot)
  - sheets → ExcelJS worksheets
  - cellData → ExcelJS cells (値、型、数式)
  - mergeData → ExcelJS merges
  - 列幅/行高変換
    │
    ├── [xlsx出力] → ExcelJS workbook.xlsx.writeBuffer()
    │                  → Blob → URL.createObjectURL → ダウンロード
    │
    ├── [csv出力]  → PapaParse Papa.unparse(data)
    │                  → encodeCsvString(csv, encoding)
    │                  → Blob → URL.createObjectURL → ダウンロード
    │
    └── [pdf出力]  → jsPDF + autoTable + loadJapaneseFont()
                       → doc.output('blob') → URL.createObjectURL → ダウンロード
```

### データ型マッピング

```typescript
// SheetJS → Univer 型マッピング
const TYPE_MAP = {
  'n': CellValueType.NUMBER,    // 数値
  's': CellValueType.STRING,    // 文字列
  'b': CellValueType.BOOLEAN,   // 真偽値
  'e': CellValueType.STRING,    // エラー → 文字列化
  'd': CellValueType.STRING,    // 日付 → 文字列化
};
```

### 数式処理の分担

| 処理段階 | 担当ライブラリ | 処理内容 |
|---|---|---|
| 読み込み | SheetJS | セルの数式文字列(`cell.f`)を抽出・保持。CE版では数式の評価（計算）は不可 |
| 編集・表示 | Univer | 数式エンジンで数式を再計算し、計算結果をセルに表示。セル編集時の数式入力もUniverが処理 |
| 書き出し | ExcelJS | Univerのスナップショットから数式文字列を取得し、ExcelJSのセルに `cell.formula` として設定 |

**注意**: SheetJS CE版は数式の評価（計算結果の算出）に対応していないため、読み込み時の計算結果(`cell.v`)はSheetJSが保持する「最後に保存された値」に依存する。Univerに読み込んだ後はUniverの数式エンジンが再計算を行う。

---

## 5. テスト戦略

### テストピラミッド

```
        ╱╲
       ╱ E2E ╲         Playwright (Chromium/Firefox/WebKit)
      ╱────────╲        - ファイルD&D、セル編集、保存フロー
     ╱ 統合テスト ╲      Vitest
    ╱──────────────╲    - xlsx/csvラウンドトリップ整合性
   ╱  ユニットテスト  ╲   Vitest
  ╱────────────────────╲ - import/export-adapter, validator, sanitizer
```

### テスト方針

| 種別 | ツール | 対象 | 合格基準 |
|---|---|---|---|
| ユニット | Vitest | `src/core/` 全モジュール | 80%カバレッジ |
| 統合 | Vitest | import→edit→export→reimportの一致確認 | ラウンドトリップ整合性 |
| E2E | Playwright | UI操作フロー全体 | Chromium/Firefox/WebKit全通過 |
| パフォーマンス | Lighthouse + 手動 | 起動速度、大規模ファイル処理 | LCP < 2.5秒 |

### テストファイル (fixtures)

- `basic.xlsx` — 基本的なExcelファイル
- `basic.csv` — 基本的なCSV
- `shift_jis_sample.csv` — Shift_JISエンコーディングのCSV
- `euc_jp_sample.csv` — EUC-JPエンコーディングのCSV
- `搬出入届１日用.xlsx` — 日本語ファイル名のExcelファイル

---

## 6. 状態管理設計

### file-store (Zustand)

```typescript
interface FileStore {
  // 状態
  fileName: string | null;        // 現在のファイル名
  fileType: 'xlsx' | 'csv' | 'xls' | null;  // ファイル形式
  encoding: CsvEncoding | null;    // CSVエンコーディング（utf-8/shift_jis/euc-jp）
  isDirty: boolean;               // 未保存変更あり
  isLoading: boolean;             // ファイル読み込み中

  // アクション
  setFile: (name: string, type: FileType) => void;
  setDirty: (dirty: boolean) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}
```

### ui-store (Zustand)

```typescript
interface UIStore {
  // 状態
  theme: 'light' | 'dark';       // テーマ（Phase 2）
  showWelcome: boolean;           // ウェルカム画面表示

  // アクション
  toggleTheme: () => void;
  setShowWelcome: (show: boolean) => void;
}
```

---

## 7. エラーハンドリング設計

### エラー分類

| エラー種別 | 例 | ユーザー表示 | 技術対応 | リカバリー手順 |
|---|---|---|---|---|
| ファイル検証エラー | 非対応形式、サイズ超過 | 具体的なメッセージ + 対処法 | Toast通知 | 対応形式・サイズ上限を表示し、ファイル再選択を促す |
| パースエラー | 破損ファイル | 「ファイルの読み込みに失敗しました」 | Toast + console.error | ①別エンコーディングで再試行(CSVの場合) ②ファイル再選択を促す ③元ファイルの破損可能性を通知 |
| エクスポートエラー | Blob生成失敗 | 「ファイルの保存に失敗しました」 | Toast + リトライ提案 | ①同形式でリトライ ②別形式(xlsx→csv)での保存を提案 ③編集データは保持（画面遷移しない） |
| Univerエラー | 初期化失敗 | Error Boundary表示 | 全画面エラー + リロード提案 | ①ページリロードを提案 ②リロードでも復旧しない場合はブラウザキャッシュクリアを案内 |
| 予期しないエラー | ランタイムエラー | Error Boundary表示 | 全画面エラー + リロード提案 | ①エラー詳細をconsoleに出力 ②ページリロードを提案 |

### Error Boundary

```
┌────────────────────────────────────────┐
│                                        │
│   ⚠ エラーが発生しました              │
│                                        │
│   予期しないエラーが発生しました。     │
│   ページを再読み込みしてください。     │
│                                        │
│   [ページを再読み込み]                 │
│                                        │
│   技術情報: {error.message}            │
│                                        │
└────────────────────────────────────────┘
```

---

## 8. リソース管理

### Blob URL の開放

`URL.createObjectURL()` で生成したBlob URLは、ダウンロード完了後に `URL.revokeObjectURL()` で明示的に開放する。開放しない場合、ブラウザセッション中メモリリークとなる。

```typescript
// エクスポート時のパターン
const url = URL.createObjectURL(blob);
downloadLink.href = url;
downloadLink.click();
// ダウンロード開始後に開放
setTimeout(() => URL.revokeObjectURL(url), 1000);
```

### Univerインスタンスの破棄

ファイル切替時やアプリ終了時に、Univerインスタンスを適切に破棄してメモリを開放する。

- `univerAPI.dispose()` を呼び出してUniver関連のリソースを解放
- React コンポーネントのアンマウント時（`useEffect` のクリーンアップ）で実行
- 新しいファイルを開く前に既存インスタンスをdisposeしてから再作成

### 大容量データの参照解除

- SheetJS読み込み後のArrayBufferは変換完了後に参照をnull化してGC対象にする
- エクスポート時のバッファも同様にBlob生成後に参照を解除

---

## 9. デプロイ設計

### GitHub Pages

- Viteの`base`オプションでリポジトリ名を設定
- GitHub Actionsで`main`ブランチへのpush時に自動デプロイ
- `gh-pages`ブランチに成果物を出力

### Vite設定 (本番向け)

```typescript
// vite.config.ts
export default defineConfig({
  base: '/edit-excel-csv/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          univer: ['@univerjs/presets', '@univerjs/preset-sheets-core'],
          sheetjs: ['xlsx'],
          exceljs: ['exceljs'],
          jspdf: ['jspdf', 'jspdf-autotable'],
          encoding: ['encoding-japanese'],
        },
      },
    },
  },
});
```

---

## 10. ブラウザ互換性

### 最小要件

| ブラウザ | 最小バージョン | 備考 |
|---|---|---|
| Chrome | 90+ | ES2020+、Canvas API、File API |
| Firefox | 90+ | 同上 |
| Safari | 15+ | File API のArrayBuffer対応が15以降で安定 |
| Edge | 90+ | Chromiumベースのため Chrome と同等 |

### 非対応

- Internet Explorer（全バージョン）
- iOS Safari 14以下
- Android WebView（Chrome 90未満）

### 必須ブラウザAPI

- `File API` / `FileReader` / `ArrayBuffer`
- `Blob` / `URL.createObjectURL()`
- `Canvas 2D` (Univer描画)
- `ES2020+` (Optional Chaining, Nullish Coalescing等)
- `CSS Grid` / `CSS Custom Properties`

---

## 結論

本アーキテクチャは「Univerにスプレッドシート描画を委譲し、アプリシェルとファイルI/Oをカスタム実装する」という明確な責務分離を実現する。Facade APIのみを経由する結合設計により、将来のUniver更新や別ライブラリへの移行リスクを最小化。Zustandによる軽量な状態管理と、shadcn/uiによる最小限のUIコンポーネントで、軽量かつ拡張性のあるアプリケーションを構築する。
