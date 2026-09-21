import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => route.fulfill({
    status: 401, contentType: 'text/plain', body: 'Invalid Email Or Password',
  }));
});

test('public entry and protected deep link survive a browser reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Create account', exact: true })).toBeVisible();
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
});

test('real login form displays HTTP failure without losing email', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('smoke@example.test');
  await page.getByLabel('Password', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Invalid Email Or Password');
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('smoke@example.test');
  await expect(page).toHaveURL(/\/login$/);
});
