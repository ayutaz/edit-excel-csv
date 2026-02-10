import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures')
const TEST_FILE = path.join(FIXTURES, '搬出入届１日用.xlsx')

test.describe('実ファイルテスト: 搬出入届１日用.xlsx', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('ファイルを読み込めること', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(TEST_FILE)

    // 読み込み成功トースト
    await expect(
      page.locator('[data-sonner-toast]').filter({ hasText: 'ファイルを読み込みました' })
    ).toBeVisible({ timeout: 15_000 })

    // エディタに遷移
    await expect(page.locator('#univer-container')).toBeVisible()
  })

  test('ヘッダーにファイル名が表示される', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(TEST_FILE)

    await expect(page.locator('#univer-container')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('header')).toContainText('搬出入届１日用.xlsx')
  })

  test('StatusBarにxlsxバッジが表示される', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(TEST_FILE)

    await expect(page.locator('#univer-container')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('footer')).toContainText('xlsx')
  })

  test('保存ダイアログにファイル名が引き継がれる', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(TEST_FILE)

    await expect(page.locator('#univer-container')).toBeVisible({ timeout: 15_000 })

    // 保存ダイアログを開く
    await page.locator('header').getByRole('button', { name: '保存' }).click()
    await expect(page.getByText('ファイルを保存')).toBeVisible()

    // ファイル名（拡張子なし）がinputに入っている
    const input = page.locator('#save-filename')
    await expect(input).toHaveValue('搬出入届１日用')

    // プレビュー
    await expect(page.getByText('保存先: 搬出入届１日用.xlsx')).toBeVisible()
  })

  test('XLSX形式でダウンロードできる', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(TEST_FILE)

    await expect(page.locator('#univer-container')).toBeVisible({ timeout: 15_000 })

    // 保存ダイアログ → ダウンロード
    await page.locator('header').getByRole('button', { name: '保存' }).click()

    const dialog = page.locator('[role="dialog"]')
    const downloadPromise = page.waitForEvent('download')
    await dialog.getByRole('button', { name: '保存' }).click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('搬出入届１日用.xlsx')
  })

  test('CSV形式でダウンロードできる', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(TEST_FILE)

    await expect(page.locator('#univer-container')).toBeVisible({ timeout: 15_000 })

    // 保存ダイアログ → CSV切替 → ダウンロード
    await page.locator('header').getByRole('button', { name: '保存' }).click()

    const dialog = page.locator('[role="dialog"]')
    await dialog.getByRole('button', { name: 'CSV' }).click()

    const downloadPromise = page.waitForEvent('download')
    await dialog.getByRole('button', { name: '保存' }).click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('搬出入届１日用.csv')
  })

  test('エラーなくページがクラッシュしない', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => {
      // UniverのLocaleServiceエラーは既知のため除外
      if (!err.message.includes('LocaleService')) {
        errors.push(err.message)
      }
    })

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(TEST_FILE)

    await expect(page.locator('#univer-container')).toBeVisible({ timeout: 15_000 })

    // Error Boundaryが表示されていない
    await expect(
      page.getByText('予期しないエラーが発生しました')
    ).not.toBeVisible()

    // 致命的なJSエラーがない
    expect(errors).toEqual([])
  })
})
