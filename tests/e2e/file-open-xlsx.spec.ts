import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures')

test.describe('XLSX読み込み', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('basic.xlsxを読み込むとエディタに遷移する', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(path.join(FIXTURES, 'basic.xlsx'))

    await expect(
      page.locator('[data-sonner-toast]').filter({ hasText: 'ファイルを読み込みました' })
    ).toBeVisible({ timeout: 10_000 })

    await expect(page.locator('#univer-container')).toBeVisible()
  })

  test('ヘッダーにファイル名が表示される', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(path.join(FIXTURES, 'basic.xlsx'))

    await expect(page.locator('#univer-container')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('header')).toContainText('basic.xlsx')
  })

  test('StatusBarにxlsxバッジが表示される', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(path.join(FIXTURES, 'basic.xlsx'))

    await expect(page.locator('#univer-container')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('footer')).toContainText('xlsx')
  })
})
