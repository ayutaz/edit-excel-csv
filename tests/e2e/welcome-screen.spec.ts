import { test, expect } from '@playwright/test'

test.describe('ウェルカム画面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('ドロップゾーンが表示される', async ({ page }) => {
    await expect(page.getByText('ファイルをドラッグ＆ドロップ')).toBeVisible()
  })

  test('対応形式テキストが表示される', async ({ page }) => {
    await expect(page.getByText('.xlsx, .xls, .csv に対応')).toBeVisible()
  })

  test('「ファイルを選択」ボタンが表示される', async ({ page }) => {
    await expect(
      page.locator('main').getByRole('button', { name: 'ファイルを選択' })
    ).toBeVisible()
  })

  test('「新規作成」ボタンが表示される', async ({ page }) => {
    await expect(
      page.locator('main').getByRole('button', { name: '新規作成' })
    ).toBeVisible()
  })

  test('アプリタイトルが表示される', async ({ page }) => {
    await expect(page.getByText('Excel/CSV エディタ')).toBeVisible()
  })

  test('プライバシーメッセージが表示される', async ({ page }) => {
    await expect(
      page.getByText('データはブラウザ内で処理されます。サーバーには送信されません。')
    ).toBeVisible()
  })

  test('ドロップゾーンがmainエリアの範囲内に配置される', async ({ page }) => {
    const main = page.locator('main')
    const dropZone = page.getByText('ファイルをドラッグ＆ドロップ')

    await expect(main).toBeVisible()
    await expect(dropZone).toBeVisible()

    const mainBox = await main.boundingBox()
    const dropZoneBox = await dropZone.boundingBox()

    // DropZoneがmainの範囲内にある
    expect(dropZoneBox!.y).toBeGreaterThanOrEqual(mainBox!.y)
    expect(dropZoneBox!.y + dropZoneBox!.height).toBeLessThanOrEqual(
      mainBox!.y + mainBox!.height,
    )
  })
})
