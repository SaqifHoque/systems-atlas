import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

async function scan(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations.map(item => ({ id: item.id, impact: item.impact, targets: item.nodes.map(node => node.target), help: item.help }))).toEqual([])
}

test('map and advanced lesson preview pass automated accessibility checks', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.preview-panel').getByRole('link', { name: 'Start lesson' })).toBeVisible()
  await scan(page)
  await page.locator('.tree-nodes').getByRole('button', { name: /When regions lose touch/ }).click()
  await expect(page.getByRole('heading', { name: 'When regions lose touch' })).toBeFocused()
  await scan(page)
})

test('product, architecture and checkpoint states pass automated accessibility checks', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/lessons/request')
  await page.getByRole('button', { name: 'Load collection' }).click()
  await expect(page.locator('.simulation-lab')).toHaveAttribute('aria-busy', 'false')
  await page.locator('.event-list button').last().click()
  await page.getByRole('radio', { name: 'Its latency increases' }).check()
  await page.getByRole('button', { name: 'Check prediction' }).click()
  await expect(page.getByText('You’ve got it.')).toBeVisible()
  await scan(page)
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('tab', { name: 'Architecture', exact: true }).click()
    await scan(page)
  }
})
