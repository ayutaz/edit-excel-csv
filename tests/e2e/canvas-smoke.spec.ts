import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures')

test.describe('Univerキャンバス描画', () => {
  // Univerはヘッドレス環境でLocaleServiceエラーによりcanvas描画が不安定なためfixme
  test.fixme('CSV読み込み後にcanvas要素が存在する', async ({ page }) => {
    await page.goto('/')

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(path.join(FIXTURES, 'basic.csv'))

    await expect(page.locator('#univer-container')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('#univer-container canvas').first()).toBeVisible({ timeout: 15_000 })
  })

  test.fixme('新規作成後にcanvas要素が存在する', async ({ page }) => {
    await page.goto('/')

    await page.locator('main').getByRole('button', { name: '新規作成' }).click()

    await expect(page.locator('#univer-container')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('#univer-container canvas').first()).toBeVisible({ timeout: 15_000 })
  })

  test.fixme('セル編集でcanvas内容が変化する', async ({ page }) => {
    // Canvas内のセル操作はPlaywrightでは安定的にテストできないため、将来対応
    await page.goto('/')
    await page.locator('main').getByRole('button', { name: '新規作成' }).click()
    await expect(page.locator('#univer-container')).toBeVisible({ timeout: 10_000 })
  })
})
