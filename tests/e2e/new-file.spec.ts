import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures')

test.describe('新規作成', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('DropZone内「新規作成」でエディタが表示される', async ({ page }) => {
    await page.locator('main').getByRole('button', { name: '新規作成' }).click()

    await expect(page.locator('#univer-container')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('[data-testid="app-header"]')).toContainText('Untitled.xlsx')
  })

  test('Header内「新規作成」でエディタが表示される', async ({ page }) => {
    await page.locator('[data-testid="app-header"]').getByRole('button', { name: '新規作成' }).click()

    await expect(page.locator('#univer-container')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('[data-testid="app-header"]')).toContainText('Untitled.xlsx')
  })

  test('エディタ画面から「新規作成」でファイル名がリセットされる', async ({ page }) => {
    // まずCSVを読み込む
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(path.join(FIXTURES, 'basic.csv'))
    await expect(page.locator('#univer-container')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('[data-testid="app-header"]')).toContainText('basic.csv')

    // 新規作成をクリック
    await page.locator('[data-testid="app-header"]').getByRole('button', { name: '新規作成' }).click()

    await expect(page.locator('[data-testid="app-header"]')).toContainText('Untitled.xlsx')
  })
})
