import { expect, test } from '@playwright/test'

test('GET / returns the Vue app shell', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#app')).toBeVisible()
})

test('GET /inventory/nonexistent returns 200 via SPA fallback', async ({ page }) => {
  const response = await page.goto('/inventory/nonexistent')
  expect(response?.status()).toBe(200)
  await expect(page.locator('#app')).toBeAttached()
})

test('GET /api/v1/nonexistent returns 404 JSON', async ({ request }) => {
  const response = await request.get('/api/v1/nonexistent')
  expect(response.status()).toBe(404)
  const body = await response.json()
  expect(body).toEqual({ code: 'NOT_FOUND' })
})

test('GET /api/v1/health returns 200 ok', async ({ request }) => {
  const response = await request.get('/api/v1/health')
  expect(response.status()).toBe(200)
  const body = await response.json()
  expect(body).toEqual({ status: 'ok' })
})
