import { test, expect } from '@playwright/test'

test.describe('エラーハンドリング', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('非対応ファイル形式でエラートーストが表示される', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first()

    // .txtファイルをバッファとして作成し送信
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Hello, this is a text file.'),
    })

    await expect(
      page.locator('[data-sonner-toast]').filter({ hasText: '対応していないファイル形式です' })
    ).toBeVisible({ timeout: 10_000 })
  })

  test('空CSVでクラッシュしない', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first()

    await fileInput.setInputFiles({
      name: 'empty.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(''),
    })

    // ページがクラッシュしていないことを確認（エラーバウンダリが表示されていない）
    await expect(
      page.getByText('予期しないエラーが発生しました')
    ).not.toBeVisible({ timeout: 5_000 })

    // ウェルカム画面またはエディタのいずれかが表示されている
    const welcomeOrEditor = page
      .getByText('ファイルをドラッグ＆ドロップ')
      .or(page.locator('#univer-container'))
    await expect(welcomeOrEditor.first()).toBeVisible()
  })
})
