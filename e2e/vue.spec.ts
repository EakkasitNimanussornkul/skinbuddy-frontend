import { test, expect } from '@playwright/test'

// Smoke tests: prove the app boots, routes resolve, and navigation works.
//
// These deliberately assert only on static page chrome, never on catalog data.
// The product catalog comes from the backend and changes with the database, so
// asserting on it here would make the suite fail for reasons unrelated to the
// frontend - and these tests are meant to run with the frontend alone.

test('home page mounts and renders the dashboard', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Your Skin Dashboard' })).toBeVisible()
})

test('explore route resolves directly', async ({ page }) => {
  await page.goto('/explore')
  await expect(page.getByRole('heading', { name: 'Explore Skincare Catalog' })).toBeVisible()
})

// BottomNav is `lg:hidden`, so it only exists below 1024px. This is the primary
// navigation for the product (a LINE LIFF app), so it is worth covering - but it
// has to be exercised at a phone viewport, not the default desktop one.
test.describe('mobile viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('bottom nav navigates from home to explore', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'EXPLORE' }).click()

    await expect(page).toHaveURL(/\/explore$/)
    await expect(page.getByRole('heading', { name: 'Explore Skincare Catalog' })).toBeVisible()
  })
})
