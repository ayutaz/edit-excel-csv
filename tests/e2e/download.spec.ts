import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures')

test.describe('ダウンロード', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // 新規作成でエディタを開く
    await page.locator('main').getByRole('button', { name: '新規作成' }).click()
    await expect(page.locator('#univer-container')).toBeVisible({ timeout: 10_000 })
  })

  test('XLSX形式でダウンロードできる', async ({ page }) => {
    await page.locator('header').getByRole('button', { name: '保存' }).click()

    const dialog = page.locator('[role="dialog"]')
    const downloadPromise = page.waitForEvent('download')
    await dialog.getByRole('button', { name: '保存' }).click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('Untitled.xlsx')
  })

  test('CSV形式でダウンロードできる', async ({ page }) => {
    await page.locator('header').getByRole('button', { name: '保存' }).click()

    const dialog = page.locator('[role="dialog"]')
    await dialog.getByRole('button', { name: 'CSV' }).click()

    const downloadPromise = page.waitForEvent('download')
    await dialog.getByRole('button', { name: '保存' }).click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('Untitled.csv')
  })

  test('カスタムファイル名でダウンロードできる', async ({ page }) => {
    await page.locator('header').getByRole('button', { name: '保存' }).click()

    const input = page.locator('#save-filename')
    await input.clear()
    await input.fill('my-report')

    const dialog = page.locator('[role="dialog"]')
    const downloadPromise = page.waitForEvent('download')
    await dialog.getByRole('button', { name: '保存' }).click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('my-report.xlsx')
  })

  test('CSV読み込み後にCSVとして保存できる', async ({ page }) => {
    // CSVを読み込む
    await page.goto('/')
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(path.join(FIXTURES, 'basic.csv'))
    await expect(page.locator('#univer-container')).toBeVisible({ timeout: 10_000 })

    await page.locator('header').getByRole('button', { name: '保存' }).click()

    const dialog = page.locator('[role="dialog"]')
    const downloadPromise = page.waitForEvent('download')
    await dialog.getByRole('button', { name: '保存' }).click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('basic.csv')
  })
})
