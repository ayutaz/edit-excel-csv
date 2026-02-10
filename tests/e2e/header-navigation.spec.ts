import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures')

test.describe('ヘッダーナビゲーション', () => {
  test('「開く」ボタンでファイル選択ダイアログが開く', async ({ page }) => {
    await page.goto('/')

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.locator('header').getByRole('button', { name: '開く' }).click()

    const fileChooser = await fileChooserPromise
    expect(fileChooser.isMultiple()).toBe(false)
  })

  test('エディタから別ファイルに切替できる', async ({ page }) => {
    await page.goto('/')

    // 新規作成でエディタを開く（FileDropZone経由のsetInputFilesと混在問題を回避）
    await page.locator('main').getByRole('button', { name: '新規作成' }).click()
    await expect(page.locator('#univer-container')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('header')).toContainText('Untitled.xlsx')

    // エディタ表示後、App直下のinput[type="file"]でCSVを読み込む
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(path.join(FIXTURES, 'basic.csv'))

    await expect(page.locator('header')).toContainText('basic.csv', { timeout: 10_000 })
  })

  test('ウェルカム画面では「保存」ボタンがdisabledである', async ({ page }) => {
    await page.goto('/')

    await expect(
      page.locator('header').getByRole('button', { name: '保存' })
    ).toBeDisabled()
  })
})
