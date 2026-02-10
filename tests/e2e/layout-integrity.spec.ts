import { test, expect } from '@playwright/test'

test.describe('レイアウト整合性', () => {
  test('AppShellの3層構造（header/main/footer）が正しい高さを持つ', async ({ page }) => {
    await page.goto('/')

    // header: h-12 (48px)
    const header = page.locator('[data-testid="app-header"]')
    await expect(header).toBeVisible()
    const headerBox = await header.boundingBox()
    expect(headerBox!.height).toBeGreaterThanOrEqual(40)

    // main: flex-1 (残りスペース)
    const main = page.locator('main')
    await expect(main).toBeVisible()
    const mainBox = await main.boundingBox()
    expect(mainBox!.height).toBeGreaterThan(100)

    // footer: h-7 (28px) — StatusBar
    const footer = page.locator('[data-testid="app-footer"]')
    await expect(footer).toBeVisible()
    const footerBox = await footer.boundingBox()
    expect(footerBox!.height).toBeGreaterThanOrEqual(20)

    // 3つの高さ合計がviewportに近い
    const viewportHeight = page.viewportSize()!.height
    const totalHeight = headerBox!.height + mainBox!.height + footerBox!.height
    expect(totalHeight).toBeGreaterThan(viewportHeight * 0.95)
  })

  test('ウェルカム画面でmainエリアにコンテンツが存在する', async ({ page }) => {
    await page.goto('/')
    const main = page.locator('main')
    const text = await main.innerText()
    expect(text.trim().length).toBeGreaterThan(0)
  })

  test('コンソールにUniverの致命的エラーが出ない', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    await page.goto('/')
    await page.waitForTimeout(3000)

    const univerInitErrors = consoleErrors.filter(
      (e) => e.includes('Univer初期化エラー'),
    )
    expect(univerInitErrors).toHaveLength(0)
  })
})
