import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = path.resolve(__dirname, '../fixtures')
const BASIC_XLSX = path.join(FIXTURES_DIR, 'basic.xlsx')

export default async function globalSetup() {
  if (fs.existsSync(BASIC_XLSX)) return

  // ExcelJSで basic.xlsx フィクスチャを動的生成
  const ExcelJSModule = await import('exceljs')
  const ExcelJS = ExcelJSModule.default ?? ExcelJSModule
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Sheet1')

  sheet.addRow(['名前', '年齢', '部署'])
  sheet.addRow(['田中太郎', 30, '開発部'])
  sheet.addRow(['山田花子', 25, '営業部'])

  fs.mkdirSync(FIXTURES_DIR, { recursive: true })
  await workbook.xlsx.writeFile(BASIC_XLSX)
}
