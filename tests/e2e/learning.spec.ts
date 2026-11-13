import { test, expect } from '@playwright/test'

test('preview prerequisites, answer a checkpoint, resume and restore completion', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Your learning map' })).toBeVisible()
  await expect(page.locator('.preview-panel').getByRole('link', { name: 'Start lesson' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('learning-map.png'), fullPage: true })
  await page.locator('.tree-nodes').getByRole('button', { name: /When regions lose touch/ }).click()
  await expect(page.getByRole('heading', { name: 'When regions lose touch' })).toBeFocused()
  await expect(page.locator('.preview-panel').getByRole('link', { name: 'Start lesson' })).toHaveCount(0)
  await page.locator('.prerequisite-list').getByRole('button', { name: /One system, two regions/ }).click()
  await expect(page.getByRole('heading', { name: 'One system, two regions' })).toBeVisible()
  await page.getByRole('button', { name: /Start here/i }).click()
  await page.locator('.preview-panel').getByRole('link', { name: 'Start lesson' }).click()
  await expect(page.getByRole('heading', { name: 'What the user sees' })).toBeVisible()
  await page.goto('/')
  await expect(page.getByRole('button', { name: /Start here/i })).toContainText('In progress')
  await page.getByRole('link', { name: 'Resume lesson' }).first().click()
  await page.getByLabel('Its latency stays the same').check()
  await page.getByRole('button', { name: 'Check prediction' }).click()
  await expect(page.getByText('Let’s trace it once more.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Complete lesson' })).toBeDisabled()
  await page.getByLabel('Its latency increases').check()
  await page.getByRole('button', { name: 'Check prediction' }).click()
  await expect(page.getByText('You’ve got it.')).toBeVisible()
  await page.getByRole('button', { name: 'Complete lesson' }).click()
  await expect(page.getByText('✓ Lesson completed')).toBeVisible()
  await page.getByRole('link', { name: 'Continue to next lesson' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Your first system' })).toBeVisible()
  await page.reload()
  await page.getByRole('link', { name: 'Back to your learning map' }).click()
  await expect(page.getByRole('button', { name: /Start here/i })).toContainText('Completed')
  await expect(page.locator('.next-card')).toContainText('Your first system')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errors).toEqual([])
})

test('keyboard activates nodes, follows prerequisites and navigates to a lesson', async ({ page }) => {
  await page.goto('/')
  const advanced = page.locator('.tree-nodes').getByRole('button', { name: /When regions lose touch/ })
  await advanced.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'When regions lose touch' })).toBeFocused()
  await page.locator('.prerequisite-list button').focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('heading', { name: 'One system, two regions' })).toBeFocused()
  await page.getByRole('button', { name: 'Back to the learning map' }).click()
  await expect(page.getByRole('heading', { name: 'Your learning map' })).toBeFocused()
  await page.getByRole('button', { name: /Start here/i }).focus()
  await page.keyboard.press('Space')
  const start = page.locator('.preview-panel').getByRole('link', { name: 'Start lesson' })
  await start.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'The journey of a request' })).toBeVisible()
})

test('malformed progress and blocked storage do not break the map', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('systems-atlas:progress:v1', 'broken json'))
  await page.goto('/')
  await expect(page.locator('.next-card')).toContainText('The journey of a request')
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new Error('Storage disabled') }
    Storage.prototype.getItem = () => { throw new Error('Storage disabled') }
  })
  await page.reload()
  await expect(page.getByText('Browser storage is unavailable. Progress lasts for this visit.')).toBeVisible()
  await page.locator('.next-card').getByRole('link', { name: 'Start lesson' }).click()
  await expect(page.getByRole('heading', { name: 'What the user sees' })).toBeVisible()
})

test('direct advanced URLs remain gated and unknown IDs return 404', async ({ page, request }) => {
  await page.goto('/lessons/partitions')
  await expect(page.getByRole('heading', { name: 'A few stepping stones first' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Complete lesson' })).toHaveCount(0)
  expect((await request.get('/api/lessons/does-not-exist')).status()).toBe(404)
  expect((await request.get('/lessons/does-not-exist')).status()).toBe(404)
})


test('recommended path reaches every level and finishes the atlas', async ({ page, request }) => {
  const curriculum = await (await request.get('/api/lessons')).json()
  await page.goto('/')
  await page.locator('.next-card').getByRole('link', { name: 'Start lesson' }).click()
  for (const lesson of curriculum) {
    await expect(page.getByRole('heading', { level: 1, name: lesson.title, exact: true })).toBeVisible()
    const action = lesson.lab === 'request' ? 'Load collection' : lesson.lab === 'shortener' ? 'Shorten URL' : lesson.lab === 'notifications' ? 'Send notification' : 'Pay $49.00'
    const failure = lesson.lab === 'request' || lesson.lab === 'shortener' ? 'database-down' : lesson.lab === 'notifications' ? 'worker-down' : lesson.lab === 'payment' ? 'timeout' : lesson.id === 'replication' ? 'leader-down' : 'partition'
    for (const scenario of ['normal', failure]) {
      await page.getByLabel('Scenario', { exact: true }).selectOption(scenario)
      await page.getByRole('button', { name: action }).click()
      await expect(page.locator('.simulation-lab')).toHaveAttribute('aria-busy', 'false')
      await expect(page.locator('.event-list')).toBeVisible()
      await page.locator('.event-list button').last().click()
    }
    await expect(page.getByText('✓ Normal flow explored')).toBeVisible()
    await expect(page.getByText('✓ Failure scenario explored')).toBeVisible()
    await page.getByRole('radio').nth(lesson.answer).check()
    await page.getByRole('button', { name: 'Check prediction' }).click()
    await page.getByRole('button', { name: 'Complete lesson' }).click()
    if (lesson.id !== curriculum.at(-1).id) await page.getByRole('link', { name: 'Continue to next lesson' }).click()
  }
  await page.getByRole('link', { name: 'Return to your learning map' }).click()
  await expect(page.getByRole('heading', { name: 'You’ve explored the whole atlas.' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'You’ve explored the whole atlas.' })).toBeVisible()
  await expect(page.locator('.progress-card')).toContainText('8 / 8')
})
