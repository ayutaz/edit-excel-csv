import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures')

test.describe('保存ダイアログ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // 新規作成でエディタを開く
    await page.locator('main').getByRole('button', { name: '新規作成' }).click()
    await expect(page.locator('#univer-container')).toBeVisible({ timeout: 10_000 })
  })

  test('「保存」ボタンでダイアログが開く', async ({ page }) => {
    await page.locator('header').getByRole('button', { name: '保存' }).click()

    await expect(page.getByText('ファイルを保存')).toBeVisible()
  })

  test('デフォルトファイル名がUntitledである', async ({ page }) => {
    await page.locator('header').getByRole('button', { name: '保存' }).click()

    const input = page.locator('#save-filename')
    await expect(input).toHaveValue('Untitled')
  })

  test('プレビューにUntitled.xlsxが表示される', async ({ page }) => {
    await page.locator('header').getByRole('button', { name: '保存' }).click()

    await expect(page.getByText('保存先: Untitled.xlsx')).toBeVisible()
  })

  test('CSV切替でプレビューがUntitled.csvになる', async ({ page }) => {
    await page.locator('header').getByRole('button', { name: '保存' }).click()

    const dialog = page.locator('[role="dialog"]')
    await dialog.getByRole('button', { name: 'CSV' }).click()

    await expect(page.getByText('保存先: Untitled.csv')).toBeVisible()
  })

  test('ファイル名変更でプレビューが更新される', async ({ page }) => {
    await page.locator('header').getByRole('button', { name: '保存' }).click()

    const input = page.locator('#save-filename')
    await input.clear()
    await input.fill('my-report')

    await expect(page.getByText('保存先: my-report.xlsx')).toBeVisible()
  })

  test('「キャンセル」でダイアログが閉じる', async ({ page }) => {
    await page.locator('header').getByRole('button', { name: '保存' }).click()

    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible()

    await dialog.getByRole('button', { name: 'キャンセル' }).click()
    await expect(dialog).not.toBeVisible()
  })

  test('空ファイル名で保存ボタンがdisabledになる', async ({ page }) => {
    await page.locator('header').getByRole('button', { name: '保存' }).click()

    const input = page.locator('#save-filename')
    await input.clear()

    const dialog = page.locator('[role="dialog"]')
    await expect(dialog.getByRole('button', { name: '保存' })).toBeDisabled()
  })

  test('CSV読み込み後はデフォルトがCSV形式になる', async ({ page }) => {
    // 一度トップに戻ってCSVを読み込む
    await page.goto('/')
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(path.join(FIXTURES, 'basic.csv'))
    await expect(page.locator('#univer-container')).toBeVisible({ timeout: 10_000 })

    await page.locator('header').getByRole('button', { name: '保存' }).click()

    await expect(page.getByText('保存先: basic.csv')).toBeVisible()
  })
})
